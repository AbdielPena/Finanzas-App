// ============================================
// Debts Page — Cuentas por Pagar (informativas)
// Las deudas NO afectan balances hasta que se pague una transacción real.
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { generateId, formatMoney, formatDate, getToday, percentage, aiBadge } from '../utils.js';
import { openModal, closeModal, showToast, confirmDialog, emptyState } from '../components.js';
import { getCategoryOptions } from '../categories.js';
import { enforceLimit } from '../plans_engine.js';
import {
  calculateAmortization,
  executeLoanPayment,
  getLoanCommitmentsTotal
} from '../loans_engine.js';
import { bankFieldHtml, wireBankField, readBankField } from '../banks-rd.js';

// ── Helpers
function getAccountOptions() {
  const accounts = store.getAll('accounts').filter(a => a.activa !== false);
  const banks = store.getAll('banks');
  if (accounts.length === 0) return '';
  return accounts.map(a => {
    const bank = banks.find(b => b.id === a.bancoId);
    return `<option value="account:${a.id}">${bank?.nombre ? bank.nombre + ' — ' : ''}${a.nombre}</option>`;
  }).join('');
}

function getCardOptions() {
  return store.getAll('cards').filter(c => c.activa !== false)
    .map(c => `<option value="card:${c.id}">💳 ${c.nombre}</option>`).join('');
}

function getExtCardOptions() {
  return store.getAll('external_cards').filter(c => c.activa !== false)
    .map(c => `<option value="extcard:${c.id}">🌐 ${c.nombre} (${c.banco})</option>`).join('');
}

// ── Normalize debt: support old and new model
export function normDebt(d) {
  if (!d || typeof d !== 'object') return null;
  if (d.montoTotal !== undefined) return d;
  const montoUnit = parseFloat(d.monto) || 0;
  const total = montoUnit * (parseInt(d.cantidadVeces) || 1);
  const pagado = montoUnit * (parseInt(d.vecesPagadas) || 0);
  return {
    ...d,
    descripcion: d.nombre || d.descripcion || 'Deuda',
    acreedor:    d.colaborador || d.acreedor || '',
    montoTotal:  total,
    saldoPendiente: Math.max(0, total - pagado),
    montoPagado: pagado,
  };
}

// ── UI Components (Forms)
function debtForm(debt = null) {
  const d = debt ? normDebt(debt) : null;
  return `
    <form id="debt-form">
      <div class="form-group">
        <label class="form-label">Descripción / Concepto <span class="required">*</span></label>
        <input type="text" class="form-input" id="debt-desc" value="${d?.descripcion || ''}" required placeholder="Ej: Préstamo personal, Factura..." />
      </div>
      <div class="form-group">
        <label class="form-label">Acreedor <span class="required">*</span></label>
        <input type="text" class="form-input" id="debt-acreedor" value="${d?.acreedor || ''}" required placeholder="Ej: Banco Popular, Juan Pérez..." />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto Total <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="debt-total" value="${d?.montoTotal || ''}" step="0.01" min="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Vencimiento</label>
          <input type="date" class="form-input" id="debt-due" value="${d?.fechaVencimiento || ''}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Cuenta preferida (opcional)</label>
        <select class="form-select" id="debt-account">
          <option value="">— Sin preferencia —</option>
          <optgroup label="🏦 Cuentas">${getAccountOptions()}</optgroup>
          <optgroup label="💳 Tarjetas">${getCardOptions()}</optgroup>
          <optgroup label="🌐 Tarjetas Externas">${getExtCardOptions()}</optgroup>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea class="form-textarea" id="debt-notes" placeholder="Detalles extra...">${d?.notas || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check', 18)} Guardar</button>
      </div>
    </form>
  `;
}

function templateForm(tpl = null) {
  return `
    <form id="template-form">
      <div class="form-group">
        <label class="form-label">Nombre de Plantilla <span class="required">*</span></label>
        <input type="text" class="form-input" id="tpl-name" value="${tpl?.nombre || ''}" required placeholder="Ej: Asistencia Scarlet..." />
      </div>
      <div class="form-group">
        <label class="form-label">Acreedor <span class="required">*</span></label>
        <input type="text" class="form-input" id="tpl-acreedor" value="${tpl?.acreedor || tpl?.colaborador || ''}" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto</label>
          <input type="number" class="form-input" id="tpl-amount" value="${tpl?.monto || ''}" step="0.01" required />
        </div>
        <div class="form-group">
          <label class="form-label">Cuotas</label>
          <input type="number" class="form-input" id="tpl-count" value="${tpl?.cantidadVeces || 1}" min="1" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Frecuencia</label>
        <select class="form-select" id="tpl-freq">
          <option value="unico" ${tpl?.frecuencia === 'unico' ? 'selected' : ''}>Único</option>
          <option value="mensual" ${tpl?.frecuencia === 'mensual' || !tpl ? 'selected' : ''}>Mensual</option>
          <option value="quincenal" ${tpl?.frecuencia === 'quincenal' ? 'selected' : ''}>Quincenal</option>
          <option value="semanal" ${tpl?.frecuencia === 'semanal' ? 'selected' : ''}>Semanal</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  `;
}

function loanForm(loan = null) {
  return `
    <form id="loan-form">
      <div class="form-group">
        <label class="form-label">Concepto del Préstamo <span class="required">*</span></label>
        <input type="text" class="form-input" id="loan-nombre" value="${loan?.nombre || ''}" required placeholder="Ej: Financiamiento Tesla, Hipotecario..." />
      </div>
      ${bankFieldHtml({
        selectId: 'loan-entidad-select',
        otherInputId: 'loan-entidad-other',
        label: 'Entidad / Persona prestamista',
        selectedBankId: loan?.entidadId || (loan?.entidad ? 'otro' : ''),
        customName: loan?.entidadId === 'otro' ? loan?.entidad : (loan && !loan?.entidadId ? loan.entidad : ''),
        required: true,
      })}
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto Principal <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="loan-principal" value="${loan?.montoPrincipal || ''}" step="0.01" min="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Tasa Anual (%) <span class="required">*</span></label>
          <input type="number" class="form-input" id="loan-rate" value="${loan?.tasaAnual || ''}" step="0.01" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto de Cuota (Pago) <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="loan-pmt" value="${loan?.cuotaMonto || ''}" step="0.01" min="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Frecuencia de Pago</label>
          <select class="form-select" id="loan-freq">
            <option value="mensual" ${loan?.frecuencia === 'mensual' || !loan ? 'selected' : ''}>Mensual</option>
            <option value="quincenal" ${loan?.frecuencia === 'quincenal' ? 'selected' : ''}>Quincenal</option>
            <option value="semanal" ${loan?.frecuencia === 'semanal' ? 'selected' : ''}>Semanal</option>
            <option value="diario" ${loan?.frecuencia === 'diario' ? 'selected' : ''}>Diario</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Fecha del Primer Pago <span class="required">*</span></label>
          <input type="date" class="form-input" id="loan-start" value="${loan?.fechaPrimerPago || getToday()}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Cuenta Descuento (Automático)</label>
          <select class="form-select" id="loan-account">
            <option value="">— Pago Manual —</option>
            <optgroup label="🏦 Cuentas Bancarias">${getAccountOptions()}</optgroup>
          </select>
        </div>
      </div>
      <div style="background:rgba(99,102,241,0.06); padding:12px; border-radius:10px; font-size:0.8rem; color:var(--text-secondary); margin-top:8px">
        ℹ️ El cronograma se generará a partir de la <strong>fecha del primer pago</strong>. Si asignas una cuenta, los cobros se realizarán automáticamente.
      </div>
      <div class="form-actions" style="margin-top:20px">
        <button type="button" class="btn btn-secondary" id="loan-cancel-btn">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Préstamo</button>
      </div>
    </form>
  `;
}

function paymentForm(debt) {
  const d = normDebt(debt);
  return `
    <form id="pay-form">
      <div style="background:var(--bg-input);padding:20px;border-radius:16px;margin-bottom:20px;text-align:center;border:1px solid var(--border-color)">
        <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:4px">Pago a: ${d.acreedor}</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--color-expense)">${formatMoney(d.saldoPendiente)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">${d.descripcion}</div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="pay-amount" value="${d.saldoPendiente}" step="0.01" min="0.01" max="${d.saldoPendiente + 0.01}" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input type="date" class="form-input" id="pay-date" value="${getToday()}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descontar de <span class="required">*</span></label>
        <select class="form-select" id="pay-source" required>
          <option value="">— Selecciona —</option>
          <optgroup label="🏦 Cuentas">${getAccountOptions()}</optgroup>
          <optgroup label="💳 Tarjetas">${getCardOptions()}</optgroup>
          <optgroup label="🌐 Tarjetas Externas">${getExtCardOptions()}</optgroup>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Categoría</label>
        <select class="form-select" id="pay-cat">
          <option value="cat_debt_payment">💸 Pago de Deuda</option>
          <option value="cat_loan_amortization">🏦 Amortización Préstamo</option>
          ${getCategoryOptions('gasto')}
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
        <button type="submit" class="btn btn-success">${icon('check', 18)} Confirmar Pago</button>
      </div>
    </form>
  `;
}

export default function renderDebts() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';
  let activeTabValue = 'activas';

  const render = () => {
    const rawDebts = store.getAll('debts');
    const debtsArr = rawDebts.map(normDebt);
    const templates = store.getAll('debt_templates');

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Deudas y Préstamos</h1>
          <p>Gestiona compromisos, plantillas recurrentes y préstamos bancarios.</p>
        </div>
        <div class="page-header-actions" style="display:flex; gap:10px">
          ${activeTabValue === 'prestamos' ? 
            `<button class="btn btn-primary" id="add-loan-btn">${icon('plus', 18)} Nuevo Préstamo</button>` : 
            `<button class="btn btn-secondary" id="add-tpl-btn">${icon('plus', 18)} Nueva Plantilla</button>
             <button class="btn btn-primary" id="add-debt-btn">${icon('plus', 18)} Registrar Deuda</button>`
          }
        </div>
      </div>

      <div class="tabs-switcher" style="margin-bottom:28px; display:flex; gap:24px; border-bottom:1px solid var(--border-color); padding-bottom:0">
        <button class="tab-btn ${activeTabValue === 'activas' ? 'active' : ''}" data-tab="activas" 
          style="background:none; border:none; padding:12px 4px; font-weight:600; font-size:0.9rem; color:${activeTabValue === 'activas' ? 'var(--accent-primary)' : 'var(--text-muted)'}; border-bottom:2px solid ${activeTabValue === 'activas' ? 'var(--accent-primary)' : 'transparent'}; cursor:pointer; transition:all 0.2s">
          Compromisos Activos
        </button>
        <button class="tab-btn ${activeTabValue === 'plantillas' ? 'active' : ''}" data-tab="plantillas" 
          style="background:none; border:none; padding:12px 4px; font-weight:600; font-size:0.9rem; color:${activeTabValue === 'plantillas' ? 'var(--accent-primary)' : 'var(--text-muted)'}; border-bottom:2px solid ${activeTabValue === 'plantillas' ? 'var(--accent-primary)' : 'transparent'}; cursor:pointer; transition:all 0.2s">
          Plantillas (Recurrentes)
        </button>
        <button class="tab-btn ${activeTabValue === 'prestamos' ? 'active' : ''}" data-tab="prestamos" 
          style="background:none; border:none; padding:12px 4px; font-weight:600; font-size:0.9rem; color:${activeTabValue === 'prestamos' ? 'var(--accent-primary)' : 'var(--text-muted)'}; border-bottom:2px solid ${activeTabValue === 'prestamos' ? 'var(--accent-primary)' : 'transparent'}; cursor:pointer; transition:all 0.2s">
          Préstamos (Amortización)
        </button>
      </div>

      <div id="tab-content" class="stagger-children">
        ${activeTabValue === 'activas' ? renderActivasTab(debtsArr) : 
          activeTabValue === 'plantillas' ? renderTemplatesTab(templates) : renderLoansTab()}
      </div>
    `;
    setupEvents();
  };

  function renderActivasTab(debts) {
    if (debts.length === 0) {
      return `
        <div class="empty-state card">
          ${icon('debt', 64)}
          <h3>Sin deudas pendientes</h3>
          <p>Registra deudas informativas para llevar un mejor control.</p>
          <button class="btn btn-primary" id="empty-add-debt-btn">${icon('plus', 18)} Nueva Deuda</button>
        </div>
      `;
    }
    const today = getToday();
    const active = debts.filter(d => d.estado !== 'pagada');
    const totalPendiente = active.reduce((s, d) => s + (parseFloat(d.saldoPendiente) || 0), 0);

    return `
      <div style="background:rgba(239,68,68,0.05); padding:16px; border-radius:12px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; border:1px solid rgba(239,68,68,0.1)">
        <div>
          <div style="font-size:0.85rem; color:var(--text-muted)">Total en Compromisos</div>
          <div style="font-size:1.4rem; font-weight:800; color:var(--color-expense)">${formatMoney(totalPendiente)}</div>
        </div>
        <div style="font-size:1.8rem; filter:grayscale(1)">💸</div>
      </div>
      
      <div class="stagger-children">
        ${debts.map(d => {
          const isPaid = d.estado === 'pagada';
          const isOverdue = d.fechaVencimiento && d.fechaVencimiento < today && !isPaid;
          const progress = d.montoTotal > 0 ? Math.round((d.montoPagado / d.montoTotal) * 100) : 0;
          return `
            <div class="card" style="margin-bottom:16px; opacity:${isPaid ? '0.7' : '1'}; border-left:4px solid ${isPaid ? 'var(--color-success)' : isOverdue ? 'var(--color-expense)' : 'var(--accent-primary)'}">
              <div style="display:flex; justify-content:space-between; align-items:flex-start">
                <div style="flex:1">
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
                    <span style="font-weight:700; font-size:1.05rem">${d.descripcion}</span>
                    <span class="badge ${isPaid ? 'badge-success' : isOverdue ? 'badge-danger' : 'badge-warning'}">
                      ${isPaid ? 'Pagada' : isOverdue ? 'Vencida' : 'Pendiente'}
                    </span>
                  </div>
                  <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px">Acreedor: <strong>${d.acreedor}</strong></div>
                  
                  <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:4px">
                    <span>Avance: ${formatMoney(d.montoPagado)} pagado</span>
                    <span>${progress}%</span>
                  </div>
                  <div class="progress-bar" style="height:6px"><div class="progress-fill ${isPaid ? 'income' : 'expense'}" style="width:${progress}%"></div></div>
                  <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:6px">
                    Pendiente: <strong style="color:var(--color-expense)">${formatMoney(d.saldoPendiente)}</strong>
                  </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px">
                  <div style="display:flex; gap:6px">
                    <button class="btn-icon" data-edit-debt="${d.id}">${icon('edit', 16)}</button>
                    <button class="btn-icon" data-del-debt="${d.id}">${icon('trash', 16)}</button>
                  </div>
                  ${!isPaid ? `<button class="btn btn-secondary btn-sm" data-pay-debt="${d.id}">${icon('check', 14)} Pagar</button>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderTemplatesTab(tpls) {
    if (tpls.length === 0) {
      return `
        <div class="empty-state card">
          ${icon('subscription', 64)}
          <h3>Sin plantillas recurrentes</h3>
          <p>Crea plantillas para generar deudas rápidas para colaboradores.</p>
          <button class="btn btn-primary" id="empty-add-tpl-btn">${icon('plus', 18)} Nueva Plantilla</button>
        </div>
      `;
    }
    return `
      <div class="stagger-children">
        ${tpls.map(t => `
          <div class="card" style="margin-bottom:16px; border-left:4px solid var(--accent-secondary)">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <div>
                <div style="font-weight:700; font-size:1.05rem">${t.nombre}</div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px">
                  Acreedor: ${t.acreedor || t.colaborador} | ${formatMoney(t.monto)} × ${t.cantidadVeces} (${t.frecuencia})
                </div>
              </div>
              <div style="display:flex; gap:8px">
                <button class="btn btn-primary btn-sm" data-use-tpl="${t.id}">${icon('plus', 14)} Usar</button>
                <button class="btn-icon" data-edit-tpl="${t.id}">${icon('edit', 16)}</button>
                <button class="btn-icon" data-del-tpl="${t.id}">${icon('trash', 16)}</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderLoansTab() {
    const loans = store.getAll('loans');
    if (loans.length === 0) {
      return `
        <div class="empty-state card">
          ${icon('bank', 64)}
          <h3>Sin préstamos amortizables</h3>
          <p>Registra préstamos bancarios para generar un cronograma automático.</p>
          <button class="btn btn-primary" id="empty-add-loan-btn">${icon('plus', 18)} Nuevo Préstamo</button>
        </div>
      `;
    }
    const active = loans.filter(l => l.estado !== 'pagado');
    const currentCommitment = getLoanCommitmentsTotal(active);
    const totalDeudaReal = active.reduce((s, l) => s + (parseFloat(l.saldoPendiente) || 0), 0);

    return `
      <div style="background:rgba(99,102,241,0.05); border:1px dashed var(--accent-primary); border-radius:12px; padding:20px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center">
        <div>
          <div style="font-size:0.85rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.5px">Compromiso Corriente (Mes)</div>
          <div style="font-size:1.8rem; font-weight:800; color:var(--accent-primary)">${formatMoney(currentCommitment)}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px">
            Referencia: Deuda Total Pendiente <span style="font-weight:600">${formatMoney(totalDeudaReal)}</span>
          </div>
        </div>
        <button class="btn btn-primary" id="new-loan-btn">${icon('plus', 18)} Nuevo Préstamo</button>
      </div>

      <div class="stagger-children">
        ${loans.map(l => {
          const schedule = l.schedule || [];
          const paidCount = schedule.filter(s => s.status === 'paid').length;
          const totalCount = schedule.length;
          const pendingCount = totalCount - paidCount;
          const pct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
          const isError = l.estado === 'error_pago';
          const isPaid = l.estado === 'pagado';
          
          const totalScheduled = schedule.reduce((sum, s) => sum + s.payment, 0);
          const totalPaidAmt = schedule.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.payment, 0);
          const totalPendingAmt = totalScheduled - totalPaidAmt;

          return `
            <div class="card" style="margin-bottom:16px; border-left:4px solid ${isPaid ? 'var(--color-success)' : isError ? 'var(--color-expense)' : 'var(--accent-primary)'}; opacity: ${isPaid ? '0.8' : '1'}">
              <div style="display:flex; justify-content:space-between; align-items:flex-start">
                <div style="flex:1">
                  <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px">
                    <h3 style="margin:0; font-size:1.1rem">${l.nombre}</h3>
                    <span class="badge ${isPaid ? 'badge-success' : isError ? 'badge-danger' : 'badge-primary'}">${l.estado.toUpperCase()}</span>
                  </div>
                  <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px">
                    ${l.entidad} | ${l.tasaAnual}% anual | ${l.frecuencia}
                  </div>
                  
                  <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:4px">
                    <span>${isPaid ? 'Completado' : `Pagos pendientes: <strong>${pendingCount}</strong>`}</span>
                    <span>${pct}%</span>
                  </div>
                  <div class="progress-bar" style="height:8px; margin-bottom:12px"><div class="progress-fill" style="width:${pct}%"></div></div>
                  
                  <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-bottom:12px">
                    <div>
                      <div style="font-size:0.75rem; color:var(--text-muted)">Cuota suscrita</div>
                      <div style="font-weight:700; color:var(--accent-primary)">${formatMoney(l.cuotaMonto)}</div>
                    </div>
                    <div>
                      <div style="font-size:0.75rem; color:var(--text-muted)">Total Préstamo</div>
                      <div style="font-weight:700">${formatMoney(totalScheduled)}</div>
                    </div>
                    <div>
                      <div style="font-size:0.75rem; color:var(--text-muted)">Próximo Pago</div>
                      <div style="font-weight:700; color:var(--accent-primary)">${formatDate(l.proximoPago) || 'Finalizado'}</div>
                    </div>
                  </div>

                  <div style="padding:10px; background:rgba(99,102,241,0.04); border-radius:10px; display:flex; justify-content:space-between; align-items:center; border:1px dashed rgba(99,102,241,0.1)">
                    <div style="font-size:0.75rem">
                      Pagado: <span style="font-weight:700; color:var(--color-income)">${formatMoney(totalPaidAmt)}</span>
                    </div>
                    <div style="font-size:0.75rem">
                      Por pagar: <span style="font-weight:700; color:var(--color-expense)">${formatMoney(totalPendingAmt)}</span>
                    </div>
                  </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px">
                  <div style="display:flex; gap:6px">
                    <button class="btn-icon" data-edit-loan="${l.id}">${icon('edit', 16)}</button>
                    <button class="btn-icon" data-del-loan="${l.id}">${icon('trash', 16)}</button>
                  </div>
                  <button class="btn btn-secondary btn-sm" style="width:100%" data-view-loan="${l.id}">${icon('fileText', 14)} Detalles</button>
                  ${l.estado !== 'pagado' ? `<button class="btn btn-success btn-sm" style="width:100%" data-pay-loan="${l.id}">${icon('check', 14)} Pagar Cuota</button>` : ''}
                </div>
              </div>
              ${isError ? `<div style="margin-top:10px; padding:8px; background:rgba(239,68,68,0.08); border-radius:8px; font-size:0.75rem; color:var(--color-expense)">⚠️ Cobro automático fallido. Revisa tus fondos.</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function setupEvents() {
    page.querySelector('#add-debt-btn')?.addEventListener('click', () => openDebtModal());
    page.querySelector('#add-tpl-btn')?.addEventListener('click', () => openTplModal());
    page.querySelector('#add-loan-btn')?.addEventListener('click', () => openLoanModal());

    // Empty state buttons
    page.querySelector('#empty-add-debt-btn')?.addEventListener('click', () => openDebtModal());
    page.querySelector('#empty-add-tpl-btn')?.addEventListener('click', () => openTplModal());
    page.querySelector('#empty-add-loan-btn')?.addEventListener('click', () => openLoanModal());

    page.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', (e) => {
      activeTabValue = e.target.dataset.tab;
      render();
    }));

    // Debts
    page.querySelectorAll('[data-edit-debt]').forEach(btn => btn.addEventListener('click', () => {
      const debt = store.getById('debts', btn.dataset.editDebt);
      if (debt) openDebtModal(debt);
    }));
    page.querySelectorAll('[data-del-debt]').forEach(btn => btn.addEventListener('click', async () => {
      if (await confirmDialog('¿Eliminar deuda?', 'Esta acción no se puede deshacer.')) {
        store.remove('debts', btn.dataset.delDebt); showToast('success', 'Deuda eliminada'); render();
      }
    }));
    page.querySelectorAll('[data-pay-debt]').forEach(btn => btn.addEventListener('click', () => {
      const debt = store.getById('debts', btn.dataset.payDebt);
      if (debt) openPayModal(normDebt(debt));
    }));

    // Templates
    page.querySelectorAll('[data-edit-tpl]').forEach(btn => btn.addEventListener('click', () => {
      const tpl = store.getById('debt_templates', btn.dataset.editTpl);
      if (tpl) openTplModal(tpl);
    }));
    page.querySelectorAll('[data-del-tpl]').forEach(btn => btn.addEventListener('click', async () => {
      if (await confirmDialog('¿Eliminar plantilla?', 'Se borrará permanentemente.')) {
        store.remove('debt_templates', btn.dataset.delTpl); showToast('success', 'Plantilla eliminada'); render();
      }
    }));
    page.querySelectorAll('[data-use-tpl]').forEach(btn => btn.addEventListener('click', () => {
      const tpl = store.getById('debt_templates', btn.dataset.useTpl);
      if (tpl) createDebtFromTemplate(tpl);
    }));

    // Loans
    page.querySelectorAll('[data-edit-loan]').forEach(btn => btn.addEventListener('click', () => {
      const loan = store.getById('loans', btn.dataset.editLoan);
      if (loan) openLoanModal(loan);
    }));
    page.querySelectorAll('[data-del-loan]').forEach(btn => btn.addEventListener('click', async () => {
      if (await confirmDialog('¿Eliminar préstamo?', 'Se perderá el cronograma y seguimiento.')) {
        store.remove('loans', btn.dataset.delLoan); showToast('success', 'Préstamo eliminado'); render();
      }
    }));
    page.querySelectorAll('[data-view-loan]').forEach(btn => btn.addEventListener('click', () => {
      const loan = store.getById('loans', btn.dataset.viewLoan);
      if (loan) openLoanDetailsModal(loan);
    }));
    page.querySelectorAll('[data-pay-loan]').forEach(btn => btn.addEventListener('click', () => {
      const loan = store.getById('loans', btn.dataset.payLoan);
      if (loan) {
        const res = executeLoanPayment(loan);
        if (res.success) { showToast('success', 'Pago realizado correctamente'); render(); }
        else showToast('error', res.message);
      }
    }));
  }

  function openDebtModal(debt = null) {
    const modal = openModal(debt ? 'Editar Deuda' : 'Registrar Deuda', debtForm(debt));
    if (debt) {
      const d = normDebt(debt);
      const sel = modal.querySelector('#debt-account');
      if (d.cuentaId) sel.value = `account:${d.cuentaId}`;
      else if (d.tarjetaId) sel.value = `card:${d.tarjetaId}`;
    }
    modal.querySelector('#debt-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const source = modal.querySelector('#debt-account').value;
      const total = parseFloat(modal.querySelector('#debt-total').value);
      let accountId = null, cardId = null;
      if (source.startsWith('account:')) accountId = source.split(':')[1];
      else if (source.startsWith('card:')) cardId = source.split(':')[1];

      const data = {
        id: debt?.id || generateId(),
        descripcion: modal.querySelector('#debt-desc').value.trim(),
        acreedor: modal.querySelector('#debt-acreedor').value.trim(),
        montoTotal: total,
        saldoPendiente: debt ? (debt.saldoPendiente || total) : total,
        montoPagado: debt ? (debt.montoPagado || 0) : 0,
        fechaVencimiento: modal.querySelector('#debt-due').value,
        cuentaId: accountId,
        tarjetaId: cardId,
        notas: modal.querySelector('#debt-notes').value.trim(),
        estado: debt?.estado || 'pendiente'
      };
      if (debt) { store.update('debts', debt.id, data); showToast('success', 'Deuda actualizada'); }
      else {
        if (!enforceLimit('max_debts', { title: 'Has alcanzado el máximo de deudas activas' })) return;
        store.add('debts', data); showToast('success', 'Deuda registrada');
      }
      closeModal(); render();
    });

    modal.querySelector('.btn-cancel')?.addEventListener('click', closeModal);
  }

  function openTplModal(tpl = null) {
    const modal = openModal(tpl ? 'Editar Plantilla' : 'Nueva Plantilla', templateForm(tpl));
    modal.querySelector('#template-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        id: tpl?.id || generateId(),
        nombre: modal.querySelector('#tpl-name').value.trim(),
        acreedor: modal.querySelector('#tpl-acreedor').value.trim(),
        monto: parseFloat(modal.querySelector('#tpl-amount').value),
        cantidadVeces: parseInt(modal.querySelector('#tpl-count').value),
        frecuencia: modal.querySelector('#tpl-freq').value,
      };
      if (tpl) store.update('debt_templates', tpl.id, data);
      else store.add('debt_templates', data);
      showToast('success', 'Plantilla guardada'); closeModal(); render();
    });

    modal.querySelector('.btn-cancel')?.addEventListener('click', closeModal);
  }

  function openLoanModal(loan = null) {
    const modal = openModal(loan ? 'Editar Préstamo' : 'Nuevo Préstamo', loanForm(loan));
    wireBankField(modal);
    if (loan?.cuentaId) modal.querySelector('#loan-account').value = `account:${loan.cuentaId}`;

    modal.querySelector('#loan-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const { bankId, bankName } = readBankField(modal, 'loan-entidad-select', 'loan-entidad-other');
      if (!bankName) {
        showToast('error', 'Selecciona una entidad o escribe el nombre');
        return;
      }
      const principal = parseFloat(modal.querySelector('#loan-principal').value);
      const rate = parseFloat(modal.querySelector('#loan-rate').value);
      const pmt = parseFloat(modal.querySelector('#loan-pmt').value);
      const freq = modal.querySelector('#loan-freq').value;
      const start = modal.querySelector('#loan-start').value;
      const accountSource = modal.querySelector('#loan-account').value;
      const cuentaId = accountSource.startsWith('account:') ? accountSource.split(':')[1] : null;

      try {
        const calc = calculateAmortization(principal, rate, pmt, freq, start);
        const data = {
          id: loan?.id || generateId(),
          nombre: modal.querySelector('#loan-nombre').value.trim(),
          entidad: bankName,
          entidadId: bankId,
          montoPrincipal: principal,
          tasaAnual: rate,
          cuotasTotales: calc.schedule.length,
          frecuencia: freq,
          fechaPrimerPago: start,
          cuentaId,
          cuotaMonto: pmt,
          schedule: calc.schedule,
          saldoPendiente: loan ? (loan.saldoPendiente || principal) : principal,
          cuotasPagadas: loan ? (loan.cuotasPagadas || 0) : 0,
          proximoPago: loan ? (loan.proximoPago || calc.schedule[0].date) : calc.schedule[0].date,
          estado: loan?.estado || 'activo'
        };
        if (loan) store.update('loans', loan.id, data);
        else {
          if (!enforceLimit('max_loans', { title: 'Has alcanzado el máximo de préstamos activos' })) return;
          store.add('loans', data);
        }
        showToast('success', 'Préstamo registrado'); closeModal(); render();
      } catch (err) {
        showToast('error', 'Cálculo Imposible', err.message);
      }
    });

    modal.querySelector('#loan-cancel-btn')?.addEventListener('click', () => {
      closeModal();
    });
  }

  function openLoanDetailsModal(loan) {
    const content = `
      <div style="padding:4px">
        <h4 style="margin-bottom:12px">Cronograma de Pagos</h4>
        <div style="max-height:350px; overflow-y:auto; border:1px solid var(--border-color); border-radius:12px">
          <table style="width:100%; border-collapse:collapse; font-size:0.85rem">
            <thead style="position:sticky; top:0; background:var(--bg-input); font-weight:700">
              <tr>
                <th style="padding:12px; text-align:left">#</th>
                <th style="padding:12px; text-align:left">Fecha</th>
                <th style="padding:12px; text-align:right">Cuota</th>
                <th style="padding:12px; text-align:center">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${loan.schedule.map(s => `
                <tr style="border-bottom:1px solid var(--border-color)">
                  <td style="padding:12px">${s.number}</td>
                  <td style="padding:12px">${formatDate(s.date)}</td>
                  <td style="padding:12px; text-align:right">${formatMoney(s.payment)}</td>
                  <td style="padding:12px; text-align:center">
                    <span class="badge ${s.status === 'paid' ? 'badge-success' : 'badge-warning'}">${s.status === 'paid' ? 'Pagado' : 'Pendiente'}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="form-actions" style="margin-top:20px"><button class="btn btn-secondary btn-close-modal">Cerrar</button></div>
      </div>
    `;
    const modal = openModal(`Detalle: ${loan.nombre}`, content);
    modal.querySelector('.btn-close-modal')?.addEventListener('click', closeModal);
  }

  function openPayModal(debt) {
    const modal = openModal('Registrar Pago', paymentForm(debt));
    if (debt.cuentaId) modal.querySelector('#pay-source').value = `account:${debt.cuentaId}`;
    else if (debt.tarjetaId) modal.querySelector('#pay-source').value = `card:${debt.tarjetaId}`;

    modal.querySelector('#pay-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(modal.querySelector('#pay-amount').value);
      const source = modal.querySelector('#pay-source').value;
      const cat = modal.querySelector('#pay-cat').value;
      const date = modal.querySelector('#pay-date').value || getToday();
      
      let cId = null, tId = null;
      if (source.startsWith('account:')) cId = source.split(':')[1];
      else if (source.startsWith('card:')) tId = source.split(':')[1];
      
      store.add('transactions', {
        id: generateId(), tipo: 'gasto', monto: amount, categoriaId: cat,
        descripcion: `Pago deuda: ${debt.descripcion}`, cuentaId: cId || '', tarjetaId: tId || '',
        fecha: date, estado: 'activo'
      });
      
      const newSaldo = Math.max(0, debt.saldoPendiente - amount);
      store.update('debts', debt.id, {
        saldoPendiente: newSaldo,
        montoPagado: (debt.montoPagado || 0) + amount,
        estado: newSaldo <= 0 ? 'pagada' : 'pendiente'
      });
      showToast('success', 'Pago registrado'); closeModal(); render();
    });

    modal.querySelector('.btn-cancel')?.addEventListener('click', closeModal);
  }

  function createDebtFromTemplate(tpl) {
    const total = tpl.monto * tpl.cantidadVeces;
    const data = {
      id: generateId(),
      descripcion: tpl.nombre,
      acreedor: tpl.acreedor,
      montoTotal: total,
      saldoPendiente: total,
      montoPagado: 0,
      fechaVencimiento: getToday(),
      estado: 'pendiente'
    };
    store.add('debts', data);
    showToast('success', '🤖 Deuda generada desde plantilla');
    activeTabValue = 'activas'; render();
  }

  render();
  return page;
}
