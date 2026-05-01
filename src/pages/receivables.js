// ============================================
// Receivables Page — Accounts receivable
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { generateId, formatMoney, formatDate, getToday, percentage } from '../utils.js';
import { openModal, closeModal, showToast, confirmDialog, emptyState } from '../components.js';
import { getCategoryOptions } from '../categories.js';
import { enforceLimit } from '../plans_engine.js';

function receivableForm(item = null) {
  const transactions = store.getAll('transactions').filter(t => t.tipo === 'gasto');
  return `
    <form id="recv-form">
      ${!item ? `
      <div class="form-group" style="background:var(--bg-card);padding:12px;border-radius:8px;border:1px solid var(--border-color);margin-bottom:15px">
        <label class="form-label" style="color:var(--accent-primary)">${icon('link', 14)} Vincular desde una transacción de Gasto (Opcional)</label>
        <select class="form-select" id="recv-link">
          <option value="">No vincular (Ingreso Manual)</option>
          ${transactions.slice(-15).reverse().map(t => `<option value="${t.id}" data-monto="${t.monto}" data-fecha="${t.fecha}" data-desc="${t.descripcion}">${formatDate(t.fecha)} - ${t.descripcion} (${formatMoney(t.monto)})</option>`).join('')}
        </select>
        <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Si le prestaste dinero y ya lo registraste como un Gasto, vincúlalo aquí.</p>
      </div>` : ''}
      
      <div class="form-group">
        <label class="form-label">Persona (Deudor) <span class="required">*</span></label>
        <input type="text" class="form-input" id="recv-debtor" value="${item?.deudor || ''}" placeholder="Ej: Pedro Perez" required />
      </div>
      <div class="form-group">
        <label class="form-label">Concepto / Razón <span class="required">*</span></label>
        <input type="text" class="form-input" id="recv-concept" value="${item?.concepto || ''}" placeholder="Ej: Préstamo personal" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto a Cobrar <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="recv-amount" value="${item?.monto || ''}" step="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha del Préstamo</label>
          <input type="date" class="form-input" id="recv-date" value="${item?.fecha || getToday()}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notas Opcionales</label>
        <textarea class="form-textarea" id="recv-notes" placeholder="Detalles de este acuerdo...">${item?.notas || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check', 18)} ${item ? 'Guardar Cambios' : 'Crear Cuenta por Cobrar'}</button>
      </div>
    </form>
  `;
}

function collectForm(item) {
  const accounts = store.getAll('accounts').filter(a => a.activa !== false);
  return `
    <form id="collect-form">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Por recibir de ${item.deudor}</div>
        <div style="font-size:1.5rem;font-weight:700;color:var(--color-income);font-family:var(--font-heading)">${formatMoney(item.monto - (item.montoCobrado || 0))}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Monto que te pagaron <span class="required">*</span></label>
        <div class="input-prefix-wrapper">
          <span class="input-prefix">RD$</span>
          <input type="number" class="form-input" id="collect-amount" value="${item.monto - (item.montoCobrado || 0)}" step="0.01" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Ingresar a la Cuenta Bancaria <span class="required">*</span></label>
        <select class="form-select" id="collect-source" required>
          <option value="">Selecciona dónde cayó el dinero</option>
          ${accounts.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('')}
        </select>
        <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Creará un ingreso automático reportando el pago de esta deuda.</p>
      </div>
      <div class="form-group">
        <label class="form-label">Categoría de Ingreso</label>
        <select class="form-select" id="collect-cat" required>
          ${getCategoryOptions('ingreso')}
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-success">${icon('check', 18)} Confirmar Ingreso de Capital</button>
      </div>
    </form>
  `;
}

export default function renderReceivables() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const render = () => {
    const items = store.getAll('receivables');
    if (items.length === 0) {
      page.innerHTML = '';
      page.appendChild(emptyState('receivable', 'Sin cuentas por cobrar', 'Registra deudas y préstamos que oras personas te deban para tener una inyección de capital asegurada.', 'Registrar Cobro', () => openForm()));
      return;
    }

    const pending = items.filter(i => i.estado !== 'pagada');
    const totalPending = pending.reduce((s, i) => s + ((parseFloat(i.monto) || 0) - (parseFloat(i.montoCobrado) || 0)), 0);

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Cuentas por Cobrar</h1>
          <p>${pending.length} pendiente${pending.length !== 1 ? 's' : ''} • Activos exigibles</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-recv-btn">${icon('plus', 18)} Nueva Exigencia</button>
        </div>
      </div>

      <div class="stat-card" style="margin-bottom:28px;border-top:3px solid var(--color-income)">
        <div class="stat-icon income">${icon('download', 24)}</div>
        <div class="stat-content">
          <div class="stat-label">Total Neto por Recibir</div>
          <div class="stat-value" style="color:var(--color-income)">${formatMoney(totalPending)}</div>
        </div>
      </div>

      <div class="stagger-children">
        ${items.map(item => {
          const remaining = (parseFloat(item.monto) || 0) - (parseFloat(item.montoCobrado) || 0);
          const pct = percentage(parseFloat(item.montoCobrado) || 0, parseFloat(item.monto) || 1);
          const statusMap = { pendiente: 'warning', abonada: 'info', pagada: 'success' };
          const esPagada = item.estado === 'pagada';
          return `
            <div class="card" style="margin-bottom:12px;${esPagada ? 'opacity:0.5' : ''}">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="flex:1">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <strong style="font-size:1.1rem">${item.deudor}</strong>
                    <span class="badge badge-${statusMap[item.estado] || 'neutral'}">${item.estado}</span>
                  </div>
                  <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:10px">${item.concepto} <span style="font-size:0.75rem;padding-left:10px;color:var(--text-muted)">(${formatDate(item.fecha)})</span></div>
                  <div style="display:flex;gap:16px;font-size:0.8rem;color:var(--text-secondary)">
                    <span>Total: <strong>${formatMoney(item.monto)}</strong></span>
                    <span>Recibido: <strong style="color:var(--color-income)">${formatMoney(item.montoCobrado || 0)}</strong></span>
                    <span>Resta: <strong style="color:var(--color-expense)">${formatMoney(remaining)}</strong></span>
                  </div>
                  ${pct > 0 ? `<div class="progress-bar" style="margin-top:8px;height:4px"><div class="progress-fill income" style="width:${pct}%"></div></div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;margin-left:16px">
                  <div style="display:flex;gap:4px">
                    <button class="btn-icon" data-edit="${item.id}" title="Editar">${icon('edit', 16)}</button>
                    <button class="btn-icon" data-del="${item.id}" title="Eliminar">${icon('trash', 16)}</button>
                  </div>
                  ${!esPagada ? `
                    <button class="btn btn-secondary btn-sm" data-collect="${item.id}" style="border-color:var(--color-income);color:var(--color-income);">
                      ${icon('dollarSign', 14)} Aplicar Abono / Pago
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    page.querySelector('#add-recv-btn')?.addEventListener('click', () => openForm());
    page.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
      const item = store.getById('receivables', btn.dataset.edit);
      if (item) openForm(item);
    }));
    page.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', async () => {
      const ok = await confirmDialog('¿Eliminar cuenta por cobrar?', 'Esto no afectará tu historial de transacciones bancarias, solo el seguimiento.');
      if (ok) { store.remove('receivables', btn.dataset.del); showToast('success', 'Eliminada'); render(); }
    }));
    page.querySelectorAll('[data-collect]').forEach(btn => btn.addEventListener('click', () => {
      const item = store.getById('receivables', btn.dataset.collect);
      if (item) openCollectModal(item);
    }));
  };

  function openForm(item = null) {
    const modal = openModal(item ? 'Editar Cuenta por Cobrar' : 'Nueva Exigencia / Cuenta por Cobrar', receivableForm(item));
    
    // Auto-fill form if a previous transaction is selected
    const linker = modal.querySelector('#recv-link');
    if (linker) {
      linker.addEventListener('change', (e) => {
        const option = e.target.options[e.target.selectedIndex];
        if (option.value) {
          modal.querySelector('#recv-amount').value = option.dataset.monto;
          modal.querySelector('#recv-date').value = option.dataset.fecha;
          modal.querySelector('#recv-concept').value = option.dataset.desc;
          showToast('info', 'Datos vinculados', 'Revisa los campos autocompletados basándonos en tu gasto.');
        }
      });
    }

    modal.querySelector('#recv-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const monto = parseFloat(modal.querySelector('#recv-amount').value) || 0;
      const montoCobrado = item ? (item.montoCobrado || 0) : 0;
      const data = {
        deudor: modal.querySelector('#recv-debtor').value.trim(),
        concepto: modal.querySelector('#recv-concept').value.trim(),
        monto,
        montoCobrado,
        fecha: modal.querySelector('#recv-date').value,
        notas: modal.querySelector('#recv-notes').value.trim(),
        estado: montoCobrado >= monto ? 'pagada' : montoCobrado > 0 ? 'abonada' : 'pendiente',
        transaccionVinculada: linker ? linker.value : (item?.transaccionVinculada || null)
      };
      if (item) { store.update('receivables', item.id, data); showToast('success', 'Actualizada'); }
      else {
        if (!enforceLimit('max_receivables', { title: 'Has alcanzado el máximo de cuentas por cobrar' })) return;
        store.add('receivables', { ...data, id: generateId() });
        showToast('success', 'Cuenta por cobrar registrada');
      }
      closeModal(); render();
    });
  }

  function openCollectModal(item) {
    const modal = openModal(`Recepcionar Ingreso de ${item.deudor}`, collectForm(item));
    modal.querySelector('#collect-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(modal.querySelector('#collect-amount').value) || 0;
      const accountId = modal.querySelector('#collect-source').value;
      const cat = modal.querySelector('#collect-cat').value;
      
      if (amount <= 0 || !accountId) { showToast('error', 'Faltan datos financieros'); return; }
      
      // 1. Create Transaction (Ingreso real)
      store.add('transactions', {
        id: generateId(),
        tipo: 'ingreso',
        monto: amount,
        descripcion: `Abono de deuda: ${item.deudor} (${item.concepto})`,
        categoriaId: cat,
        cuentaId: accountId,
        fecha: getToday(),
        notas: item.notas,
      });

      // 2. Update status and pending balance in receivable
      const newCollected = (parseFloat(item.montoCobrado) || 0) + amount;
      const estado = newCollected >= item.monto ? 'pagada' : 'abonada';
      store.update('receivables', item.id, { montoCobrado: newCollected, estado });
      
      showToast('success', estado === 'pagada' ? '¡Deuda cerrada y dinero en cuenta!' : 'Dinero ingresado exitosamente a tu cuenta', `Se añadieron ${formatMoney(amount)}`);
      closeModal(); render();
    });
  }

  render();
  return page;
}
