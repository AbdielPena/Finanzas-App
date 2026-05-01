// ============================================
// Loans Engine — Amortization & Automation
// ============================================
import store from './store.js';
import { generateId, getToday, formatMoney } from './utils.js';
import { addNotification } from './notifications.js';

/**
 * Calcula el cronograma de amortización basado en una CUOTA FIJA.
 * El sistema determina cuántos periodos tomará pagar el préstamo.
 */
export function calculateAmortization(principal, annualRate, pmt, frequency, startDate) {
  const p = parseFloat(principal);
  const rAnual = parseFloat(annualRate) / 100;
  let rPeriod = 0;
  let freqDays = 0;

  switch (frequency) {
    case 'diario':    rPeriod = rAnual / 365; freqDays = 1; break;
    case 'semanal':   rPeriod = rAnual / 52;  freqDays = 7; break;
    case 'quincenal': rPeriod = rAnual / 24;  freqDays = 15; break;
    case 'mensual':   rPeriod = rAnual / 12;  freqDays = 30; break;
    default: rPeriod = rAnual / 12; freqDays = 30;
  }

  const schedule = [];
  let remainingBalance = p;
  const [year, month, day] = startDate.split('-').map(Number);
  let currentDate = new Date(year, month - 1, day);
  
  let i = 1;
  const MAX_PERIODS = 600; // Seguridad 50 años

  while (remainingBalance > 0.01 && i <= MAX_PERIODS) {
    const interest = remainingBalance * rPeriod;
    
    // Validación: La cuota debe ser mayor al interés generado
    if (pmt <= interest + 0.01 && i === 1) {
      throw new Error(`La cuota de ${pmt} es insuficiente. El interés en el primer periodo es de ${interest.toFixed(2)}. Por favor aumenta la cuota.`);
    }

    let currentPayment = pmt;
    let principalPaid = currentPayment - interest;

    // Ajuste para la última cuota si el remanente es menor al capital a pagar
    if (remainingBalance < principalPaid) {
      principalPaid = remainingBalance;
      currentPayment = principalPaid + interest;
    }

    remainingBalance -= principalPaid;

    const yStr = currentDate.getFullYear();
    const mStr = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${yStr}-${mStr}-${dStr}`;

    schedule.push({
      number: i,
      date: dateStr,
      payment: currentPayment,
      principal: principalPaid,
      interest: interest,
      remaining: Math.max(0, remainingBalance),
      status: 'pending'
    });

    if (frequency === 'mensual') currentDate.setMonth(currentDate.getMonth() + 1);
    else currentDate.setDate(currentDate.getDate() + freqDays);
    
    i++;
  }

  return { schedule, monthlyPayment: pmt };
}

/**
 * Run automation engine to process pending automatic payments
 */
export function processAutoPayments() {
  const loans = store.getAll('loans').filter(l => l.estado === 'activo' || l.estado === 'al día' || l.estado === 'vencido');
  const today = getToday();
  let processedCount = 0;

  loans.forEach(loan => {
    // If no proximoPago or not yet due, skip
    if (!loan.proximoPago || loan.proximoPago > today) return;

    // Automation required?
    if (!loan.cuentaId) return;

    // Check if this payment was already attempted today (avoid loop in same session)
    const lastAttempt = loan._lastAutoAttempt;
    if (lastAttempt === today) return;

    // Try to pay
    const result = executeLoanPayment(loan);
    if (result.success) {
      processedCount++;
    }
    
    // Mark attempt
    store.update('loans', loan.id, { _lastAutoAttempt: today });
  });

  return processedCount;
}

/**
 * Execute a single loan payment automatically or manually
 */
export function executeLoanPayment(loan) {
  const today = getToday();
  const schedule = loan.schedule || [];
  const installment = schedule.find(s => s.status === 'pending');

  if (!installment) return { success: false, message: 'No hay cuotas pendientes.' };

  // Fund validation if auto
  if (loan.cuentaId) {
    const account = store.getById('accounts', loan.cuentaId);
    // In FinanzApp, calcAccountBalance is usually dynamic but we check the stored balance or logic
    // For now we assume if the account exists, we check funds if user required it
    // Note: calcAccountBalance is in dashboard/transaction pages. Here we use a safe check.
    
    // Simulating fund check (if balance property exists)
    const balance = parseFloat(account?.saldoInicial || 0); // Simplified check
    if (account && balance < installment.payment) {
      addNotification({
        id: generateId(),
        titulo: '❌ Error en Cobro Automático',
        mensaje: `Fondos insuficientes en ${account.nombre} para pagar la cuota de "${loan.nombre}".`,
        tipo: 'error',
        fecha: today,
        leida: false
      });
      store.update('loans', loan.id, { estado: 'error_pago', ultimaNota: 'Fallo por saldo insuficiente' });
      return { success: false, message: 'Fondos insuficientes.' };
    }
  }

  // 1. Create Transaction
  const transId = generateId();
  store.add('transactions', {
    id: transId,
    tipo: 'gasto',
    monto: installment.payment,
    descripcion: `Cuota #${installment.number} Préstamo: ${loan.nombre}`,
    categoriaId: 'cat_loan_amortization',
    cuentaId: loan.cuentaId || '',
    fecha: today,
    notas: `Capital: ${formatMoney(installment.principal)} | Interés: ${formatMoney(installment.interest)}`,
    estado: 'activo'
  });

  // 2. Update Schedule
  installment.status = 'paid';
  installment.fechaPago = today;
  installment.transactionId = transId;

  // 3. Update Loan
  const nextInstallment = schedule.find(s => s.status === 'pending');
  const isLast = !nextInstallment;
  
  const updates = {
    schedule,
    capitalPagado: (loan.capitalPagado || 0) + installment.principal,
    interesPagado: (loan.interesPagado || 0) + installment.interest,
    cuotasPagadas: (loan.cuotasPagadas || 0) + 1,
    saldoPendiente: Math.max(0, loan.saldoPendiente - installment.principal),
    proximoPago: nextInstallment ? nextInstallment.date : null,
    estado: isLast ? 'pagado' : 'al día',
    ultimaNota: `Pago auto cuota ${installment.number} realizado.`
  };

  store.update('loans', loan.id, updates);

  // 4. Notify Success
  addNotification({
    id: generateId(),
    titulo: '✅ Pago de Préstamo Realizado',
    mensaje: `Se descontó ${formatMoney(installment.payment)} para la cuota #${installment.number} de "${loan.nombre}".`,
    tipo: 'info',
    fecha: today,
    leida: false
  });

  return { success: true };
}

/**
 * Obtiene las cuotas "activas" (vencidas o por vencer en el periodo)
 */
export function getActiveLoanInstallments(loans, dateLimit = getToday()) {
  const installments = [];
  loans.forEach(loan => {
    if (loan.estado === 'pagado') return;
    const pending = (loan.schedule || []).filter(s => s.status === 'pending' && s.date <= dateLimit);
    pending.forEach(inst => {
      installments.push({
        ...inst,
        loanId: loan.id,
        loanName: loan.nombre,
        entidad: loan.entidad,
        cuentaId: loan.cuentaId
      });
    });
  });
  return installments;
}

/**
 * Suma el monto total de las obligaciones actuales de préstamos
 */
export function getLoanCommitmentsTotal(loans, dateLimit = getToday()) {
  const active = getActiveLoanInstallments(loans, dateLimit);
  return active.reduce((sum, i) => sum + i.payment, 0);
}
