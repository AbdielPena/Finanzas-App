// ============================================
// Pending Center — Vista unificada de pendientes
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { formatMoney, formatDate, isOverdue, getDaysUntil } from '../utils.js';
import { showToast } from '../components.js';
import { getActiveLoanInstallments } from '../loans_engine.js';

export default function renderPendingCenter() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const render = () => {
    const holdTxs      = store.filter('transactions', t => t.estado === 'hold');
    const pendingCharges = store.filter('subscription_charges', c => !c.confirmado);
    const pendingReceivables = store.filter('receivables', r => r.estado !== 'pagada' && r.estado !== 'cobrada');
    const pendingPayables  = store.filter('payables', p => p.estado !== 'pagada');
    const pendingDebts     = store.filter('debts', d => d.estado !== 'pagada' && !d.paid);
    const loans            = store.getAll('loans');
    const activeLoanInsts  = getActiveLoanInstallments(loans);
    const accounts         = store.getAll('accounts');
    const subs             = store.getAll('subscriptions');

    const totalHoldAmount = holdTxs.reduce((s, t) => s + (parseFloat(t.monto)||0), 0);
    const totalCobrar = pendingReceivables.reduce((s, r) => s + (parseFloat(r.saldoPendiente)||0), 0);
    const totalPagar  = pendingPayables.reduce((s, p) => s + ((parseFloat(p.monto)||0)-(parseFloat(p.montoPagado)||0)), 0)
                      + pendingDebts.reduce((s, d) => s + (parseFloat(d.saldoPendiente)||parseFloat(d.amount)||0), 0)
                      + activeLoanInsts.reduce((s, i) => s + i.payment, 0);

    const totalItems = holdTxs.length + pendingCharges.length + pendingReceivables.length + pendingPayables.length + pendingDebts.length + activeLoanInsts.length;

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>⏳ Centro de Pendientes</h1>
          <p>${totalItems} item${totalItems !== 1 ? 's' : ''} requieren tu atención</p>
        </div>
      </div>

      <!-- Resumen rápido -->
      <div class="grid grid-3" style="gap:16px;margin-bottom:24px">
        <div class="stat-card" style="border-left:3px solid #f59e0b">
          <div class="stat-content">
            <div class="stat-label">Transacciones en HOLD</div>
            <div class="stat-value" style="color:#f59e0b;font-size:1.6rem">${holdTxs.length}</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">~${formatMoney(totalHoldAmount)} sin asignar</div>
          </div>
        </div>
        <div class="stat-card" style="border-left:3px solid var(--color-income)">
          <div class="stat-content">
            <div class="stat-label">Por Cobrar</div>
            <div class="stat-value" style="color:var(--color-income);font-size:1.6rem">${pendingReceivables.length}</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">${formatMoney(totalCobrar)} pendientes</div>
          </div>
        </div>
        <div class="stat-card" style="border-left:3px solid var(--color-expense)">
          <div class="stat-content">
            <div class="stat-label">Por Pagar</div>
            <div class="stat-value" style="color:var(--color-expense);font-size:1.6rem">${pendingPayables.length + pendingDebts.length}</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">${formatMoney(totalPagar)} pendientes</div>
          </div>
        </div>
      </div>

      <!-- Sección HOLD -->
      ${holdTxs.length > 0 ? `
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3 style="color:#f59e0b">${icon('clock',18)} Transacciones en HOLD — Sin cuenta asignada</h3>
          <span class="badge" style="background:#f59e0b22;color:#f59e0b">${holdTxs.length}</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Descripción</th><th>Tipo</th><th>Origen</th><th>Fecha</th><th class="right">Monto</th><th>Asignar Cuenta</th></tr></thead>
            <tbody id="hold-tbody">
              ${holdTxs.map(tx => `
                <tr style="background:rgba(245,158,11,0.04)">
                  <td><div class="cell-primary">${tx.descripcion} ${tx.source==='ai-agent'?'<span style="font-size:0.65rem;color:var(--text-muted)">🤖 IA</span>':''}</div></td>
                  <td><span class="badge badge-${tx.tipo==='ingreso'?'success':'danger'}">${tx.tipo}</span></td>
                  <td style="font-size:0.8rem;color:var(--text-muted)">${tx.source==='ai-agent'?'FinanzBot':'Manual'}</td>
                  <td style="font-size:0.8rem;color:var(--text-secondary)">${formatDate(tx.fecha)}</td>
                  <td class="right" style="color:#f59e0b;font-weight:700">~${formatMoney(tx.monto)}</td>
                  <td>
                    <select class="form-select assign-acc" data-tx-id="${tx.id}" style="font-size:0.8rem;max-width:200px">
                      <option value="">— Seleccionar —</option>
                      ${accounts.map(a => `<option value="acc:${a.id}">${a.nombre}</option>`).join('')}
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      <!-- Sección Suscripciones pendientes de confirmar -->
      ${pendingCharges.length > 0 ? `
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3 style="color:var(--color-warning)">${icon('subscription',18)} Cobros de Suscripción Sin Confirmar</h3>
          <span class="badge badge-warning">${pendingCharges.length}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
          ${pendingCharges.map(charge => {
            const sub = subs.find(s => s.id === charge.subscriptionId);
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg-input);border-radius:8px">
                <div style="flex:1">
                  <div style="font-weight:600">${sub?.nombre || charge.subscriptionId}</div>
                  <div style="font-size:0.78rem;color:var(--text-secondary)">${formatDate(charge.fechaCobro)} • ${formatMoney(charge.monto||sub?.monto||0)}</div>
                </div>
                <button class="btn btn-success btn-sm confirm-sub" data-charge-id="${charge.id}" data-amount="${charge.monto||sub?.monto||0}" data-sub-name="${sub?.nombre||''}">
                  ${icon('check',14)} Confirmar
                </button>
              </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- Sección Por Cobrar -->
      ${pendingReceivables.length > 0 ? `
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3 style="color:var(--color-income)">${icon('arrowDown',18)} Cuentas por Cobrar Pendientes</h3>
          <button class="btn btn-ghost btn-sm" onclick="location.hash='#/receivables'">Ver módulo →</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
          ${pendingReceivables.slice(0,5).map(r => {
            const ov = isOverdue(r.fechaVencimiento);
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg-input);border-radius:8px;${ov?'border-left:3px solid var(--color-expense)':''}">
                <div style="flex:1">
                  <div style="font-weight:600">${r.entidad || r.descripcion}</div>
                  <div style="font-size:0.78rem;color:${ov?'var(--color-expense)':'var(--text-secondary)'}">
                    ${ov ? '⚠️ Vencido — ' : ''}${r.fechaVencimiento ? formatDate(r.fechaVencimiento) : 'Sin fecha'}
                  </div>
                </div>
                <div style="font-weight:700;color:var(--color-income)">${formatMoney(r.saldoPendiente||r.monto||0)}</div>
              </div>`;
          }).join('')}
          ${pendingReceivables.length > 5 ? `<div style="text-align:center;font-size:0.8rem;color:var(--text-muted);padding:8px">+${pendingReceivables.length-5} más en el módulo</div>` : ''}
        </div>
      </div>` : ''}

      <!-- Sección Por Pagar (Deudas + Payables) -->
      ${(pendingPayables.length + pendingDebts.length) > 0 ? `
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3 style="color:var(--color-expense)">${icon('arrowUp',18)} Cuentas por Pagar Pendientes</h3>
          <button class="btn btn-ghost btn-sm" onclick="location.hash='#/payables'">Ver módulo →</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
          ${[
            ...pendingPayables.map(p => ({
              nombre: p.beneficiario, monto: (parseFloat(p.monto)||0)-(parseFloat(p.montoPagado)||0),
              fecha: p.fechaLimite, tipo: 'payable', ov: isOverdue(p.fechaLimite)
            })),
            ...pendingDebts.map(d => ({
              nombre: d.acreedor||d.descripcion||'Deuda', monto: parseFloat(d.saldoPendiente)||parseFloat(d.amount)||0,
              fecha: d.fechaVencimiento||d.dueDate, tipo: 'debt', ov: isOverdue(d.fechaVencimiento||d.dueDate)
            })),
            ...activeLoanInsts.map(i => ({
              nombre: `Cuota: ${i.loanName}`, monto: i.payment,
              fecha: i.date, tipo: 'loan', ov: isOverdue(i.date)
            }))
          ].sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).slice(0,8).map(item => `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg-input);border-radius:8px;${item.ov?'border-left:3px solid var(--color-expense)':''}">
                <div style="flex:1">
                  <div style="font-weight:600">${item.nombre}</div>
                  <div style="font-size:0.78rem;color:${item.ov?'var(--color-expense)':'var(--text-secondary)'}">
                    ${item.ov ? '⚠️ Vencido — ' : ''}${item.fecha ? formatDate(item.fecha) : 'Sin fecha'}
                    <span class="badge badge-neutral" style="font-size:0.65rem;margin-left:6px">${item.tipo==='debt'?'Deuda':item.tipo==='loan'?'Préstamo':'Pagar'}</span>
                  </div>
                </div>
                <div style="font-weight:700;color:var(--color-expense)">${formatMoney(item.monto)}</div>
              </div>`).join('')}
        </div>
      </div>` : ''}

      ${totalItems === 0 ? `
        <div class="empty-state card">
          <div style="font-size:3rem;margin-bottom:12px">✅</div>
          <h3>¡Todo al día!</h3>
          <p>No tienes transacciones en hold, cobros pendientes, ni pagos atrasados.</p>
        </div>` : ''}
    `;

    // Events: assign account to hold tx
    page.querySelectorAll('.assign-acc').forEach(sel => {
      sel.addEventListener('change', () => {
        const txId = sel.dataset.txId;
        const val  = sel.value;
        if (!val) return;
        const [type, id] = val.split(':');
        store.update('transactions', txId, {
          cuentaId:  type === 'acc'  ? id : null,
          tarjetaId: type === 'card' ? id : null,
          estado: 'activo',
        });
        showToast('success', '✅ Transacción confirmada y asignada');
        render();
      });
    });

    // Events: confirm subscription charge
    page.querySelectorAll('.confirm-sub').forEach(btn => {
      btn.addEventListener('click', () => {
        const chargeId = btn.dataset.chargeId;
        const amount   = parseFloat(btn.dataset.amount) || 0;
        const subName  = btn.dataset.subName;
        store.update('subscription_charges', chargeId, { confirmado: true, fechaConfirmacion: new Date().toISOString() });
        showToast('success', `✅ Cobro de "${subName}" confirmado — ${formatMoney(amount)}`);
        render();
      });
    });
  };

  render();
  return page;
}
