// ============================================
// Transaction History — Modal reutilizable para ver
// los movimientos asociados a una cuenta o tarjeta.
// ============================================
import store from './store.js';
import { formatMoney, formatDate } from './utils.js';
import { getCategoryById } from './categories.js';
import { openModal } from './components.js';
import { icon } from './icons.js';

/**
 * Abre un modal con el historial de transacciones para una cuenta o tarjeta.
 * @param {Object} opts
 * @param {string} opts.title - Título del modal
 * @param {{ type: 'account'|'card', id: string }} opts.scope - Filtro
 */
export function openTransactionHistory({ title, scope }) {
  const allTx = store.getAll('transactions');

  let filtered = [];
  if (scope.type === 'account') {
    filtered = allTx.filter(tx => tx.cuentaId === scope.id || tx.cuentaDestinoId === scope.id);
  } else if (scope.type === 'card') {
    filtered = allTx.filter(tx => tx.tarjetaId === scope.id);
  }

  // Ordenar por fecha desc (más reciente primero)
  filtered.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  // Totales para resumen
  let totalIn = 0, totalOut = 0;
  filtered.forEach(tx => {
    const monto = parseFloat(tx.monto) || 0;
    const isIngreso = tx.tipo === 'ingreso';
    const isTransfer = tx.tipo === 'transferencia';
    if (scope.type === 'account' && isTransfer) {
      if (tx.cuentaDestinoId === scope.id) totalIn += monto;
      else totalOut += monto;
    } else if (isIngreso) {
      totalIn += monto;
    } else {
      totalOut += monto;
    }
  });

  const body = filtered.length === 0
    ? `<div style="text-align:center;padding:40px 20px;color:var(--text-secondary)">
         <div style="opacity:0.5;margin-bottom:12px">${icon('fileText', 56)}</div>
         <h3 style="margin:0 0 6px;color:var(--text-primary)">Sin movimientos</h3>
         <p style="margin:0;font-size:0.9rem">Todavía no hay transacciones registradas para este ${scope.type === 'card' ? 'tarjeta' : 'cuenta'}.</p>
       </div>`
    : `
      <div style="display:flex;gap:12px;margin-bottom:16px">
        <div style="flex:1;padding:12px;background:var(--bg-card);border-radius:var(--radius-sm);border-left:3px solid var(--color-income)">
          <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px">Entradas</div>
          <div style="font-weight:700;color:var(--color-income);font-size:1.1rem">+${formatMoney(totalIn)}</div>
        </div>
        <div style="flex:1;padding:12px;background:var(--bg-card);border-radius:var(--radius-sm);border-left:3px solid var(--color-expense)">
          <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px">Salidas</div>
          <div style="font-weight:700;color:var(--color-expense);font-size:1.1rem">-${formatMoney(totalOut)}</div>
        </div>
        <div style="flex:1;padding:12px;background:var(--bg-card);border-radius:var(--radius-sm);border-left:3px solid var(--accent-primary)">
          <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px">Movimientos</div>
          <div style="font-weight:700;color:var(--text-primary);font-size:1.1rem">${filtered.length}</div>
        </div>
      </div>
      <div class="table-container" style="max-height:55vh;overflow-y:auto">
        <table class="data-table" style="margin:0">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th>Tipo</th>
              <th class="right">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(tx => {
              const cat = tx.categoriaId ? getCategoryById(tx.categoriaId) : null;
              const isIngreso = tx.tipo === 'ingreso';
              const isTransfer = tx.tipo === 'transferencia';
              const monto = parseFloat(tx.monto) || 0;

              // Determinar signo y color según el contexto
              let sign = '+';
              let cls = 'income';
              let badgeCls = 'badge-success';
              let tipoLabel = 'Ingreso';

              if (isTransfer) {
                badgeCls = 'badge-neutral';
                tipoLabel = 'Transf.';
                if (scope.type === 'account' && tx.cuentaDestinoId === scope.id) {
                  sign = '+'; cls = 'income';
                } else {
                  sign = '-'; cls = 'expense';
                }
              } else if (!isIngreso) {
                sign = '-'; cls = 'expense';
                badgeCls = 'badge-danger';
                tipoLabel = 'Gasto';
              }

              return `
                <tr>
                  <td style="white-space:nowrap;color:var(--text-secondary);font-size:0.85rem">${formatDate(tx.fecha)}</td>
                  <td><strong style="color:var(--text-primary)">${escapeHtml(tx.descripcion || '—')}</strong></td>
                  <td style="color:var(--text-secondary);font-size:0.85rem">${escapeHtml(cat?.nombre || '—')}</td>
                  <td><span class="badge ${badgeCls}">${tipoLabel}</span></td>
                  <td class="right cell-amount ${cls}">${sign}${formatMoney(monto)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:12px;font-size:0.75rem;color:var(--text-muted);text-align:center">
        Para editar o eliminar un movimiento, ve a la sección <strong>Transacciones</strong>.
      </div>
    `;

  openModal(title, body, { width: '780px' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
