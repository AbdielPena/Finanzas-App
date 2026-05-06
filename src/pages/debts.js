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

  // ---------- Estado de filtros del tab "Compromisos Activos" ----------
  // El usuario puede combinarlos. Persistencia ligera en localStorage.
  const FILTERS_KEY = 'finanzapp_debt_filters';
  const filters = (() => {
    try { return Object.assign({
      search: '',
      estado: 'todas',     // todas | pendientes | parciales | vencidas | pagadas | archivadas
      sortBy: 'priority',  // priority | venc | ingreso | monto | acreedor
      acreedor: '',
      templateId: '',
    }, JSON.parse(localStorage.getItem(FILTERS_KEY) || '{}')); } catch {
      return { search:'', estado:'todas', sortBy:'priority', acreedor:'', templateId:'' };
    }
  })();
  const persistFilters = () => { try { localStorage.setItem(FILTERS_KEY, JSON.stringify(filters)); } catch {} };

  // Auto-archive: pagadas con paidAt > 30 dias se ocultan del listado principal
  // pero NO se borran del backend. Si paidAt no existe lo derivamos de
  // updatedAt cuando el estado paso a 'pagada'.
  const ARCHIVE_DAYS = 30;
  const isArchived = (d) => {
    if (d.estado !== 'pagada') return false;
    const paidAtStr = d.paidAt || d.metadata?.paidAt || d.updatedAt || d.createdAt;
    if (!paidAtStr) return false;
    const paidAt = new Date(paidAtStr);
    if (isNaN(paidAt)) return false;
    const ageDays = Math.floor((Date.now() - paidAt.getTime()) / 86400000);
    return ageDays >= ARCHIVE_DAYS;
  };

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

    // ---------- Filtrar (search/estado/acreedor/templateId) ----------
    const matchesFilters = (d) => {
      if (!filters.search && filters.estado === 'todas' && !filters.acreedor && !filters.templateId) return true;
      // Search libre
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = [d.descripcion, d.acreedor, d.notas].some(v => String(v || '').toLowerCase().includes(q));
        if (!hay) return false;
      }
      // Estado
      const isPaid = d.estado === 'pagada';
      const isPartial = !isPaid && (parseFloat(d.montoPagado) || 0) > 0;
      const isOverdue = !isPaid && d.fechaVencimiento && d.fechaVencimiento < today;
      const archived = isArchived(d);
      switch (filters.estado) {
        case 'pendientes': if (isPaid || isPartial) return false; break;
        case 'parciales':  if (!isPartial) return false; break;
        case 'vencidas':   if (!isOverdue) return false; break;
        case 'pagadas':    if (!isPaid || archived) return false; break;
        case 'archivadas': if (!archived) return false; break;
        case 'todas':      if (archived) return false; break; // archivadas se ocultan por default
      }
      if (filters.acreedor && norm(d.acreedor) !== norm(filters.acreedor)) return false;
      if (filters.templateId) {
        const tplId = d.templateId || d.metadata?.templateId;
        if (tplId !== filters.templateId) return false;
      }
      return true;
    };
    const filteredDebts = debts.filter(matchesFilters);

    // ---------- Agrupar (mantenemos lo que ya teniamos) ----------
    const groupKey = (d) => {
      const tplId = d.templateId || d.metadata?.templateId;
      if (tplId) return `tpl:${tplId}`;
      const desc = norm(d.descripcion);
      const acr = norm(d.acreedor);
      if (desc && acr) return `da:${desc}|${acr}`;
      return null;
    };
    const groups = new Map();
    const standalone = [];
    filteredDebts.forEach((d) => {
      const key = groupKey(d);
      if (!key) { standalone.push(d); return; }
      if (!groups.has(key)) {
        groups.set(key, { key, tplId: d.templateId || d.metadata?.templateId || null, debts: [] });
      }
      groups.get(key).debts.push(d);
    });
    for (const [key, g] of [...groups.entries()]) {
      if (g.debts.length < 2) {
        standalone.push(...g.debts);
        groups.delete(key);
      }
    }

    // ---------- Prioridad y orden ----------
    // Prioridad por defecto: vencidas > pendientes > parciales > pagadas
    const priority = (d) => {
      const isPaid = d.estado === 'pagada';
      const isPartial = !isPaid && (parseFloat(d.montoPagado) || 0) > 0;
      const isOverdue = !isPaid && d.fechaVencimiento && d.fechaVencimiento < today;
      if (isOverdue) return 0;
      if (isPartial) return 2;
      if (isPaid)    return 3;
      return 1;
    };
    const groupPriority = (g) => Math.min(...g.debts.map(priority));
    const sortDebts = (a, b) => {
      const sb = filters.sortBy || 'priority';
      if (sb === 'priority') {
        const dp = priority(a) - priority(b);
        if (dp) return dp;
        return (a.fechaVencimiento || '').localeCompare(b.fechaVencimiento || '');
      }
      if (sb === 'venc')     return (a.fechaVencimiento || '9999').localeCompare(b.fechaVencimiento || '9999');
      if (sb === 'ingreso')  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      if (sb === 'monto')    return (parseFloat(b.montoTotal) || 0) - (parseFloat(a.montoTotal) || 0);
      if (sb === 'acreedor') return String(a.acreedor || '').localeCompare(String(b.acreedor || ''));
      return 0;
    };
    const sortGroups = (a, b) => {
      const sb = filters.sortBy || 'priority';
      if (sb === 'priority') return groupPriority(a) - groupPriority(b);
      if (sb === 'monto')    return b.debts.reduce((s,d)=>s+(parseFloat(d.saldoPendiente)||0),0) - a.debts.reduce((s,d)=>s+(parseFloat(d.saldoPendiente)||0),0);
      if (sb === 'acreedor') return String(a.debts[0]?.acreedor || '').localeCompare(String(b.debts[0]?.acreedor || ''));
      return 0;
    };
    standalone.sort(sortDebts);
    const sortedGroups = [...groups.values()].sort(sortGroups);

    // ---------- Card compacto ----------
    const compactGroupHtml = (g) => {
      const tpl = g.tplId ? store.getById('debt_templates', g.tplId) : null;
      const nombre = tpl?.nombre || g.debts[0]?.descripcion || 'Grupo';
      const acreedor = tpl?.acreedor || g.debts[0]?.acreedor || '';
      const total = g.debts.reduce((s,d)=>s+(parseFloat(d.montoTotal)||parseFloat(d.montoOriginal)||0), 0);
      const pagado = g.debts.reduce((s,d)=>s+(parseFloat(d.montoPagado)||0), 0);
      const pend = g.debts.reduce((s,d)=>s+(parseFloat(d.saldoPendiente)||0), 0);
      const progress = total > 0 ? Math.round((pagado/total)*100) : 0;
      const allPaid = g.debts.every(d => d.estado === 'pagada');
      const overdueCount = g.debts.filter(d => d.estado !== 'pagada' && d.fechaVencimiento && d.fechaVencimiento < today).length;
      const borderColor = allPaid ? 'var(--color-success)' : overdueCount > 0 ? 'var(--color-expense)' : 'var(--accent-primary)';
      return `
        <div class="card debt-card-compact" data-debt-group="${escapeAttr(g.key)}" style="cursor:pointer;padding:12px 14px;margin-bottom:8px;border-left:3px solid ${borderColor};opacity:${allPaid ? 0.65 : 1}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap">
                <span style="font-weight:700;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(nombre)}</span>
                <span class="badge badge-info" style="font-size:0.62rem;padding:1px 6px">${g.debts.length}</span>
                ${overdueCount > 0 ? `<span class="badge badge-danger" style="font-size:0.62rem;padding:1px 6px">${overdueCount} venc</span>` : ''}
                ${allPaid ? '<span class="badge badge-success" style="font-size:0.62rem;padding:1px 6px">Pagada</span>' : ''}
              </div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:6px">${escapeHtml(acreedor)}</div>
              <div class="progress-bar" style="height:4px"><div class="progress-fill ${allPaid?'income':'expense'}" style="width:${progress}%"></div></div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:0.7rem;color:var(--text-muted)">Pendiente</div>
              <div style="font-weight:700;color:${allPaid?'var(--color-success)':'var(--color-expense)'};font-size:0.95rem">${formatMoney(pend)}</div>
              <div style="font-size:0.65rem;color:var(--text-muted)">${progress}% · ${formatMoney(pagado)}/${formatMoney(total)}</div>
            </div>
          </div>
        </div>
      `;
    };

    const compactDebtHtml = (d) => {
      const isPaid = d.estado === 'pagada';
      const isPartial = !isPaid && (parseFloat(d.montoPagado) || 0) > 0;
      const isOverdue = !isPaid && d.fechaVencimiento && d.fechaVencimiento < today;
      const total = parseFloat(d.montoTotal) || 0;
      const pagado = parseFloat(d.montoPagado) || 0;
      const progress = total > 0 ? Math.round((pagado/total)*100) : 0;
      const borderColor = isPaid ? 'var(--color-success)' : isOverdue ? 'var(--color-expense)' : isPartial ? 'var(--color-warning)' : 'var(--accent-primary)';
      const stateBadge = isPaid ? '<span class="badge badge-success" style="font-size:0.62rem;padding:1px 6px">Pagada</span>'
        : isOverdue ? '<span class="badge badge-danger" style="font-size:0.62rem;padding:1px 6px">Vencida</span>'
        : isPartial ? '<span class="badge badge-warning" style="font-size:0.62rem;padding:1px 6px">Parcial</span>'
        : '<span class="badge badge-warning" style="font-size:0.62rem;padding:1px 6px">Pendiente</span>';
      return `
        <div class="card debt-card-compact" style="padding:12px 14px;margin-bottom:8px;border-left:3px solid ${borderColor};opacity:${isPaid?0.65:1}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap">
                <span style="font-weight:700;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(d.descripcion || '')}</span>
                ${stateBadge}
              </div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:6px">${escapeHtml(d.acreedor || '')}${d.fechaVencimiento ? ' · venc ' + formatDate(d.fechaVencimiento) : ''}</div>
              <div class="progress-bar" style="height:4px"><div class="progress-fill ${isPaid?'income':'expense'}" style="width:${progress}%"></div></div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:0.7rem;color:var(--text-muted)">Pendiente</div>
              <div style="font-weight:700;color:${isPaid?'var(--color-success)':'var(--color-expense)'};font-size:0.95rem">${formatMoney(d.saldoPendiente)}</div>
              <div style="display:flex;gap:4px;justify-content:flex-end;margin-top:4px">
                ${!isPaid ? `<button class="btn-icon" data-pay-debt="${d.id}" title="Pagar" style="width:24px;height:24px">${icon('check',12)}</button>` : ''}
                <button class="btn-icon" data-edit-debt="${d.id}" title="Editar" style="width:24px;height:24px">${icon('edit',12)}</button>
                <button class="btn-icon" data-del-debt="${d.id}" title="Eliminar" style="width:24px;height:24px">${icon('trash',12)}</button>
              </div>
            </div>
          </div>
        </div>
      `;
    };

    // ---------- Datos auxiliares para filtros ----------
    const acreedoresUnicos = [...new Set(debts.map(d => d.acreedor).filter(Boolean))].sort();
    const tplsConDeudas = templates.filter(t => debts.some(d => (d.templateId || d.metadata?.templateId) === t.id));
    const archivadasCount = debts.filter(d => d.estado === 'pagada' && isArchived(d)).length;

    return `
      <div style="background:rgba(239,68,68,0.05); padding:14px 18px; border-radius:12px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; border:1px solid rgba(239,68,68,0.1)">
        <div>
          <div style="font-size:0.78rem; color:var(--text-muted)">Total en Compromisos</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--color-expense)">${formatMoney(totalPendiente)}</div>
        </div>
        <div style="font-size:1.6rem; filter:grayscale(1)">💸</div>
      </div>

      <!-- Barra de filtros -->
      <div class="card" style="padding:12px 14px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center">
        <input type="text" id="dbt-filter-search" placeholder="Buscar por nombre, acreedor o nota..." class="form-input"
          value="${escapeAttr(filters.search)}" style="flex:1;min-width:160px" />
        <select id="dbt-filter-estado" class="form-select" style="min-width:130px">
          <option value="todas"${filters.estado==='todas'?' selected':''}>Todas activas</option>
          <option value="pendientes"${filters.estado==='pendientes'?' selected':''}>Pendientes</option>
          <option value="parciales"${filters.estado==='parciales'?' selected':''}>Parciales</option>
          <option value="vencidas"${filters.estado==='vencidas'?' selected':''}>Vencidas</option>
          <option value="pagadas"${filters.estado==='pagadas'?' selected':''}>Pagadas (recientes)</option>
          <option value="archivadas"${filters.estado==='archivadas'?' selected':''}>Archivadas (${archivadasCount})</option>
        </select>
        <select id="dbt-filter-sort" class="form-select" style="min-width:140px">
          <option value="priority"${filters.sortBy==='priority'?' selected':''}>Orden: prioridad</option>
          <option value="venc"${filters.sortBy==='venc'?' selected':''}>Fecha vencimiento</option>
          <option value="ingreso"${filters.sortBy==='ingreso'?' selected':''}>Fecha de ingreso</option>
          <option value="monto"${filters.sortBy==='monto'?' selected':''}>Monto</option>
          <option value="acreedor"${filters.sortBy==='acreedor'?' selected':''}>Acreedor</option>
        </select>
        ${acreedoresUnicos.length > 0 ? `
          <select id="dbt-filter-acreedor" class="form-select" style="min-width:130px">
            <option value="">Todos los acreedores</option>
            ${acreedoresUnicos.map(a => `<option value="${escapeAttr(a)}"${norm(filters.acreedor)===norm(a)?' selected':''}>${escapeHtml(a)}</option>`).join('')}
          </select>
        ` : ''}
        ${tplsConDeudas.length > 0 ? `
          <select id="dbt-filter-tpl" class="form-select" style="min-width:130px">
            <option value="">Todas las plantillas</option>
            ${tplsConDeudas.map(t => `<option value="${t.id}"${filters.templateId===t.id?' selected':''}>${escapeHtml(t.nombre)}</option>`).join('')}
          </select>
        ` : ''}
        ${(filters.search||filters.estado!=='todas'||filters.acreedor||filters.templateId||filters.sortBy!=='priority') ?
          `<button id="dbt-filter-reset" class="btn btn-ghost btn-sm">${icon('refresh',12)} Limpiar</button>` : ''}
      </div>

      <div class="stagger-children">
        ${sortedGroups.map(compactGroupHtml).join('')}
        ${standalone.map(compactDebtHtml).join('')}
        ${(sortedGroups.length === 0 && standalone.length === 0) ? `
          <div class="empty-state card" style="padding:30px;text-align:center;color:var(--text-muted)">
            <p style="margin:0">No hay deudas que coincidan con los filtros aplicados.</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

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

    // ---------- Filtros ----------
    let searchTimer = null;
    page.querySelector('#dbt-filter-search')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const v = e.target.value;
      searchTimer = setTimeout(() => { filters.search = v; persistFilters(); render(); }, 250);
    });
    page.querySelector('#dbt-filter-estado')?.addEventListener('change', (e) => { filters.estado = e.target.value; persistFilters(); render(); });
    page.querySelector('#dbt-filter-sort')?.addEventListener('change', (e) => { filters.sortBy = e.target.value; persistFilters(); render(); });
    page.querySelector('#dbt-filter-acreedor')?.addEventListener('change', (e) => { filters.acreedor = e.target.value; persistFilters(); render(); });
    page.querySelector('#dbt-filter-tpl')?.addEventListener('change', (e) => { filters.templateId = e.target.value; persistFilters(); render(); });
    page.querySelector('#dbt-filter-reset')?.addEventListener('click', () => {
      filters.search = ''; filters.estado = 'todas'; filters.sortBy = 'priority';
      filters.acreedor = ''; filters.templateId = '';
      persistFilters(); render();
    });

    // Click en card agrupado -> ver detalle
    page.querySelectorAll('[data-debt-group]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        openDebtsGroupDetail(card.dataset.debtGroup);
      });
    });

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

      // Forma extendida — la api-client la mapea a las columnas reales del
      // backend (montoOriginal, fechaProximoPago, metadata) automaticamente.
      const data = {
        descripcion: modal.querySelector('#debt-desc').value.trim(),
        acreedor: modal.querySelector('#debt-acreedor').value.trim(),
        montoOriginal: total,
        montoTotal: total, // alias para retrocompat
        saldoPendiente: debt ? (debt.saldoPendiente || total) : total,
        montoPagado: debt ? (debt.montoPagado || 0) : 0,
        fechaProximoPago: modal.querySelector('#debt-due').value || null,
        fechaVencimiento: modal.querySelector('#debt-due').value || null,
        cuentaId: accountId,
        tarjetaId: cardId,
        notas: modal.querySelector('#debt-notes').value.trim(),
        // estado debe coincidir con valores que el backend acepta (default 'activa')
        estado: debt?.estado || 'activa',
        // mantener templateId si se edita una deuda generada desde plantilla
        templateId: debt?.templateId || debt?.metadata?.templateId || null,
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

  function openDebtsGroupDetail(groupKey) {
    const all = store.getAll('debts').map(normDebt);
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    let debts = [];
    let tpl = null;
    let title = 'Detalle';
    if (groupKey.startsWith('tpl:')) {
      const tplId = groupKey.slice(4);
      tpl = store.getById('debt_templates', tplId);
      debts = all.filter(d => (d.templateId || d.metadata?.templateId) === tplId);
      title = tpl?.nombre || 'Detalle plantilla';
    } else if (groupKey.startsWith('da:')) {
      const [desc, acr] = groupKey.slice(3).split('|');
      debts = all.filter(d => norm(d.descripcion) === desc && norm(d.acreedor) === acr);
      title = debts[0]?.descripcion || 'Detalle';
    }
    if (debts.length === 0) { showToast('warning', 'Sin deudas en este grupo'); return; }

    const total = debts.reduce((s, d) => s + (parseFloat(d.montoTotal) || 0), 0);
    const pagado = debts.reduce((s, d) => s + (parseFloat(d.montoPagado) || 0), 0);
    const pend = debts.reduce((s, d) => s + (parseFloat(d.saldoPendiente) || 0), 0);
    const today = getToday();

    const rows = debts.map(d => {
      const isPaid = d.estado === 'pagada';
      const isOverdue = d.fechaVencimiento && d.fechaVencimiento < today && !isPaid;
      return `
        <tr>
          <td style="font-size:0.82rem">${formatDate(d.fechaVencimiento || d.createdAt || '')}</td>
          <td style="font-size:0.82rem">${escapeHtml(d.descripcion || '')}</td>
          <td class="right" style="font-size:0.82rem">${formatMoney(d.montoTotal)}</td>
          <td class="right" style="font-size:0.82rem;color:var(--color-income)">${formatMoney(d.montoPagado)}</td>
          <td class="right" style="font-size:0.82rem;color:var(--color-expense)">${formatMoney(d.saldoPendiente)}</td>
          <td><span class="badge ${isPaid ? 'badge-success' : isOverdue ? 'badge-danger' : 'badge-warning'}">${isPaid ? 'Pagada' : isOverdue ? 'Vencida' : 'Pendiente'}</span></td>
          <td>
            <div style="display:flex;gap:4px;justify-content:flex-end">
              ${!isPaid ? `<button class="btn-icon" data-tpl-pay="${d.id}" title="Pagar">${icon('check', 14)}</button>` : ''}
              <button class="btn-icon" data-tpl-edit="${d.id}" title="Editar">${icon('edit', 14)}</button>
              <button class="btn-icon" data-tpl-del="${d.id}" title="Eliminar">${icon('trash', 14)}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const pendientesCount = debts.filter(d => d.estado !== 'pagada').length;
    const modal = openModal(title, `
      <div style="margin-bottom:16px">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
          <div><div style="font-size:0.7rem;color:var(--text-muted)">Registros</div><div style="font-weight:700;font-size:1.05rem">${debts.length}</div></div>
          <div><div style="font-size:0.7rem;color:var(--text-muted)">Total</div><div style="font-weight:700;font-size:1.05rem">${formatMoney(total)}</div></div>
          <div><div style="font-size:0.7rem;color:var(--text-muted)">Pagado</div><div style="font-weight:700;font-size:1.05rem;color:var(--color-income)">${formatMoney(pagado)}</div></div>
          <div><div style="font-size:0.7rem;color:var(--text-muted)">Pendiente</div><div style="font-weight:700;font-size:1.05rem;color:var(--color-expense)">${formatMoney(pend)}</div></div>
        </div>
      </div>

      ${pend > 0 ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <button id="grp-pay-all" class="btn btn-primary btn-sm">${icon('check', 14)} Pagar ${pendientesCount} ${pendientesCount === 1 ? 'registro pendiente' : 'registros pendientes'} (${formatMoney(pend)})</button>
          <button id="grp-pay-count" class="btn btn-secondary btn-sm">${icon('check', 14)} Pagar N registros</button>
          <button id="grp-pay-amount" class="btn btn-secondary btn-sm">${icon('dollarSign', 14)} Abono parcial</button>
        </div>
        <p style="font-size:0.72rem;color:var(--text-muted);margin:0 0 16px">Solo se descuentan registros con saldo &gt; 0. Los que ya estan en estado 'pagada' no se debitan de nuevo.</p>
      ` : ''}

      <div class="table-container">
        <table class="data-table" style="font-size:0.85rem">
          <thead><tr><th>Fecha</th><th>Descripción</th><th class="right">Total</th><th class="right">Pagado</th><th class="right">Pendiente</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `, { width: '780px' });

    modal.querySelector('#grp-pay-all')?.addEventListener('click', () => {
      closeModal();
      openPayGroupModal({ groupKey, mode: 'all', defaultAmount: pend, pendientesCount });
    });
    modal.querySelector('#grp-pay-count')?.addEventListener('click', () => {
      closeModal();
      openPayGroupModal({ groupKey, mode: 'count', defaultAmount: pend, pendientesCount });
    });
    modal.querySelector('#grp-pay-amount')?.addEventListener('click', () => {
      closeModal();
      openPayGroupModal({ groupKey, mode: 'amount', defaultAmount: pend, pendientesCount });
    });

    modal.querySelectorAll('[data-tpl-edit]').forEach(b => b.addEventListener('click', () => {
      const d = store.getById('debts', b.dataset.tplEdit);
      if (d) { closeModal(); openDebtModal(normDebt(d)); }
    }));
    modal.querySelectorAll('[data-tpl-del]').forEach(b => b.addEventListener('click', async () => {
      if (await confirmDialog('¿Eliminar esta deuda?', 'Solo elimina este registro, no la plantilla.')) {
        store.remove('debts', b.dataset.tplDel);
        showToast('success', 'Deuda eliminada');
        closeModal();
        render();
      }
    }));
    modal.querySelectorAll('[data-tpl-pay]').forEach(b => b.addEventListener('click', () => {
      const d = store.getById('debts', b.dataset.tplPay);
      if (d) { closeModal(); openPayModal(normDebt(d)); }
    }));
  }

  // ---------- Pago de grupo (todo / N registros / monto custom) ----------
  function openPayGroupModal({ groupKey, mode, defaultAmount, pendientesCount }) {
    const accounts = store.getAll('accounts').filter(a => a.activa !== false);
    const banks = store.getAll('banks');
    const accountOptionsHtml = accounts.map(a => {
      const b = banks.find(x => x.id === a.bancoId);
      return `<option value="${a.id}">${b?.nombre ? b.nombre + ' — ' : ''}${a.nombre}</option>`;
    }).join('');

    const titleByMode = {
      all: 'Pagar todo lo adeudado',
      count: 'Pagar N registros',
      amount: 'Abono parcial',
    };

    const modeBlockHtml = (() => {
      if (mode === 'all') {
        return `
          <div class="form-group">
            <label class="form-label">Monto a pagar</label>
            <div class="input-prefix-wrapper"><span class="input-prefix">RD$</span>
              <input type="number" class="form-input" id="pgrp-amount" value="${defaultAmount.toFixed(2)}" readonly />
            </div>
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">Cubre los ${pendientesCount} registros pendientes.</p>
          </div>
        `;
      }
      if (mode === 'count') {
        return `
          <div class="form-group">
            <label class="form-label">Cantidad de registros a pagar (1 a ${pendientesCount})</label>
            <input type="number" class="form-input" id="pgrp-count" value="1" min="1" max="${pendientesCount}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Monto calculado</label>
            <div class="input-prefix-wrapper"><span class="input-prefix">RD$</span>
              <input type="number" class="form-input" id="pgrp-amount" value="0" readonly />
            </div>
          </div>
        `;
      }
      // mode === 'amount'
      return `
        <div class="form-group">
          <label class="form-label">Monto a abonar <span class="required">*</span></label>
          <div class="input-prefix-wrapper"><span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="pgrp-amount" value="" step="0.01" min="0.01" max="${defaultAmount.toFixed(2)}" required placeholder="0.00" />
          </div>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">Maximo: ${formatMoney(defaultAmount)} (total pendiente del grupo).</p>
        </div>
      `;
    })();

    const modal = openModal(titleByMode[mode] || 'Pagar grupo', `
      <form id="pay-group-form">
        <div class="form-group">
          <label class="form-label">Cuenta de origen <span class="required">*</span></label>
          <select class="form-select" id="pgrp-account" required>
            <option value="">Selecciona la cuenta</option>
            ${accountOptionsHtml}
          </select>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">El monto se debitara de esta cuenta y se registrara como gasto.</p>
        </div>
        ${modeBlockHtml}
        <div class="form-group">
          <label class="form-label">Notas (opcional)</label>
          <textarea class="form-textarea" id="pgrp-notes" placeholder="Nota interna sobre este pago..."></textarea>
        </div>
        <div class="form-actions" style="margin-top:18px">
          <button type="button" class="btn btn-secondary" id="pgrp-cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">${icon('check', 16)} Confirmar pago</button>
        </div>
      </form>
    `);

    // Calculo automatico para mode=count
    const debtsAll = (() => {
      const all = store.getAll('debts').map(normDebt);
      const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      if (groupKey?.startsWith('tpl:')) {
        const id = groupKey.slice(4);
        return all.filter(d => (d.templateId || d.metadata?.templateId) === id);
      }
      if (groupKey?.startsWith('da:')) {
        const [desc, acr] = groupKey.slice(3).split('|');
        return all.filter(d => norm(d.descripcion) === desc && norm(d.acreedor) === acr);
      }
      return [];
    })();
    const pendientes = debtsAll
      .filter(d => d.estado !== 'pagada')
      .sort((a, b) => (a.fechaVencimiento || '').localeCompare(b.fechaVencimiento || ''));

    if (mode === 'count') {
      const countInput = modal.querySelector('#pgrp-count');
      const amountInput = modal.querySelector('#pgrp-amount');
      const sync = () => {
        const n = Math.max(1, Math.min(pendientesCount, parseInt(countInput.value, 10) || 1));
        const sum = pendientes.slice(0, n).reduce((s, d) => s + (parseFloat(d.saldoPendiente) || 0), 0);
        amountInput.value = sum.toFixed(2);
      };
      countInput.addEventListener('input', sync);
      sync();
    }

    modal.querySelector('#pgrp-cancel').addEventListener('click', () => closeModal());
    modal.querySelector('#pay-group-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const accountId = modal.querySelector('#pgrp-account').value;
      const amountToApply = parseFloat(modal.querySelector('#pgrp-amount').value) || 0;
      const notes = modal.querySelector('#pgrp-notes').value.trim();
      if (!accountId) { showToast('error', 'Selecciona la cuenta de origen'); return; }
      if (amountToApply <= 0) { showToast('error', 'Monto invalido'); return; }

      // ---------- Distribuir el pago entre las deudas pendientes ----------
      // Estrategia: ir consumiendo deudas en orden (oldest first) hasta agotar
      // el monto. La ultima deuda puede quedar parcialmente pagada.
      let remaining = amountToApply;
      const updates = [];
      for (const d of pendientes) {
        if (remaining <= 0) break;
        const saldo = parseFloat(d.saldoPendiente) || 0;
        const apply = Math.min(remaining, saldo);
        if (apply <= 0) continue;
        const newPagado = (parseFloat(d.montoPagado) || 0) + apply;
        const newSaldo = +(saldo - apply).toFixed(2);
        updates.push({
          id: d.id,
          montoPagado: +newPagado.toFixed(2),
          saldoPendiente: newSaldo,
          estado: newSaldo <= 0.001 ? 'pagada' : (d.estado || 'activa'),
        });
        remaining -= apply;
      }

      if (updates.length === 0) { showToast('error', 'Nada que pagar'); return; }

      // Buscar categoria 'Pago de Deudas' (UUID real, no hardcoded)
      const cats = store.getAll('categories');
      const debtCat = cats.find(c => /pago.*deud/i.test(c.nombre || '')) || cats.find(c => c.nombre === 'Pago de Deudas');
      const tpl = groupKey?.startsWith('tpl:') ? store.getById('debt_templates', groupKey.slice(4)) : null;
      const concepto = tpl?.nombre || debtsAll[0]?.descripcion || 'Grupo de deudas';

      // 1. Registrar UNA transaccion gasto que debita la cuenta
      store.add('transactions', {
        tipo: 'gasto',
        monto: +(amountToApply).toFixed(2),
        descripcion: `Pago grupo: ${concepto}`,
        categoriaId: debtCat?.id || null,
        cuentaId: accountId,
        tarjetaId: null,
        fecha: new Date().toISOString().split('T')[0],
        notas: notes || `Pago aplicado a ${updates.length} ${updates.length === 1 ? 'registro' : 'registros'}`,
      });

      // 2. Actualizar las deudas afectadas — guarda paidAt para auto-archive
      const nowIso = new Date().toISOString();
      updates.forEach(u => {
        const patch = {
          montoPagado: u.montoPagado,
          saldoPendiente: u.saldoPendiente,
          estado: u.estado,
        };
        if (u.estado === 'pagada') patch.paidAt = nowIso;
        store.update('debts', u.id, patch);
      });

      const totalRecords = updates.length;
      const fullyPaid = updates.filter(u => u.estado === 'pagada').length;
      showToast('success',
        'Pago aplicado',
        `${formatMoney(amountToApply)} debitado · ${fullyPaid} ${fullyPaid === 1 ? 'deuda saldada' : 'deudas saldadas'}, ${totalRecords - fullyPaid} parcial${(totalRecords - fullyPaid) === 1 ? '' : 'es'}`
      );
      closeModal();
      render();
      // Reabrir el detalle del grupo para que el usuario vea el avance
      setTimeout(() => openDebtsGroupDetail(groupKey), 100);
    });
  }

  function createDebtFromTemplate(tpl) {
    // Cada vez que el usuario clica "Usar" sobre una plantilla, registramos
    // UNA deuda con monto = tpl.monto. La plantilla solo es la metadata
    // que las agrupa en el tab "Activas".
    const monto = parseFloat(tpl.monto) || 0;
    const data = {
      descripcion: tpl.nombre,
      acreedor: tpl.acreedor,
      montoOriginal: monto,
      montoTotal: monto,
      saldoPendiente: monto,
      montoPagado: 0,
      fechaProximoPago: getToday(),
      fechaVencimiento: getToday(),
      estado: 'activa',
      templateId: tpl.id,
      templateNombre: tpl.nombre,
    };
    store.add('debts', data);
    showToast('success', '🤖 Deuda generada desde plantilla');
    activeTabValue = 'activas'; render();
  }

  render();

  // Re-render cuando cambien las colecciones que la pagina usa.
  // Esto cubre el caso de la reconciliacion del backend: optimistic write
  // crea un debt con id local, luego el backend asigna su UUID real,
  // _processQueue actualiza la cache y notifica. Sin esta subscripcion los
  // botones del DOM se quedan apuntando al id viejo y "editar" no abre nada.
  // Auto-unsubscribe cuando el nodo de la pagina se quita del DOM.
  const offDebts = store.on('debts', () => {
    if (!document.body.contains(page)) { offDebts(); return; }
    render();
  });
  const offTpls = store.on('debt_templates', () => {
    if (!document.body.contains(page)) { offTpls(); return; }
    render();
  });

  return page;
}
