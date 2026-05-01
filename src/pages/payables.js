// ============================================
// Payables Page — Accounts payable
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { generateId, formatMoney, formatDate, getToday, getDaysUntil, isOverdue, percentage } from '../utils.js';
import { openModal, closeModal, showToast, confirmDialog, emptyState } from '../components.js';
import { normDebt } from './debts.js';
import { enforceLimit } from '../plans_engine.js';
import {
  getAllBeneficiarios,
  upsertBeneficiarioByName,
  splitEqual,
} from '../beneficiaries.js';

function payableForm(item = null) {
  return `
    <form id="payable-form">
      <div class="form-group">
        <label class="form-label">Beneficiario <span class="required">*</span></label>
        <input type="text" class="form-input" id="pay-beneficiary" value="${item?.beneficiario || ''}" placeholder="¿A quién le debes?" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="pay-amount" value="${item?.monto || ''}" step="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha Límite</label>
          <input type="date" class="form-input" id="pay-deadline" value="${item?.fechaLimite || ''}" />
        </div>
      </div>
      ${item ? `
        <div class="form-group">
          <label class="form-label">Monto Pagado</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="pay-paid" value="${item?.montoPagado || 0}" step="0.01" />
          </div>
        </div>
      ` : ''}
      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea class="form-textarea" id="pay-notes" placeholder="Detalles adicionales...">${item?.notas || ''}</textarea>
      </div>

      <!-- Colaboradores / Deuda compartida -->
      <div class="beneficiary-block" id="pay-colab-block">
        <div class="beneficiary-head">
          <div class="beneficiary-head-title">${icon('users', 14)} Colaboradores</div>
          <span class="beneficiary-split-status" id="pay-colab-status">—</span>
        </div>
        <div class="beneficiary-head-hint">Divide esta deuda entre varias personas. Cada una lleva su propio saldo pendiente.</div>
        <div class="beneficiary-list" id="pay-colab-list"></div>
        <div class="beneficiary-actions">
          <div class="actions-left">
            <button type="button" class="btn btn-secondary btn-sm" id="pay-colab-add">${icon('plus', 12)} Añadir</button>
            <button type="button" class="btn btn-ghost btn-sm" id="pay-colab-split-eq">Dividir equitativo</button>
          </div>
          <div class="actions-right">
            <button type="button" class="btn btn-ghost btn-sm" id="pay-colab-clear">Limpiar</button>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check', 18)} ${item ? 'Guardar' : 'Registrar'}</button>
      </div>
    </form>
  `;
}

export default function renderPayables() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const render = () => {
    const payables = store.getAll('payables');
    const debts = store.filter('debts', d => d.estado !== 'pagada');
    
    // Unificar Deudas y Préstamos pendientes como Items por Pagar
    const loans = store.filter('loans', l => l.estado !== 'pagado' && l.proximoPago);
    
    const unifiedItems = [
      ...payables.map(i => ({ ...i, tipoFuente: 'payable' })),
      ...debts.map(d => {
        const nd = normDebt(d);
        if (!nd) return null;
        return {
          id: nd.id,
          beneficiario: nd.acreedor || 'Deuda',
          monto: nd.montoTotal || 0,
          montoPagado: nd.montoPagado || 0,
          fechaLimite: nd.fechaVencimiento,
          notas: nd.descripcion || nd.notas || '',
          estado: nd.estado,
          tipoFuente: 'debt'
        };
      }).filter(Boolean),
      ...loans.map(l => ({
        id: l.id,
        beneficiario: l.entidad || 'Préstamo',
        monto: l.cuotaMonto || 0,
        montoPagado: 0,
        fechaLimite: l.proximoPago,
        notas: `Cuota de: ${l.nombre}`,
        estado: 'pendiente',
        tipoFuente: 'loan'
      }))
    ];

    if (unifiedItems.length === 0) {
      page.innerHTML = '';
      page.appendChild(emptyState('payable', 'Sin cuentas por pagar', 'No hay compromisos o deudas pendientes.', 'Registrar', () => openForm()));
      return;
    }

    const pending = unifiedItems.filter(i => i.estado !== 'pagada');
    const totalPending = pending.reduce((s, i) => s + ((parseFloat(i.monto) || 0) - (parseFloat(i.montoPagado) || 0)), 0);
    const overdue = pending.filter(i => isOverdue(i.fechaLimite));

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Cuentas por Pagar</h1>
          <p>${pending.length} pendiente${pending.length !== 1 ? 's' : ''} • Total: ${formatMoney(totalPending)} ${overdue.length > 0 ? `<span style="color:var(--color-expense)">• ${overdue.length} vencida${overdue.length !== 1 ? 's' : ''}</span>` : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-payable-btn">${icon('plus', 18)} Nueva Cuenta</button>
        </div>
      </div>

      <div class="stagger-children">
        ${unifiedItems.map(item => {
          const remaining = (parseFloat(item.monto) || 0) - (parseFloat(item.montoPagado) || 0);
          const pct = percentage(parseFloat(item.montoPagado) || 0, parseFloat(item.monto) || 1);
          const ov = item.fechaLimite && isOverdue(item.fechaLimite);
          const daysLeft = item.fechaLimite ? getDaysUntil(item.fechaLimite) : null;
          const statusMap = { pendiente: 'warning', parcial: 'info', pagada: 'success', vencida: 'danger' };
          const estado = item.estado === 'pendiente' && ov ? 'vencida' : item.estado;
          return `
            <div class="card" style="margin-bottom:12px;${estado === 'pagada' ? 'opacity:0.5' : ''}${ov ? ';border-left:3px solid var(--color-expense)' : ''}">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="flex:1">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <strong style="font-size:1rem">${item.beneficiario}</strong>
                    <span class="badge badge-${statusMap[estado] || 'neutral'}">${estado}</span>
                    ${daysLeft !== null && daysLeft >= 0 && daysLeft <= 5 && !ov ? `<span style="font-size:0.7rem;color:var(--color-warning)">Vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}</span>` : ''}
                    ${ov ? `<span style="font-size:0.7rem;color:var(--color-expense)">Venció ${formatDate(item.fechaLimite)}</span>` : ''}
                  </div>
                  <div style="display:flex;gap:16px;font-size:0.8rem;color:var(--text-secondary)">
                    <span>Total: <strong>${formatMoney(item.monto)}</strong></span>
                    <span>Pagado: <strong style="color:var(--color-income)">${formatMoney(item.montoPagado || 0)}</strong></span>
                    <span>Resta: <strong style="color:var(--color-expense)">${formatMoney(remaining)}</strong></span>
                    ${item.fechaLimite ? `<span>Límite: ${formatDate(item.fechaLimite)}</span>` : ''}
                  </div>
                  ${pct > 0 ? `<div class="progress-bar" style="margin-top:8px;height:4px"><div class="progress-fill income" style="width:${pct}%"></div></div>` : ''}
                  ${Array.isArray(item.colaboradores) && item.colaboradores.length > 0 ? `
                    <div class="colab-progress-list">
                      ${item.colaboradores.map(c => {
                        const asignado = parseFloat(c.montoAsignado) || 0;
                        const pagado = parseFloat(c.montoPagado) || 0;
                        const pctC = asignado > 0 ? Math.min(100, (pagado / asignado) * 100) : 0;
                        const done = c.pagado || pagado >= asignado;
                        return `
                          <div class="colab-progress-row ${done ? 'paid' : ''}">
                            <div class="colab-progress-top">
                              <span class="colab-progress-name">${c.nombre || '—'}</span>
                              <span class="colab-progress-amount">${formatMoney(pagado)} / ${formatMoney(asignado)}</span>
                            </div>
                            <div class="colab-progress-bar"><span style="width:${pctC}%"></span></div>
                          </div>`;
                      }).join('')}
                    </div>
                  ` : ''}
                </div>
                <div style="display:flex;gap:4px;margin-left:16px">
                  ${item.tipoFuente === 'debt' ? `
                    <button class="btn btn-secondary btn-sm" onclick="location.hash='#/debts'">${icon('externalLink', 14)} Ver en Deudas</button>
                  ` : item.tipoFuente === 'loan' ? `
                    <button class="btn btn-secondary btn-sm" onclick="location.hash='#/debts'">${icon('externalLink', 14)} Ver Préstamo</button>
                  ` : `
                    ${estado !== 'pagada' ? `<button class="btn btn-success btn-sm" data-pay-item="${item.id}">${icon('dollarSign', 14)} Pagar</button>` : ''}
                    <button class="btn-icon" data-edit="${item.id}">${icon('edit', 16)}</button>
                    <button class="btn-icon" data-del="${item.id}">${icon('trash', 16)}</button>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    page.querySelector('#add-payable-btn')?.addEventListener('click', () => openForm());
    page.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
      const item = store.getById('payables', btn.dataset.edit); if (item) openForm(item);
    }));
    page.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', async () => {
      const ok = await confirmDialog('¿Eliminar?', 'Se eliminará esta cuenta por pagar.');
      if (ok) { store.remove('payables', btn.dataset.del); showToast('success', 'Eliminada'); render(); }
    }));
    page.querySelectorAll('[data-pay-item]').forEach(btn => btn.addEventListener('click', () => {
      const item = store.getById('payables', btn.dataset.payItem);
      if (item) openPayItemModal(item);
    }));
  };

  function openForm(item = null) {
    const modal = openModal(item ? 'Editar Cuenta por Pagar' : 'Nueva Cuenta por Pagar', payableForm(item));

    // ---------- Colaboradores ----------
    const colabState = {
      rows: Array.isArray(item?.colaboradores) ? item.colaboradores.map(c => ({ ...c })) : [],
    };
    const listEl = modal.querySelector('#pay-colab-list');
    const statusEl = modal.querySelector('#pay-colab-status');
    const directory = getAllBeneficiarios();
    const dlId = 'pay-colab-dir';
    if (!document.getElementById(dlId)) {
      const dl = document.createElement('datalist');
      dl.id = dlId;
      dl.innerHTML = directory.map(p => `<option value="${p.nombre}">`).join('');
      modal.appendChild(dl);
    }

    function renderColabRows() {
      if (!listEl) return;
      if (colabState.rows.length === 0) {
        listEl.innerHTML = `<div class="beneficiary-empty">Sin colaboradores · la deuda queda a tu nombre.</div>`;
      } else {
        listEl.innerHTML = colabState.rows.map((r, i) => `
          <div class="beneficiary-row" data-i="${i}">
            <input type="text" data-field="nombre" value="${(r.nombre || '').replace(/"/g, '&quot;')}" placeholder="Nombre" list="${dlId}" autocomplete="off" />
            <input type="number" data-field="montoAsignado" value="${r.montoAsignado != null ? r.montoAsignado : ''}" step="0.01" placeholder="Asignado" />
            <button type="button" class="beneficiary-row-remove" data-remove="${i}" title="Quitar">${icon('trash', 14)}</button>
          </div>
        `).join('');
      }
      refreshColabStatus();
    }

    function refreshColabStatus() {
      if (!statusEl) return;
      const total = parseFloat(modal.querySelector('#pay-amount').value) || 0;
      if (colabState.rows.length === 0) {
        statusEl.textContent = '—';
        statusEl.className = 'beneficiary-split-status';
        return;
      }
      const sum = colabState.rows.reduce((s, r) => s + (parseFloat(r.montoAsignado) || 0), 0);
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

    modal.querySelector('#pay-colab-add')?.addEventListener('click', () => {
      colabState.rows.push({ personaId: null, nombre: '', montoAsignado: '', montoPagado: 0, pagado: false });
      renderColabRows();
    });
    modal.querySelector('#pay-colab-split-eq')?.addEventListener('click', () => {
      const total = parseFloat(modal.querySelector('#pay-amount').value) || 0;
      if (colabState.rows.length === 0) {
        colabState.rows.push({ personaId: null, nombre: '', montoAsignado: '', montoPagado: 0, pagado: false });
        colabState.rows.push({ personaId: null, nombre: '', montoAsignado: '', montoPagado: 0, pagado: false });
      }
      const parts = splitEqual(total, colabState.rows.length);
      colabState.rows = colabState.rows.map((r, i) => ({ ...r, montoAsignado: parts[i] }));
      renderColabRows();
    });
    modal.querySelector('#pay-colab-clear')?.addEventListener('click', () => {
      colabState.rows = [];
      renderColabRows();
    });
    listEl?.addEventListener('input', (e) => {
      const row = e.target.closest('.beneficiary-row');
      if (!row) return;
      const i = parseInt(row.dataset.i, 10);
      const field = e.target.dataset.field;
      if (colabState.rows[i] && field) {
        colabState.rows[i][field] = e.target.value;
        if (field === 'nombre') colabState.rows[i].personaId = null;
      }
      refreshColabStatus();
    });
    listEl?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove]');
      if (!btn) return;
      const i = parseInt(btn.dataset.remove, 10);
      colabState.rows.splice(i, 1);
      renderColabRows();
    });
    modal.querySelector('#pay-amount')?.addEventListener('input', refreshColabStatus);

    renderColabRows();

    modal.querySelector('#payable-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const monto = parseFloat(modal.querySelector('#pay-amount').value) || 0;
      const montoPagado = item ? (parseFloat(modal.querySelector('#pay-paid')?.value) || 0) : 0;

      // Resolver colaboradores — upsert en directorio, mantener montoPagado previo
      const colaboradoresFinal = colabState.rows
        .filter(r => (r.nombre || '').trim() && (parseFloat(r.montoAsignado) || 0) > 0)
        .map(r => {
          const persona = upsertBeneficiarioByName(r.nombre);
          const asignado = +(parseFloat(r.montoAsignado) || 0).toFixed(2);
          const pagado = +(parseFloat(r.montoPagado) || 0).toFixed(2);
          return {
            personaId: persona?.id || null,
            nombre: persona?.nombre || (r.nombre || '').trim(),
            montoAsignado: asignado,
            montoPagado: Math.min(pagado, asignado),
            pagado: pagado >= asignado,
          };
        });

      const data = {
        beneficiario: modal.querySelector('#pay-beneficiary').value.trim(),
        monto, montoPagado,
        fechaLimite: modal.querySelector('#pay-deadline').value,
        notas: modal.querySelector('#pay-notes').value.trim(),
        estado: montoPagado >= monto ? 'pagada' : montoPagado > 0 ? 'parcial' : 'pendiente',
        colaboradores: colaboradoresFinal,
      };
      if (item) { store.update('payables', item.id, data); showToast('success', 'Actualizada'); }
      else {
        if (!enforceLimit('max_payables', { title: 'Has alcanzado el máximo de cuentas por pagar' })) return;
        store.add('payables', { ...data, id: generateId() });
        showToast('success', 'Registrada');
      }
      closeModal(); render();
    });
  }

  function openPayItemModal(item) {
    const remaining = (parseFloat(item.monto) || 0) - (parseFloat(item.montoPagado) || 0);
    const modal = openModal(`Pagar: ${item.beneficiario}`, `
      <form id="pay-item-form">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:0.85rem;color:var(--text-secondary)">Pendiente</div>
          <div style="font-size:1.5rem;font-weight:700;color:var(--color-expense);font-family:var(--font-heading)">${formatMoney(remaining)}</div>
        </div>
        <div class="form-group">
          <label class="form-label">Monto a Pagar <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="pay-now" value="${remaining}" step="0.01" required />
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
          <button type="submit" class="btn btn-success">${icon('check', 18)} Pagar</button>
        </div>
      </form>
    `);
    modal.querySelector('#pay-item-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(modal.querySelector('#pay-now').value) || 0;
      if (amount <= 0) { showToast('error', 'Monto inválido'); return; }
      const newPaid = (parseFloat(item.montoPagado) || 0) + amount;
      const estado = newPaid >= item.monto ? 'pagada' : 'parcial';
      store.update('payables', item.id, { montoPagado: newPaid, estado });
      showToast('success', estado === 'pagada' ? '¡Pago completo!' : 'Pago parcial registrado');
      closeModal(); render();
    });
  }

  render();
  return page;
}
