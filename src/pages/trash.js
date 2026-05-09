// ============================================================
// Trash / Papelera — items soft-deleted del workspace
// Permite restaurar items individuales o vaciar la papelera entera.
// Items con > 30 dias en papelera se purgan automaticamente via cron.
// ============================================================
import { trash } from '../api-client.js';
import { icon } from '../icons.js';
import { showToast, confirmDialog } from '../components.js';
import { formatDate, formatMoney } from '../utils.js';

// Mapeo tabla -> resource path (kebab) para llamadas restore/delete-hard
const TABLE_TO_PATH = {
  transactions: 'transactions',
  debts: 'debts',
  debt_payments: 'debt-payments',
  debt_templates: 'debt-templates',
  loans: 'loans',
  loan_payments: 'loan-payments',
  subscriptions: 'subscriptions',
  subscription_charges: 'subscription-charges',
  receivables: 'receivables',
  payables: 'payables',
  goals: 'goals',
  goal_contributions: 'goal-contributions',
  notes: 'notes',
  beneficiaries: 'beneficiaries',
  banks: 'banks',
  accounts: 'accounts',
  cards: 'cards',
  external_cards: 'external-cards',
  categories: 'categories',
};

const TABLE_LABELS = {
  transactions: 'Transacciones',
  debts: 'Deudas',
  debt_payments: 'Pagos de deuda',
  debt_templates: 'Plantillas de deuda',
  loans: 'Préstamos',
  loan_payments: 'Pagos de préstamo',
  subscriptions: 'Suscripciones',
  subscription_charges: 'Cargos de suscripción',
  receivables: 'Cuentas por cobrar',
  payables: 'Cuentas por pagar',
  goals: 'Metas',
  goal_contributions: 'Aportes a metas',
  notes: 'Notas',
  beneficiaries: 'Beneficiarios',
  banks: 'Bancos',
  accounts: 'Cuentas',
  cards: 'Tarjetas',
  external_cards: 'Tarjetas externas',
  categories: 'Categorías',
};

const TABLE_ICONS = {
  transactions: 'transaction',
  debts: 'handCoins',
  loans: 'bank',
  subscriptions: 'subscription',
  receivables: 'arrowDown',
  payables: 'arrowUp',
  goals: 'goal',
  notes: 'fileText',
  banks: 'bank',
  accounts: 'bank',
  cards: 'creditCard',
  external_cards: 'creditCard',
  categories: 'category',
};

// Resumen humano de un row (descripcion + monto/total) para mostrarlo
// en la tabla. Cada tabla tiene su propio par de campos.
function rowSummary(table, row) {
  const m = (v) => formatMoney(v);
  switch (table) {
    case 'transactions':
      return { label: row.descripcion || row.tipo || '—', amount: m(row.monto), date: row.fecha };
    case 'debts':
      return { label: row.acreedor || '—', amount: m(row.monto_original ?? row.saldo_pendiente), date: row.fecha_proximo_pago };
    case 'debt_payments':
      return { label: 'Pago', amount: m(row.monto), date: row.fecha };
    case 'debt_templates':
      return { label: row.nombre || '—' };
    case 'loans':
      return { label: row.deudor || '—', amount: m(row.monto_original) };
    case 'loan_payments':
      return { label: 'Pago préstamo', amount: m(row.monto), date: row.fecha };
    case 'subscriptions':
      return { label: row.nombre || '—', amount: m(row.monto) };
    case 'subscription_charges':
      return { label: 'Cargo', amount: m(row.monto), date: row.fecha };
    case 'receivables':
      return { label: row.cliente || '—', amount: m(row.monto), date: row.fecha_venc };
    case 'payables':
      return { label: row.acreedor || '—', amount: m(row.monto), date: row.fecha_venc };
    case 'goals':
      return { label: row.nombre || '—', amount: m(row.monto_objetivo) };
    case 'goal_contributions':
      return { label: 'Aporte', amount: m(row.monto), date: row.fecha };
    case 'notes':
      return { label: row.titulo || '(sin título)' };
    case 'beneficiaries':
      return { label: row.nombre || '—' };
    case 'banks':
    case 'accounts':
    case 'cards':
    case 'external_cards':
    case 'categories':
      return { label: row.nombre || '—' };
    default:
      return { label: '—' };
  }
}

export default function renderTrash() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  let data = {}; // { table: [rows] }
  let loading = true;
  let error = null;

  const fetch = async () => {
    loading = true; error = null; render();
    try {
      const r = await trash.list();
      data = r.data || {};
    } catch (e) {
      error = e?.message || 'Error cargando papelera';
      data = {};
    }
    loading = false;
    render();
  };

  const render = () => {
    const tables = Object.keys(data);
    const totalCount = tables.reduce((s, t) => s + data[t].length, 0);
    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>${icon('trash', 22)} Papelera</h1>
          <p>Items eliminados — se purgan automáticamente después de 30 días.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost" id="trash-refresh">${icon('refresh', 14)} Refrescar</button>
          ${totalCount > 0 ? `<button class="btn btn-danger" id="trash-empty">${icon('trash', 14)} Vaciar todo</button>` : ''}
        </div>
      </div>

      ${loading ? `<div class="card" style="padding:40px;text-align:center;color:var(--text-muted)">Cargando...</div>` : ''}
      ${error ? `<div class="card" style="padding:30px;text-align:center;color:var(--color-expense)">${error}</div>` : ''}

      ${!loading && !error && totalCount === 0 ? `
        <div class="empty-state card" style="padding:50px;text-align:center">
          ${icon('trash', 64)}
          <h3 style="margin-top:14px">Papelera vacía</h3>
          <p style="color:var(--text-muted)">Cuando elimines algo, aparecerá aquí. Tienes 30 días para restaurarlo.</p>
        </div>
      ` : ''}

      ${!loading && !error && totalCount > 0 ? `
        <div style="display:flex;flex-direction:column;gap:18px">
          ${tables.map(tbl => renderTable(tbl, data[tbl])).join('')}
        </div>
      ` : ''}
    `;
    wireEvents();
  };

  const renderTable = (table, rows) => {
    const label = TABLE_LABELS[table] || table;
    const ic = TABLE_ICONS[table] || 'fileText';
    return `
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
          ${icon(ic, 18)}
          <h3 style="margin:0;font-size:1rem">${label}</h3>
          <span class="badge" style="font-size:0.7rem">${rows.length}</span>
        </div>
        <table class="data-table" style="margin:0;font-size:0.86rem">
          <thead>
            <tr>
              <th>Descripción</th>
              <th class="right">Monto</th>
              <th>Fecha original</th>
              <th>Eliminado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => {
              const s = rowSummary(table, r);
              return `
                <tr>
                  <td>${escapeHtml(s.label)}</td>
                  <td class="right">${s.amount || '—'}</td>
                  <td style="color:var(--text-muted)">${s.date ? formatDate(s.date) : '—'}</td>
                  <td style="color:var(--text-muted)">${formatDate(r.deleted_at)}</td>
                  <td>
                    <div style="display:flex;gap:4px;justify-content:flex-end">
                      <button class="btn-icon" data-restore="${table}|${r.id}" title="Restaurar" style="color:var(--color-income)">${icon('check', 14)}</button>
                      <button class="btn-icon" data-purge="${table}|${r.id}" title="Borrar definitivamente" style="color:var(--color-expense)">${icon('trash', 14)}</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const wireEvents = () => {
    page.querySelector('#trash-refresh')?.addEventListener('click', fetch);
    page.querySelector('#trash-empty')?.addEventListener('click', async () => {
      const ok = await confirmDialog('¿Vaciar la papelera por completo?', 'Esta acción es PERMANENTE y borra todos los items definitivamente. No se puede deshacer.');
      if (!ok) return;
      try {
        const r = await trash.empty();
        showToast('success', 'Papelera vaciada', `${r.removed || 0} items eliminados definitivamente`);
        fetch();
      } catch (e) { showToast('error', e?.message || 'Error'); }
    });

    page.querySelectorAll('[data-restore]').forEach(btn => btn.addEventListener('click', async () => {
      const [table, id] = btn.dataset.restore.split('|');
      const path = TABLE_TO_PATH[table];
      if (!path) { showToast('error', 'Tipo desconocido'); return; }
      try {
        await trash.restore(path, id);
        showToast('success', 'Item restaurado');
        fetch();
      } catch (e) { showToast('error', e?.message || 'Error'); }
    }));

    page.querySelectorAll('[data-purge]').forEach(btn => btn.addEventListener('click', async () => {
      const [table, id] = btn.dataset.purge.split('|');
      const path = TABLE_TO_PATH[table];
      if (!path) { showToast('error', 'Tipo desconocido'); return; }
      const ok = await confirmDialog('¿Borrar definitivamente?', 'Este item se eliminará para siempre, no se puede recuperar.');
      if (!ok) return;
      try {
        await trash.hardDelete(path, id);
        showToast('success', 'Borrado definitivamente');
        fetch();
      } catch (e) { showToast('error', e?.message || 'Error'); }
    }));
  };

  fetch();
  return page;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
