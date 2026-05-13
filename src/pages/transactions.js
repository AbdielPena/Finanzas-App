// ============================================
// Transactions Page — Income/Expense/Transfers
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { generateId, formatMoney, formatDate, getToday, aiBadge } from '../utils.js';
import { openModal, closeModal, showToast, confirmDialog, emptyState } from '../components.js';
import { getCategoryOptions, getCategoryById } from '../categories.js';
import { enforceLimit } from '../plans_engine.js';
import {
  getAllBeneficiarios,
  upsertBeneficiarioByName,
  calcSplitRemainder,
  splitEqual,
} from '../beneficiaries.js';

function getAccountOptions(selectedId = '') {
  const accounts = store.getAll('accounts').filter(a => a.activa !== false);
  const banks = store.getAll('banks');
  return accounts.map(a => {
    const bank = banks.find(b => b.id === a.bancoId);
    return `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${bank?.nombre || ''} - ${a.nombre}</option>`;
  }).join('');
}

function getCardOptions(selectedId = '') {
  const cards = store.getAll('cards').filter(c => c.activa !== false);
  return cards.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.nombre}</option>`).join('');
}

function txForm(tx = null) {
  const tipo = tx?.tipo || 'gasto';
  return `
    <form id="tx-form">
      <div class="tabs" id="tx-type-tabs">
        <div class="tab ${tipo === 'ingreso' ? 'active' : ''}" data-tipo="ingreso">Ingreso</div>
        <div class="tab ${tipo === 'gasto' ? 'active' : ''}" data-tipo="gasto">Gasto</div>
        <div class="tab ${tipo === 'transferencia' ? 'active' : ''}" data-tipo="transferencia">Transferencia</div>
      </div>
      <input type="hidden" id="tx-tipo" value="${tipo}" />
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="tx-amount" value="${tx?.monto || ''}" step="0.01" required placeholder="0.00" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha <span class="required">*</span></label>
          <input type="date" class="form-input" id="tx-date" value="${tx?.fecha || getToday()}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción <span class="required">*</span></label>
        <input type="text" class="form-input" id="tx-desc" value="${tx?.descripcion || ''}" placeholder="¿En qué se usó o de dónde vino?" required />
      </div>
      <!-- Clasificación de Ingreso (solo visible cuando tipo=ingreso) -->
      <div class="form-group" id="tx-income-type-group" style="display:${tipo === 'ingreso' ? 'block' : 'none'}">
        <label class="form-label" style="position:static;display:block;margin-bottom:8px;font-size:0.78rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--accent-primary)">Tipo de Ingreso</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px" id="income-type-chips">
          ${[
            { val: 'personal',  label: 'Personal',          emoji: '👤' },
            { val: 'cliente',   label: 'Cliente / Proyecto', emoji: '🏢' },
            { val: 'salario',   label: 'Salario / Nómina',  emoji: '💼' },
            { val: 'prestamo',  label: 'Préstamo Recibido',  emoji: '🏦' },
            { val: 'otro',      label: 'Otro',               emoji: '📦' },
          ].map(opt => `
            <button type="button" class="btn btn-sm income-type-chip ${
              (tx?.tipoIngreso || 'personal') === opt.val ? 'btn-primary' : 'btn-secondary'
            }" data-income-type="${opt.val}" style="gap:4px">
              ${opt.emoji} ${opt.label}
            </button>
          `).join('')}
        </div>
        <input type="hidden" id="tx-income-type" value="${tx?.tipoIngreso || 'personal'}" />
        <div id="income-type-hint" style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">
          ${(tx?.tipoIngreso || 'personal') === 'prestamo' ? '⚠️ Los préstamos recibidos <strong>no cuentan</strong> para el cálculo del 10%.' : 'ℹ️ Este ingreso se sumará a la base del 10% según la opción marcada abajo.'}
        </div>
      </div>
      <div class="form-group" id="tx-client-group">
        <label class="form-label" style="color:var(--text-accent)">Asociar a Cliente / Proyecto (Opcional)</label>
        <input type="text" class="form-input" id="tx-client" value="${tx?.clienteAsociado || ''}" placeholder="Ej: Empresa S.A., Pedro Moreno..." list="client-list" autocomplete="off" />
        <datalist id="client-list">
          ${Array.from(new Set(store.getAll('transactions').map(t => t.clienteAsociado).filter(Boolean))).map(c => `<option value="${c}">`).join('')}
        </datalist>
      </div>
      <div class="form-group" id="tx-category-group">
        <label class="form-label">Categoría</label>
        <select class="form-select" id="tx-category">
          <option value="">Seleccionar categoría</option>
          ${getCategoryOptions(tipo, tx?.categoriaId || '')}
        </select>
      </div>
      <div class="form-group" id="tx-account-group">
        <label class="form-label" id="tx-account-label">${tipo === 'ingreso' ? 'Cuenta Destino' : 'Cuenta Origen'} <span class="required">*</span></label>
        <select class="form-select" id="tx-account" required>
          <option value="">Seleccionar cuenta</option>
          ${getAccountOptions(tx?.cuentaId)}
        </select>
      </div>
      <div class="form-group" id="tx-card-group" style="display:${tipo === 'gasto' ? 'block' : 'none'}">
        <label class="form-label">O usar Tarjeta de Crédito</label>
        <select class="form-select" id="tx-card">
          <option value="">No usar tarjeta</option>
          ${getCardOptions(tx?.tarjetaId)}
        </select>
      </div>
      <div class="form-group" id="tx-dest-group" style="display:${tipo === 'transferencia' ? 'block' : 'none'}">
        <label class="form-label">Cuenta Destino <span class="required">*</span></label>
        <select class="form-select" id="tx-dest">
          <option value="">Seleccionar cuenta destino</option>
          ${getAccountOptions(tx?.cuentaDestinoId)}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea class="form-textarea" id="tx-notes" placeholder="Notas adicionales...">${tx?.notas || ''}</textarea>
      </div>

      <!-- Beneficiarios -->
      <div class="beneficiary-block" id="tx-benef-block">
        <div class="beneficiary-head">
          <div class="beneficiary-head-title">${icon('users', 14)} Beneficiarios</div>
          <span class="beneficiary-split-status" id="tx-benef-status">—</span>
        </div>
        <div class="beneficiary-head-hint">Opcional · divide este monto entre una o varias personas.</div>
        <div class="beneficiary-list" id="tx-benef-list"></div>
        <div class="beneficiary-actions">
          <div class="actions-left">
            <button type="button" class="btn btn-secondary btn-sm" id="tx-benef-add">${icon('plus', 12)} Añadir</button>
            <button type="button" class="btn btn-ghost btn-sm" id="tx-benef-split-eq">Dividir equitativo</button>
          </div>
          <div class="actions-right">
            <button type="button" class="btn btn-ghost btn-sm" id="tx-benef-clear">Limpiar</button>
          </div>
        </div>
      </div>

      <div class="form-group" id="tx-diezmo-group" style="display:${tipo !== 'gasto' ? 'block' : 'none'}; padding: 12px; background: var(--bg-input); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="tx-diezmo" ${tx ? (tx.aplicaDiezmo !== false ? 'checked' : '') : (tipo === 'ingreso' ? 'checked' : '')} />
          <span style="font-weight:500;font-size:0.9rem">Sumar al cálculo del 10% (Diezmo)</span>
        </label>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;padding-left:24px">Si marcas esta opción, el monto se sumará a los ingresos del mes para el cálculo del 10%.</div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check', 18)} ${tx ? 'Guardar' : 'Registrar'}</button>
      </div>
    </form>
  `;
}

export default function renderTransactions() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  let filterType  = 'todos';
  let filterEstado = 'todos'; // 'todos' | 'hold' | 'activo'
  let searchQuery  = '';
  let viewMode     = 'lista'; // 'lista' | 'por-banco'

  const render = () => {
    let allTxs = store.getAll('transactions');
    const holdTxs = allTxs.filter(t => t.estado === 'hold');

    // Main list includes hold — they appear with a badge
    let txs = [...allTxs].sort((a, b) => {
      // 1. Prioridad: Fecha de la transacción (YYYY-MM-DD)
      const dateA = a.fecha || (a.createdAt ? a.createdAt.split('T')[0] : '0000-00-00');
      const dateB = b.fecha || (b.createdAt ? b.createdAt.split('T')[0] : '0000-00-00');

      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // Descendente por fecha
      }

      // 2. Desempate: Hora de creación (createdAt)
      const timeA = a.createdAt || '';
      const timeB = b.createdAt || '';
      return timeB.localeCompare(timeA); // Descendente por hora
    });

    if (filterType !== 'todos')   txs = txs.filter(t => t.tipo === filterType);
    if (filterEstado === 'hold')  txs = txs.filter(t => t.estado === 'hold');
    if (filterEstado === 'activo') txs = txs.filter(t => t.estado !== 'hold');
    if (searchQuery) txs = txs.filter(t =>
      (t.descripcion || '').toLowerCase().includes(searchQuery) ||
      (t.notas || '').toLowerCase().includes(searchQuery)
    );

    const accounts = store.getAll('accounts').filter(a => a.activa !== false);
    const banks = store.getAll('banks');
    const cards = store.getAll('cards').filter(c => c.activa !== false);

    const accountOpts = [
      '<option value="">— Cuenta —</option>',
      ...accounts.map(a => {
        const bank = banks.find(b => b.id === a.bancoId);
        return `<option value="acc:${a.id}">${bank?.nombre || ''} - ${a.nombre}</option>`;
      }),
      '<option disabled>──────</option>',
      ...cards.map(c => `<option value="card:${c.id}">💳 ${c.nombre}</option>`)
    ].join('');

    const totalIncome = allTxs.filter(t => t.tipo === 'ingreso' && t.estado !== 'hold').reduce((s, t) => s + (parseFloat(t.monto) || 0), 0);
    const totalExpense = allTxs.filter(t => t.tipo === 'gasto' && t.estado !== 'hold').reduce((s, t) => s + (parseFloat(t.monto) || 0), 0);

    // Banner de Hold Transactions
    const holdBanner = holdTxs.length > 0 ? `
      <div style="background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06)); border: 1px solid rgba(245,158,11,0.4); border-radius: 14px; padding: 16px; margin-bottom: 20px">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px">
          <span style="font-size:1.2rem">⏳</span>
          <div>
            <div style="font-weight:700; color: #f59e0b">${holdTxs.length} Transacción${holdTxs.length > 1 ? 'es' : ''} pendiente${holdTxs.length > 1 ? 's' : ''} de asignación</div>
            <div style="font-size:0.78rem; color:var(--text-secondary)">Registradas por FinanzBot — asigna una cuenta o tarjeta para contabilizarlas</div>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px">
          ${holdTxs.map(tx => `
            <div style="background:var(--bg-card); border-radius:10px; padding:10px 14px; display:flex; align-items:center; gap:12px; flex-wrap:wrap">
              <div style="flex:1; min-width:180px">
                <div style="font-weight:600; font-size:0.9rem">${tx.descripcion}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary)">${tx.tipo} • ${tx.fecha}</div>
              </div>
              <div style="font-weight:700; font-size:1rem; color:${tx.tipo === 'ingreso' ? 'var(--color-income)' : 'var(--color-expense)'}">
                ${tx.tipo === 'ingreso' ? '+' : '-'}${formatMoney(tx.monto)}
              </div>
              <select class="form-select hold-assign" data-tx-id="${tx.id}" style="max-width:220px; font-size:0.82rem">
                ${accountOpts}
              </select>
              <button class="btn btn-danger" data-del-hold="${tx.id}" style="padding:6px 10px; font-size:0.8rem">${icon('trash', 14)}</button>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Transacciones</h1>
          <p>${txs.length} registro${txs.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-tx-btn">${icon('plus', 18)} Nueva Transacción</button>
        </div>
      </div>

      <div class="summary-strip">
        <div class="summary-strip-item">
          <div class="ss-label">Ingresos totales</div>
          <div class="ss-value income">${formatMoney(totalIncome)}</div>
        </div>
        <div class="summary-strip-item">
          <div class="ss-label">Gastos totales</div>
          <div class="ss-value expense">${formatMoney(totalExpense)}</div>
        </div>
        <div class="summary-strip-item">
          <div class="ss-label">Balance neto</div>
          <div class="ss-value ${totalIncome - totalExpense >= 0 ? 'income' : 'expense'}">${formatMoney(totalIncome - totalExpense)}</div>
        </div>
      </div>

      <div class="table-toolbar">
        <div class="table-filters">
          <button class="table-filter-chip ${filterType === 'todos' ? 'active' : ''}" data-filter="todos">Todos</button>
          <button class="table-filter-chip ${filterType === 'ingreso' ? 'active' : ''}" data-filter="ingreso">Ingresos</button>
          <button class="table-filter-chip ${filterType === 'gasto' ? 'active' : ''}" data-filter="gasto">Gastos</button>
          <button class="table-filter-chip ${filterType === 'transferencia' ? 'active' : ''}" data-filter="transferencia">Transferencias</button>
          ${holdTxs.length > 0 ? `<button class="table-filter-chip ${filterEstado === 'hold' ? 'active' : ''}" data-filter-estado="hold" style="border-color:#f59e0b;color:#f59e0b">⏳ Hold (${holdTxs.length})</button>` : ''}
          ${filterEstado === 'hold' ? `<button class="table-filter-chip active" data-filter-estado="todos" style="font-size:0.75rem">✕ Quitar filtro</button>` : ''}
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn ${viewMode === 'lista' ? 'btn-primary' : 'btn-secondary'}" id="view-lista" style="padding:6px 14px;font-size:0.82rem">≡ Lista</button>
          <button class="btn ${viewMode === 'por-banco' ? 'btn-primary' : 'btn-secondary'}" id="view-banco" style="padding:6px 14px;font-size:0.82rem">🏦 Por Banco</button>
          <div class="search-input">
            ${icon('search', 18)}
            <input type="text" class="form-input" id="tx-search" placeholder="Buscar..." value="${searchQuery}" />
          </div>
        </div>
      </div>

      ${holdBanner}

      ${viewMode === 'por-banco' ? renderByBank(txs, banks, accounts, cards) : renderLista(txs, searchQuery, filterType)}
    `;

    // ── Events: filters & search
    page.querySelector('#add-tx-btn')?.addEventListener('click', () => openTxModal());

    // ── Quick action desde widget Android: abre modal con tipo pre-seleccionado
    try {
      const hashParts = window.location.hash.split('?');
      if (hashParts.length > 1) {
        const params = new URLSearchParams(hashParts[1]);
        const quickType = params.get('quick');
        if (quickType && ['ingreso', 'gasto', 'transferencia'].includes(quickType)) {
          // Limpia la query del hash para no re-disparar
          history.replaceState(null, '', window.location.pathname + '#/transactions');
          // Abre modal pre-rellenado
          setTimeout(() => openTxModal({ tipo: quickType }), 200);
        }
      }
    } catch (e) { console.warn('[quick-action]', e); }
    page.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
      filterType = btn.dataset.filter; render();
    }));
    page.querySelectorAll('[data-filter-estado]').forEach(btn => btn.addEventListener('click', () => {
      filterEstado = btn.dataset.filterEstado; render();
    }));
    page.querySelector('#tx-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase(); render();
    });

    // ── Events: view toggle
    page.querySelector('#view-lista')?.addEventListener('click', () => { viewMode = 'lista'; render(); });
    page.querySelector('#view-banco')?.addEventListener('click', () => { viewMode = 'por-banco'; render(); });

    // ── Events: edit/delete rows
    page.querySelectorAll('[data-edit-tx]').forEach(btn => btn.addEventListener('click', () => {
      const tx = store.getById('transactions', btn.dataset.editTx);
      if (tx) openTxModal(tx);
    }));
    page.querySelectorAll('[data-del-tx]').forEach(btn => btn.addEventListener('click', async () => {
      const tx = store.getById('transactions', btn.dataset.delTx);
      if (!tx) return;
      const ok = await confirmDialog('¿Eliminar transacción?', `"${tx.descripcion}" por ${formatMoney(tx.monto)}`);
      if (ok) {
        // Si la tx era un gasto en tarjeta y NO estaba en hold, devolvemos
        // el monto al disponible reduciendo saldoUsado.
        if (tx.tarjetaId && tx.tipo === 'gasto' && tx.estado !== 'hold') {
          const card = store.getById('cards', tx.tarjetaId);
          if (card) {
            const prev = parseFloat(card.saldoUsado) || 0;
            const decr = parseFloat(tx.monto) || 0;
            store.update('cards', tx.tarjetaId, { saldoUsado: Math.max(0, prev - decr) });
          }
        }
        store.remove('transactions', tx.id);
        showToast('success', 'Transacción eliminada');
        render();
      }
    }));

    // ── Events: Hold assign
    page.querySelectorAll('.hold-assign').forEach(sel => {
      sel.addEventListener('change', () => {
        const txId = sel.dataset.txId;
        const val = sel.value;
        if (!val) return;
        const tx = store.getById('transactions', txId);
        const updates = { estado: 'activo' };
        if (val.startsWith('acc:')) { updates.cuentaId = val.replace('acc:', ''); updates.tarjetaId = null; }
        else if (val.startsWith('card:')) { updates.tarjetaId = val.replace('card:', ''); updates.cuentaId = null; }
        store.update('transactions', txId, updates);

        // Si paso de hold -> activo y se asigno a una tarjeta como gasto,
        // sumar el monto al saldoUsado de la tarjeta.
        if (updates.tarjetaId && tx && tx.tipo === 'gasto') {
          const card = store.getById('cards', updates.tarjetaId);
          if (card) {
            const prev = parseFloat(card.saldoUsado) || 0;
            const incr = parseFloat(tx.monto) || 0;
            store.update('cards', updates.tarjetaId, { saldoUsado: prev + incr });
          }
        }

        showToast('success', '✅ Transacción asignada', 'Ya está contabilizada en tu balance');
        render();
      });
    });

    // ── Events: Hold delete
    page.querySelectorAll('[data-del-hold]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog('¿Eliminar transacción pendiente?', 'Se descartará por completo, sin afectar ningún balance.');
        if (ok) { store.remove('transactions', btn.dataset.delHold); showToast('success', 'Transacción descartada'); render(); }
      });
    });
  };

  // ── Vista: Lista plana
  function renderLista(txs, searchQuery, filterType) {
    if (!txs.length) return `
      <div class="empty-state card">
        ${icon('transaction', 64)}
        <h3>Sin transacciones</h3>
        <p>${searchQuery || filterType !== 'todos' ? 'No se encontraron resultados con los filtros actuales' : 'Registra tu primera transacción para comenzar'}</p>
      </div>`;

    return `
      <div class="table-container">
        <table class="data-table">
          <thead><tr>
            <th>Descripción</th><th>Categoría</th><th>Cuenta</th><th>Fecha</th>
            <th class="right">Monto</th><th class="right">Acciones</th>
          </tr></thead>
          <tbody>${txs.map(tx => txRow(tx)).join('')}</tbody>
        </table>
      </div>`;
  }

  // ── Vista: Agrupada por Banco
  function renderByBank(txs, banks, accounts, cards) {
    if (!txs.length) return `
      <div class="empty-state card">
        ${icon('transaction', 64)}
        <h3>Sin transacciones</h3>
        <p>Registra tu primera transacción para comenzar</p>
      </div>`;

    // Función para obtener el banco de una transacción
    const getBankForTx = (tx) => {
      if (tx.cuentaId) {
        const acc = accounts.find(a => a.id === tx.cuentaId);
        if (acc) {
          const bank = banks.find(b => b.id === acc.bancoId);
          return bank ? { id: bank.id, nombre: bank.nombre } : { id: 'sin-banco', nombre: 'Sin banco asignado' };
        }
      }
      if (tx.tarjetaId) {
        const card = cards.find(c => c.id === tx.tarjetaId);
        if (card && card.bancoId) {
          const bank = banks.find(b => b.id === card.bancoId);
          return bank ? { id: bank.id, nombre: bank.nombre } : { id: 'sin-banco', nombre: 'Sin banco asignado' };
        }
        if (card) return { id: `card-${card.id}`, nombre: `Tarjeta: ${card.nombre}` };
      }
      return { id: 'sin-banco', nombre: 'Sin banco asignado' };
    };

    // Agrupar transacciones por banco
    const groups = {};
    txs.forEach(tx => {
      const bank = getBankForTx(tx);
      if (!groups[bank.id]) groups[bank.id] = { nombre: bank.nombre, txs: [] };
      groups[bank.id].txs.push(tx);
    });

    // Paleta de colores para bancos
    const bankColors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6','#ef4444','#14b8a6'];
    let colorIdx = 0;

    return Object.entries(groups).map(([bankId, group]) => {
      const totalIncome  = group.txs.filter(t => t.tipo === 'ingreso').reduce((s,t) => s + (parseFloat(t.monto)||0), 0);
      const totalExpense = group.txs.filter(t => t.tipo === 'gasto').reduce((s,t)  => s + (parseFloat(t.monto)||0), 0);
      const net = totalIncome - totalExpense;
      const color = bankColors[colorIdx++ % bankColors.length];

      return `
        <div style="margin-bottom:24px; border-radius:16px; overflow:hidden; border:1px solid var(--border-color); box-shadow:var(--shadow-sm)">
          <!-- Bank Header -->
          <div style="background:linear-gradient(135deg,${color}22,${color}11); border-bottom:1px solid ${color}33; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:36px;height:36px;border-radius:50%;background:${color}22;border:2px solid ${color}55;display:flex;align-items:center;justify-content:center;font-size:1.1rem">🏦</div>
              <div>
                <div style="font-weight:700;font-size:1rem;color:${color}">${group.nombre}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">${group.txs.length} transacción${group.txs.length !== 1 ? 'es' : ''}</div>
              </div>
            </div>
            <div style="display:flex;gap:20px;flex-wrap:wrap">
              ${totalIncome > 0 ? `<div style="text-align:right"><div style="font-size:0.7rem;color:var(--text-muted)">Ingresos</div><div style="font-weight:700;color:var(--color-income);font-size:0.95rem">+${formatMoney(totalIncome)}</div></div>` : ''}
              ${totalExpense > 0 ? `<div style="text-align:right"><div style="font-size:0.7rem;color:var(--text-muted)">Gastos</div><div style="font-weight:700;color:var(--color-expense);font-size:0.95rem">-${formatMoney(totalExpense)}</div></div>` : ''}
              <div style="text-align:right"><div style="font-size:0.7rem;color:var(--text-muted)">Balance</div><div style="font-weight:700;color:${net>=0?'var(--color-income)':'var(--color-expense)'};font-size:0.95rem">${net>=0?'+':''}${formatMoney(Math.abs(net))}</div></div>
            </div>
          </div>
          <!-- Transactions Table -->
          <div style="background:var(--bg-card)">
            <table class="data-table" style="margin:0">
              <thead><tr>
                <th>Descripción</th><th>Categoría</th><th>Cuenta</th><th>Fecha</th>
                <th class="right">Monto</th><th class="right">Acciones</th>
              </tr></thead>
              <tbody>${group.txs.map(tx => txRow(tx)).join('')}</tbody>
            </table>
          </div>
        </div>`;
    }).join('');
  }

  // ── Fila de transacción (compartida entre ambas vistas)
  function txRow(tx) {
    const cat = getCategoryById(tx.categoriaId);
    const account = tx.cuentaId ? store.getById('accounts', tx.cuentaId) : null;
    const card = tx.tarjetaId ? store.getById('cards', tx.tarjetaId) : null;
    const isIncome = tx.tipo === 'ingreso';
    const isTransfer = tx.tipo === 'transferencia';
    const isHold = tx.estado === 'hold';
    const incomeTypeMap = { personal: '\ud83d\udc64', cliente: '\ud83c\udfe2', salario: '\ud83d\udcbc', prestamo: '\ud83c\udfe6', otro: '\ud83d\udce6' };
    const incomeEmoji = isIncome && tx.tipoIngreso ? incomeTypeMap[tx.tipoIngreso] || '' : '';
    const iconColor = isHold ? '#f59e0b' : isIncome ? 'var(--color-income)' : isTransfer ? 'var(--color-info)' : 'var(--color-expense)';
    const iconBg    = isHold ? 'rgba(245,158,11,0.15)' : isIncome ? 'var(--color-income-bg)' : isTransfer ? 'var(--color-info-bg)' : 'var(--color-expense-bg)';
    return `
      <tr style="${isHold ? 'background:rgba(245,158,11,0.05);' : ''}">
        <td>
          <div class="cell-with-icon">
            <div class="cell-icon" style="background:${iconBg};color:${iconColor}">
              ${isHold ? '\u23f3' : isIncome ? icon('arrowDown', 16) : isTransfer ? icon('transaction', 16) : icon('arrowUp', 16)}
            </div>
            <div>
              <div class="cell-primary">
                ${isTransfer ? '<span style="color:var(--color-info);margin-right:4px">⇄</span>' : ''}
                ${tx.descripcion}
                ${isTransfer ? '<span class="badge badge-info" style="font-size:0.6rem;margin-left:5px">Movimiento Interno</span>' : ''}
                ${incomeEmoji}
                ${tx.is_business || tx.isBusiness ? '<span style="background:rgba(124,58,237,0.15);color:#7C3AED;font-size:0.6rem;font-weight:700;padding:1px 6px;border-radius:6px;margin-left:5px;letter-spacing:0.3px">NEGOCIO</span>' : ''}
                ${tx.external_reference || tx.externalReference ? `<span style="background:rgba(14,165,233,0.15);color:#0EA5E9;font-size:0.55rem;font-weight:700;padding:1px 5px;border-radius:4px;margin-left:4px" title="${tx.external_reference || tx.externalReference}">HUB</span>` : ''}
                ${isHold ? '<span style="background:#f59e0b;color:#000;font-size:0.6rem;font-weight:800;padding:1px 5px;border-radius:3px;margin-left:5px;letter-spacing:0.5px">HOLD</span>' : ''}
                ${tx.source === 'ai-agent' || tx._aiModified ? '<span style="font-size:0.65rem;color:var(--text-muted);margin-left:4px">\ud83e\udd16 IA</span>' : ''}
              </div>
              ${isHold ? '<div style="font-size:0.71rem;color:#f59e0b;margin-top:2px">\u26a0\ufe0f Sin cuenta — no afecta tu balance hasta asignar una</div>' : ''}
              ${tx.notas && !isHold ? `<div class="cell-secondary">${tx.notas.substring(0,40)}${tx.notas.length>40?'...':''}</div>` : ''}
              ${Array.isArray(tx.beneficiarios) && tx.beneficiarios.length > 0 ? `
                <div class="beneficiary-chips-row">
                  ${tx.beneficiarios.slice(0, 3).map(b => `
                    <span class="beneficiary-chip" title="${b.nombre || ''}">
                      ${icon('users', 10)} ${b.nombre || '—'}
                      <span class="chip-amount">${formatMoney(b.monto)}</span>
                    </span>
                  `).join('')}
                  ${tx.beneficiarios.length > 3 ? `<span class="beneficiary-chip">+${tx.beneficiarios.length - 3}</span>` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        </td>
        <td>${cat ? `<span class="badge badge-neutral">${(cat.emoji || cat.icono || '')} ${cat.nombre || ''}</span>`.trim() : '<span style="color:var(--text-muted)">—</span>'}</td>
        <td style="font-size:0.8rem;color:var(--text-secondary)">${isHold ? '<span style="color:#f59e0b">Sin cuenta \u23f3</span>' : card ? '\ud83d\udcb3 '+card.nombre : account?.nombre || '—'}</td>
        <td style="font-size:0.8rem;color:var(--text-secondary)">${formatDate(tx.fecha)}</td>
        <td class="right" style="font-weight:700;color:${isHold ? '#f59e0b' : isIncome ? 'var(--color-income)' : isTransfer ? 'inherit' : 'var(--color-expense)'}">
          ${isHold ? '~' : ''}${isIncome?'+':isTransfer?'':'-'}${formatMoney(tx.monto)}
          ${isHold ? '<br><span style="font-size:0.65rem;font-weight:400;opacity:0.8">pendiente</span>' : ''}
        </td>
        <td class="cell-actions">
          <button class="cell-action-btn" data-edit-tx="${tx.id}" title="Editar">${icon('edit',16)}</button>
          <button class="cell-action-btn danger" data-del-tx="${tx.id}" title="Eliminar">${icon('trash',16)}</button>
        </td>
      </tr>`;
  }

  function openTxModal(tx = null) {
    const modal = openModal(tx ? 'Editar Transacción' : 'Nueva Transacción', txForm(tx), { width: '560px' });

    // Pre-llenar todos los campos via JS (mas robusto que el atributo HTML
    // value/selected, que falla si el DOM se reordena o si los IDs llegan
    // vacios). Solo aplica al editar (tx existe).
    if (tx) {
      const set = (sel, val) => { const el = modal.querySelector(sel); if (el != null && val != null) el.value = val; };
      set('#tx-amount', tx.monto);
      set('#tx-date', tx.fecha);
      set('#tx-desc', tx.descripcion);
      set('#tx-client', tx.clienteAsociado);
      set('#tx-category', tx.categoriaId);
      set('#tx-account', tx.cuentaId);
      set('#tx-card', tx.tarjetaId);
      set('#tx-dest', tx.cuentaDestinoId);
      set('#tx-notes', tx.notas);
      set('#tx-income-type', tx.tipoIngreso || 'personal');
      const dz = modal.querySelector('#tx-diezmo');
      if (dz) dz.checked = tx.aplicaDiezmo !== false;
    }

    // Tab switching
    const tabs = modal.querySelectorAll('#tx-type-tabs .tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tipo = tab.dataset.tipo;
        modal.querySelector('#tx-tipo').value = tipo;
        // Update category options - preservando seleccion previa
        const catSelect = modal.querySelector('#tx-category');
        const currentCat = catSelect.value || tx?.categoriaId || '';
        catSelect.innerHTML = `<option value="">Seleccionar categoría</option>${getCategoryOptions(tipo, currentCat)}`;
        catSelect.value = currentCat;
        // Show/hide fields
        modal.querySelector('#tx-card-group').style.display = tipo === 'gasto' ? 'block' : 'none';
        modal.querySelector('#tx-dest-group').style.display = tipo === 'transferencia' ? 'block' : 'none';
        modal.querySelector('#tx-diezmo-group').style.display = tipo !== 'gasto' ? 'block' : 'none';
        modal.querySelector('#tx-income-type-group').style.display = tipo === 'ingreso' ? 'block' : 'none';

        // Auto-check for income, uncheck for transfers by default
        const diezmoCheck = modal.querySelector('#tx-diezmo');
        if (!tx) diezmoCheck.checked = tipo === 'ingreso';

        const accountLabelText = tipo === 'ingreso' ? 'Cuenta Destino' : 'Cuenta Origen';
        const accountLabelRequired = tipo === 'transferencia' ? '' : ' <span class="required">*</span>';
        modal.querySelector('#tx-account-label').innerHTML = accountLabelText + accountLabelRequired;
        // Cuando se cambia el tipo, re-evaluar si la cuenta sigue siendo requerida
        // (la helper se define unas lineas mas abajo, asi que la llamamos defensivamente)
        if (typeof syncAccountRequirement === 'function') syncAccountRequirement();
      });
    });

    // Si hay tarjeta seleccionada, la cuenta deja de ser requerida (gasto va a tarjeta).
    // Aplica tanto al cargar el form como cuando el usuario cambia el select.
    const cardSelect = modal.querySelector('#tx-card');
    const accSelect = modal.querySelector('#tx-account');
    const syncAccountRequirement = () => {
      const tipo = modal.querySelector('#tx-tipo').value;
      const hasCard = Boolean(cardSelect?.value);
      // Para transferencia la cuenta nunca es opcional, para los demas
      // sigue siendo requerida salvo que se haya elegido una tarjeta.
      accSelect.required = !(tipo === 'gasto' && hasCard) && tipo !== 'transferencia';
    };
    cardSelect?.addEventListener('change', syncAccountRequirement);
    syncAccountRequirement(); // estado inicial, especialmente al editar tx existente

    // Income type chips logic
    modal.querySelectorAll('.income-type-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        modal.querySelectorAll('.income-type-chip').forEach(c => {
          c.classList.remove('btn-primary');
          c.classList.add('btn-secondary');
        });
        chip.classList.remove('btn-secondary');
        chip.classList.add('btn-primary');
        const val = chip.dataset.incomeType;
        modal.querySelector('#tx-income-type').value = val;
        const hint = modal.querySelector('#income-type-hint');
        const diezmo = modal.querySelector('#tx-diezmo');
        if (val === 'prestamo') {
          hint.innerHTML = '⚠️ Los préstamos recibidos <strong>no cuentan</strong> para el cálculo del 10%.';
          if (diezmo) diezmo.checked = false;
        } else if (val === 'cliente') {
          hint.innerHTML = '🏢 Ingreso de cliente. Se asociará al campo "Cliente" si lo rellenas.';
          modal.querySelector('#tx-client')?.focus();
        } else {
          hint.innerHTML = 'ℹ️ Este ingreso se sumará a la base del 10% según la opción marcada abajo.';
          if (diezmo && !tx) diezmo.checked = true;
        }
      });
    });

    // Set category for existing tx
    if (tx?.categoriaId) setTimeout(() => { modal.querySelector('#tx-category').value = tx.categoriaId; }, 0);

    // ---------- Beneficiarios (split) ----------
    const benefState = {
      rows: Array.isArray(tx?.beneficiarios) ? tx.beneficiarios.map(b => ({ ...b })) : [],
    };
    const listEl = modal.querySelector('#tx-benef-list');
    const statusEl = modal.querySelector('#tx-benef-status');
    const directory = getAllBeneficiarios();
    const dataListId = 'tx-benef-dir';
    // inyecta datalist una sola vez
    if (!document.getElementById(dataListId)) {
      const dl = document.createElement('datalist');
      dl.id = dataListId;
      dl.innerHTML = directory.map(p => `<option value="${p.nombre}">`).join('');
      modal.appendChild(dl);
    }

    function renderBenefRows() {
      if (!listEl) return;
      if (benefState.rows.length === 0) {
        listEl.innerHTML = `<div class="beneficiary-empty">Sin beneficiarios · la transacción quedará registrada a tu nombre.</div>`;
      } else {
        listEl.innerHTML = benefState.rows.map((r, i) => `
          <div class="beneficiary-row" data-i="${i}">
            <input type="text" data-field="nombre" value="${(r.nombre || '').replace(/"/g, '&quot;')}" placeholder="Nombre" list="${dataListId}" autocomplete="off" />
            <input type="number" data-field="monto" value="${r.monto != null ? r.monto : ''}" step="0.01" placeholder="Monto" />
            <button type="button" class="beneficiary-row-remove" data-remove="${i}" title="Quitar">${icon('trash', 14)}</button>
          </div>
        `).join('');
      }
      refreshStatus();
    }

    function refreshStatus() {
      if (!statusEl) return;
      const total = parseFloat(modal.querySelector('#tx-amount').value) || 0;
      if (benefState.rows.length === 0) {
        statusEl.textContent = '—';
        statusEl.className = 'beneficiary-split-status';
        return;
      }
      const sum = benefState.rows.reduce((s, r) => s + (parseFloat(r.monto) || 0), 0);
      const diff = +(total - sum).toFixed(2);
      if (Math.abs(diff) < 0.01) {
        statusEl.textContent = `Cuadrado · RD$ ${sum.toFixed(2)}`;
        statusEl.className = 'beneficiary-split-status ok';
      } else if (diff > 0) {
        statusEl.textContent = `Falta RD$ ${diff.toFixed(2)}`;
        statusEl.className = 'beneficiary-split-status warn';
      } else {
        statusEl.textContent = `Excede RD$ ${Math.abs(diff).toFixed(2)}`;
        statusEl.className = 'beneficiary-split-status bad';
      }
    }

    // Bindings
    modal.querySelector('#tx-benef-add')?.addEventListener('click', () => {
      benefState.rows.push({ personaId: null, nombre: '', monto: '' });
      renderBenefRows();
    });
    modal.querySelector('#tx-benef-split-eq')?.addEventListener('click', () => {
      const total = parseFloat(modal.querySelector('#tx-amount').value) || 0;
      if (benefState.rows.length === 0) {
        // Auto añade 2 filas si no hay ninguna
        benefState.rows.push({ personaId: null, nombre: '', monto: '' });
        benefState.rows.push({ personaId: null, nombre: '', monto: '' });
      }
      const parts = splitEqual(total, benefState.rows.length);
      benefState.rows = benefState.rows.map((r, i) => ({ ...r, monto: parts[i] }));
      renderBenefRows();
    });
    modal.querySelector('#tx-benef-clear')?.addEventListener('click', () => {
      benefState.rows = [];
      renderBenefRows();
    });
    listEl?.addEventListener('input', (e) => {
      const row = e.target.closest('.beneficiary-row');
      if (!row) return;
      const i = parseInt(row.dataset.i, 10);
      const field = e.target.dataset.field;
      if (benefState.rows[i] && field) {
        benefState.rows[i][field] = field === 'monto' ? e.target.value : e.target.value;
        // Si cambió el nombre, resetea personaId para re-resolverlo al guardar
        if (field === 'nombre') benefState.rows[i].personaId = null;
      }
      refreshStatus();
    });
    listEl?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove]');
      if (!btn) return;
      const i = parseInt(btn.dataset.remove, 10);
      benefState.rows.splice(i, 1);
      renderBenefRows();
    });
    modal.querySelector('#tx-amount')?.addEventListener('input', refreshStatus);

    renderBenefRows();

    modal.querySelector('#tx-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const tipo = modal.querySelector('#tx-tipo').value;
      const monto = parseFloat(modal.querySelector('#tx-amount').value) || 0;
      const tipoIngreso = tipo === 'ingreso' ? (modal.querySelector('#tx-income-type')?.value || 'personal') : null;
      // Resolver beneficiarios — upsert por nombre, filtrar filas vacías
      const beneficiariosFinal = benefState.rows
        .filter(r => (r.nombre || '').trim() && (parseFloat(r.monto) || 0) > 0)
        .map(r => {
          const persona = upsertBeneficiarioByName(r.nombre);
          return {
            personaId: persona?.id || null,
            nombre: persona?.nombre || (r.nombre || '').trim(),
            monto: +(parseFloat(r.monto) || 0).toFixed(2),
            concepto: r.concepto || '',
          };
        });

      // Regla: si el gasto va a tarjeta de credito, NO debe descontar de la cuenta.
      // El saldo de la cuenta se afectara solo al pagar la tarjeta (ver cards.js).
      const cuentaSeleccionada = modal.querySelector('#tx-account').value;
      const tarjetaSeleccionada = modal.querySelector('#tx-card')?.value || '';
      const usaTarjeta = tipo === 'gasto' && Boolean(tarjetaSeleccionada);

      // Studio Business Hub — workspace mode auto-mark is_business
      // - BUSINESS: todas las transacciones son de negocio
      // - HYBRID: lee el checkbox #tx-business si existe
      // - PERSONAL: nunca es business
      const wsMode = (store.getCurrentWorkspace?.()?.mode || 'PERSONAL').toUpperCase();
      const businessCheckbox = modal.querySelector('#tx-business');
      const isBusiness =
        wsMode === 'BUSINESS' ? true :
        wsMode === 'HYBRID' ? Boolean(businessCheckbox?.checked) :
        false;

      const data = {
        tipo,
        monto,
        tipoIngreso,
        descripcion: modal.querySelector('#tx-desc').value.trim(),
        clienteAsociado: modal.querySelector('#tx-client')?.value.trim() || null,
        categoriaId: modal.querySelector('#tx-category').value,
        cuentaId: usaTarjeta ? '' : cuentaSeleccionada,
        tarjetaId: tarjetaSeleccionada,
        cuentaDestinoId: modal.querySelector('#tx-dest')?.value || '',
        fecha: modal.querySelector('#tx-date').value,
        notas: modal.querySelector('#tx-notes').value.trim(),
        aplicaDiezmo: tipoIngreso === 'prestamo' ? false : (modal.querySelector('#tx-diezmo')?.checked || false),
        beneficiarios: beneficiariosFinal,
        isBusiness,
      };

      if (monto <= 0) { showToast('error', 'El monto debe ser mayor a 0'); return; }
      if (!data.cuentaId && !data.tarjetaId) { showToast('error', 'Selecciona una cuenta o tarjeta'); return; }
      if (tipo === 'transferencia' && !data.cuentaDestinoId) { showToast('error', 'Selecciona la cuenta destino'); return; }

      // ---------- Recalcular saldo usado de tarjeta al editar / crear ----------
      // Importante: saldoUsado puede venir como string desde el backend (pg numeric),
      // por eso usamos parseFloat en toda operacion aritmetica para evitar
      // concatenacion de strings.
      const cardWasOnHold = (t) => t?.estado === 'hold';

      if (tx) {
        // Revertir saldoUsado de la tarjeta vieja (si aplicaba)
        if (tx.tarjetaId && tx.tipo === 'gasto' && !cardWasOnHold(tx)) {
          const oldCard = store.getById('cards', tx.tarjetaId);
          if (oldCard) {
            const prev = parseFloat(oldCard.saldoUsado) || 0;
            const decr = parseFloat(tx.monto) || 0;
            store.update('cards', tx.tarjetaId, { saldoUsado: Math.max(0, prev - decr) });
          }
        }
        store.update('transactions', tx.id, data);
      } else {
        if (!enforceLimit('max_transactions_month', { title: 'Has alcanzado el máximo de transacciones este mes' })) return;
        store.add('transactions', { ...data, id: generateId() });
      }

      // Aplicar saldoUsado de la tarjeta nueva (solo si no es hold)
      if (data.tarjetaId && tipo === 'gasto' && data.estado !== 'hold') {
        const card = store.getById('cards', data.tarjetaId);
        if (card) {
          const prev = parseFloat(card.saldoUsado) || 0;
          const incr = parseFloat(monto) || 0;
          store.update('cards', data.tarjetaId, { saldoUsado: prev + incr });
        }
      }

      showToast('success', tx ? 'Transacción actualizada' : 'Transacción registrada');
      closeModal();
      render();
    });
  }

  render();

  // Auto-rerender cuando la cache de transacciones / cards / accounts cambia
  // (especialmente para que el id local se refresque al id real del backend
  // y los botones editar/eliminar sigan funcionando sin recargar la pagina).
  const offs = ['transactions', 'cards', 'accounts'].map((col) => {
    return store.on(col, () => {
      if (!document.body.contains(page)) { offs.forEach((u) => u && u()); return; }
      render();
    });
  });

  return page;
}
