// ============================================
// Subscriptions Page — Recurring services
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { generateId, formatMoney, formatDate, getToday, getDaysUntil } from '../utils.js';
import { openModal, closeModal, showToast, confirmDialog, emptyState } from '../components.js';
import { getCategoryOptions } from '../categories.js';
import { enforceLimit } from '../plans_engine.js';

// ── Auto-detect subscriptions due today and create pending charges
function checkDueSubscriptions() {
  const today = getToday();
  const subs = store.getAll('subscriptions').filter(s => s.estado === 'activa');
  const charges = store.getAll('subscription_charges');

  subs.forEach(sub => {
    if (!sub.proximoCobro) return;
    if (sub.proximoCobro > today) return; // Not due yet

    // Check if a pending charge already exists for this subscription due date
    const alreadyPending = charges.some(c =>
      c.suscripcionId === sub.id &&
      !c.confirmado &&
      c.fechaProgramada === sub.proximoCobro
    );
    if (alreadyPending) return;

    // Create pending charge automatically
    store.add('subscription_charges', {
      id: generateId(),
      suscripcionId: sub.id,
      fechaProgramada: sub.proximoCobro,
      fechaConfirmada: null,
      confirmado: false,
      monto: sub.monto,
      cuentaId: sub.cuentaId || null,
      tarjetaId: sub.tarjetaId || null,
    });
  });
}

// ── Helper: get account/card display name with bank
function getSourceName(cuentaId, tarjetaId) {
  const banks = store.getAll('banks');
  if (cuentaId) {
    const acc = store.getById('accounts', cuentaId);
    if (acc) {
      const bank = banks.find(b => b.id === acc.bancoId);
      return `🏦 ${bank?.nombre ? bank.nombre + ' — ' : ''}${acc.nombre}`;
    }
  }
  if (tarjetaId) {
    const card = store.getById('cards', tarjetaId);
    if (card) return `💳 ${card.nombre}`;
  }
  return '⚠️ Sin cuenta asignada';
}

function subForm(sub = null) {
  const accounts = store.getAll('accounts');
  const cards = store.getAll('cards');
  const banks = store.getAll('banks');

  // Pre-select value
  let selectedSource = '';
  if (sub?.cuentaId) selectedSource = `account:${sub.cuentaId}`;
  else if (sub?.tarjetaId) selectedSource = `card:${sub.tarjetaId}`;

  return `
    <form id="sub-form">
      <div class="form-group">
        <label class="form-label">Nombre del Servicio <span class="required">*</span></label>
        <input type="text" class="form-input" id="sub-name" value="${sub?.nombre || ''}" placeholder="Ej: Netflix, Spotify, Internet..." required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="sub-amount" value="${sub?.monto || ''}" step="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Frecuencia</label>
          <select class="form-select" id="sub-freq">
            <option value="mensual" ${sub?.frecuencia === 'mensual' ? 'selected' : ''}>Mensual</option>
            <option value="anual" ${sub?.frecuencia === 'anual' ? 'selected' : ''}>Anual</option>
            <option value="semanal" ${sub?.frecuencia === 'semanal' ? 'selected' : ''}>Semanal</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Día de Cobro</label>
          <input type="number" class="form-input" id="sub-day" value="${sub?.diaCobro || 1}" min="1" max="31" />
        </div>
        <div class="form-group">
          <label class="form-label">Categoría</label>
          <select class="form-select" id="sub-cat">
            <option value="cat_subscriptions">🔄 Suscripciones</option>
            ${getCategoryOptions('gasto')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">💳 Cuenta / Tarjeta de cobro <span class="required">*</span></label>
        <select class="form-select" id="sub-source" required>
          <option value="">— Seleccionar —</option>
          <optgroup label="🏦 Cuentas Bancarias">
            ${accounts.map(a => {
              const bank = banks.find(b => b.id === a.bancoId);
              return `<option value="account:${a.id}" ${selectedSource === `account:${a.id}` ? 'selected' : ''}>${bank?.nombre ? bank.nombre + ' — ' : ''}${a.nombre}</option>`;
            }).join('')}
          </optgroup>
          <optgroup label="💳 Tarjetas de Crédito">
            ${cards.map(c => `<option value="card:${c.id}" ${selectedSource === `card:${c.id}` ? 'selected' : ''}>${c.nombre}</option>`).join('')}
          </optgroup>
        </select>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Al confirmar el cobro, se descontará de esta cuenta automáticamente.</div>
      </div>
      <div class="form-group">
        <label class="form-label">Próximo Cobro</label>
        <input type="date" class="form-input" id="sub-next" value="${sub?.proximoCobro || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Notas / Observaciones</label>
        <textarea class="form-textarea" id="sub-notes" placeholder="Ej: Cuenta compartida con 3 amigos...">${sub?.notas || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check', 18)} ${sub ? 'Guardar' : 'Crear'}</button>
      </div>
    </form>
  `;
}

export default function renderSubscriptions() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  // Auto-detect due subscriptions on load
  checkDueSubscriptions();

  const render = () => {
    const subs = store.getAll('subscriptions');
    const charges = store.getAll('subscription_charges');
    const pendingCharges = charges.filter(c => !c.confirmado);

    if (subs.length === 0) {
      page.innerHTML = '';
      page.appendChild(emptyState('subscription', 'Sin suscripciones', 'Agrega tus servicios recurrentes como Netflix, Spotify, Internet, etc.', 'Agregar Suscripción', () => openSubModal()));
      return;
    }

    const totalMonthly = subs
      .filter(s => s.estado === 'activa' && s.frecuencia === 'mensual')
      .reduce((s, sub) => s + (parseFloat(sub.monto) || 0), 0);

    const totalAnnual = subs
      .filter(s => s.estado === 'activa' && s.frecuencia === 'anual')
      .reduce((s, sub) => s + (parseFloat(sub.monto) || 0), 0);
    const annualProjection = (totalMonthly * 12) + totalAnnual;
    const activeCount = subs.filter(s => s.estado === 'activa').length;

    // ── Build pending charges banner
    const pendingBanner = pendingCharges.length > 0 ? `
      <div style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.06));border:1px solid rgba(245,158,11,0.4);border-radius:16px;padding:20px;margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <span style="font-size:1.4rem">🔔</span>
          <div>
            <div style="font-weight:700;font-size:1rem;color:#f59e0b">${pendingCharges.length} cobro${pendingCharges.length > 1 ? 's' : ''} pendiente${pendingCharges.length > 1 ? 's' : ''} de confirmación</div>
            <div style="font-size:0.78rem;color:var(--text-secondary)">Revisa y confirma cada cobro para registrarlo en tu balance</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${pendingCharges.map(charge => {
            const sub = store.getById('subscriptions', charge.suscripcionId);
            if (!sub) return '';
            const sourceName = getSourceName(charge.cuentaId || sub.cuentaId, charge.tarjetaId || sub.tarjetaId);
            const today = getToday();
            const isOverdue = charge.fechaProgramada < today;
            const isToday = charge.fechaProgramada === today;
            return `
              <div style="background:var(--bg-card);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;border:1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : isToday ? 'rgba(245,158,11,0.3)' : 'var(--border-color)'}">
                <div style="width:40px;height:40px;border-radius:50%;background:${isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'};display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">
                  ${isOverdue ? '⚠️' : '🔔'}
                </div>
                <div style="flex:1;min-width:160px">
                  <div style="font-weight:600;font-size:0.95rem">${sub.nombre}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">${sourceName}</div>
                  <div style="font-size:0.75rem;color:${isOverdue ? 'var(--color-expense)' : isToday ? '#f59e0b' : 'var(--text-muted)'};margin-top:2px">
                    ${isOverdue ? `⚠️ Vencido: ${formatDate(charge.fechaProgramada)}` : isToday ? '📅 Vence hoy' : `Fecha: ${formatDate(charge.fechaProgramada)}`}
                  </div>
                </div>
                <div style="font-weight:700;font-size:1.1rem;color:var(--color-expense);flex-shrink:0">-${formatMoney(charge.monto)}</div>
                <div style="display:flex;gap:8px;flex-shrink:0">
                  <button class="btn btn-primary btn-sm" data-confirm-charge="${charge.id}" style="gap:4px">
                    ${icon('check', 14)} Confirmar cobro
                  </button>
                  <button class="btn btn-ghost btn-sm" data-skip-charge="${charge.id}" title="Omitir este cobro">
                    ${icon('close', 14)}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Suscripciones</h1>
          <p>${subs.length} servicio${subs.length !== 1 ? 's' : ''} • Gasto mensual: ${formatMoney(totalMonthly)}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-sub-btn">${icon('plus', 18)} Nueva Suscripción</button>
        </div>
      </div>

      <div class="summary-strip">
        <div class="summary-strip-item">
          <div class="ss-label">Activas</div>
          <div class="ss-value">${activeCount}</div>
        </div>
        <div class="summary-strip-item">
          <div class="ss-label">Gasto mensual</div>
          <div class="ss-value expense">${formatMoney(totalMonthly)}</div>
        </div>
        <div class="summary-strip-item">
          <div class="ss-label">Proyección anual</div>
          <div class="ss-value warn">${formatMoney(annualProjection)}</div>
        </div>
      </div>

      ${pendingBanner}

      <div class="grid grid-auto stagger-children">
        ${subs.map(sub => {
          const isActive = sub.estado === 'activa';
          const days = sub.proximoCobro ? getDaysUntil(sub.proximoCobro) : null;
          const sourceName = getSourceName(sub.cuentaId, sub.tarjetaId);
          const isPending = pendingCharges.some(c => c.suscripcionId === sub.id);
          return `
            <div class="card ${!isActive ? 'opacity-60' : ''}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
                <div>
                  <h4 style="margin-bottom:4px">${sub.nombre}</h4>
                  <span class="badge ${isActive ? 'badge-success' : sub.estado === 'pausada' ? 'badge-warning' : 'badge-danger'}">${sub.estado}</span>
                  ${isPending ? '<span class="badge badge-warning" style="margin-left:4px">🔔 Cobro pendiente</span>' : ''}
                </div>
                <div style="display:flex;gap:4px">
                  <button class="btn-icon" data-edit-sub="${sub.id}" title="Editar">${icon('edit', 16)}</button>
                  <button class="btn-icon" data-del-sub="${sub.id}" title="Eliminar">${icon('trash', 16)}</button>
                </div>
              </div>

              <div style="font-size:1.35rem;font-weight:700;font-family:var(--font-heading);margin-bottom:8px">
                ${formatMoney(sub.monto)}<span style="font-size:0.75rem;color:var(--text-muted);font-weight:400">/${sub.frecuencia}</span>
              </div>

              <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">${sourceName}</div>

              ${sub.proximoCobro ? `
                <div style="font-size:0.8rem;color:${days !== null && days <= 0 ? 'var(--color-expense)' : days !== null && days <= 3 ? 'var(--color-warning)' : 'var(--text-secondary)'}">
                  ${days === 0 ? '📅 Vence hoy' : days !== null && days < 0 ? `⚠️ Vencido hace ${Math.abs(days)} días` : `Próximo cobro: ${formatDate(sub.proximoCobro)} ${days !== null ? `(en ${days} días)` : ''}`}
                </div>
              ` : '<div style="font-size:0.8rem;color:var(--text-muted)">Sin fecha de próximo cobro</div>'}

              <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">
                ${isActive ? `<button class="btn btn-ghost btn-sm" data-pause-sub="${sub.id}">Pausar</button>` : ''}
                ${sub.estado === 'pausada' ? `<button class="btn btn-ghost btn-sm" data-activate-sub="${sub.id}">Activar</button>` : ''}
                ${isActive && !isPending ? `<button class="btn btn-secondary btn-sm" data-generate-charge="${sub.id}">${icon('check', 14)} Registrar cobro</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // ── Events
    page.querySelector('#add-sub-btn')?.addEventListener('click', () => openSubModal());

    page.querySelectorAll('[data-edit-sub]').forEach(btn => btn.addEventListener('click', () => {
      const sub = store.getById('subscriptions', btn.dataset.editSub);
      if (sub) openSubModal(sub);
    }));

    page.querySelectorAll('[data-del-sub]').forEach(btn => btn.addEventListener('click', async () => {
      const ok = await confirmDialog('¿Eliminar suscripción?', 'Se eliminará este servicio recurrente y sus cobros pendientes.');
      if (ok) {
        // Remove pending charges too
        store.getAll('subscription_charges')
          .filter(c => c.suscripcionId === btn.dataset.delSub)
          .forEach(c => store.remove('subscription_charges', c.id));
        store.remove('subscriptions', btn.dataset.delSub);
        showToast('success', 'Suscripción eliminada');
        render();
      }
    }));

    page.querySelectorAll('[data-pause-sub]').forEach(btn => btn.addEventListener('click', () => {
      store.update('subscriptions', btn.dataset.pauseSub, { estado: 'pausada' });
      showToast('info', 'Suscripción pausada');
      render();
    }));

    page.querySelectorAll('[data-activate-sub]').forEach(btn => btn.addEventListener('click', () => {
      store.update('subscriptions', btn.dataset.activateSub, { estado: 'activa' });
      showToast('success', 'Suscripción activada');
      render();
    }));

    page.querySelectorAll('[data-generate-charge]').forEach(btn => btn.addEventListener('click', () => {
      const sub = store.getById('subscriptions', btn.dataset.generateCharge);
      if (!sub) return;
      if (!sub.cuentaId && !sub.tarjetaId) {
        showToast('error', 'Sin cuenta asignada', 'Edita la suscripción y asigna una cuenta o tarjeta primero');
        return;
      }
      store.add('subscription_charges', {
        id: generateId(),
        suscripcionId: sub.id,
        fechaProgramada: getToday(),
        fechaConfirmada: null,
        confirmado: false,
        monto: sub.monto,
        cuentaId: sub.cuentaId || null,
        tarjetaId: sub.tarjetaId || null,
      });
      showToast('info', 'Cobro generado', `Confirma manualmente el cobro de ${sub.nombre}`);
      render();
    }));

    // ── Confirm charge: create transaction + update balances + advance date
    page.querySelectorAll('[data-confirm-charge]').forEach(btn => btn.addEventListener('click', () => {
      const charge = store.getById('subscription_charges', btn.dataset.confirmCharge);
      if (!charge) return;
      const sub = store.getById('subscriptions', charge.suscripcionId);
      if (!sub) return;

      const cuentaId = charge.cuentaId || sub.cuentaId || null;
      const tarjetaId = charge.tarjetaId || sub.tarjetaId || null;

      if (!cuentaId && !tarjetaId) {
        showToast('error', 'Sin cuenta asignada', 'Edita la suscripción y asigna una cuenta o tarjeta primero');
        return;
      }

      // 1. Mark charge as confirmed
      store.update('subscription_charges', charge.id, {
        confirmado: true,
        fechaConfirmada: getToday(),
      });

      // 2. Create transaction
      store.add('transactions', {
        id: generateId(),
        tipo: 'gasto',
        monto: charge.monto,
        descripcion: `Suscripción: ${sub.nombre}`,
        categoriaId: sub.categoriaId || 'cat_subscriptions',
        cuentaId: cuentaId || '',
        tarjetaId: tarjetaId || '',
        fecha: getToday(),
        notas: `Cobro confirmado de suscripción ${sub.frecuencia}`,
        estado: 'activo',
      });

      // 3. Update card balance if paid by card
      if (tarjetaId) {
        const card = store.getById('cards', tarjetaId);
        if (card) store.update('cards', tarjetaId, { saldoUsado: (card.saldoUsado || 0) + parseFloat(charge.monto) });
      }

      // 4. Advance next billing date
      const nextDate = new Date(sub.proximoCobro || charge.fechaProgramada);
      if (sub.frecuencia === 'mensual') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (sub.frecuencia === 'anual') nextDate.setFullYear(nextDate.getFullYear() + 1);
      else if (sub.frecuencia === 'semanal') nextDate.setDate(nextDate.getDate() + 7);
      const tzOffset = nextDate.getTimezoneOffset() * 60000;
      const localNextIso = new Date(nextDate.getTime() - tzOffset).toISOString().split('T')[0];
      store.update('subscriptions', sub.id, { proximoCobro: localNextIso });

      showToast('success', '✅ Cobro confirmado', `${sub.nombre} — ${formatMoney(charge.monto)} descontado`);
      render();
    }));

    page.querySelectorAll('[data-skip-charge]').forEach(btn => btn.addEventListener('click', async () => {
      const ok = await confirmDialog('¿Omitir este cobro?', 'No se registrará como transacción. La fecha del próximo cobro no avanzará.');
      if (ok) {
        store.remove('subscription_charges', btn.dataset.skipCharge);
        showToast('info', 'Cobro omitido');
        render();
      }
    }));
  };

  function openSubModal(sub = null) {
    const modal = openModal(sub ? 'Editar Suscripción' : 'Nueva Suscripción', subForm(sub));
    if (sub?.categoriaId) setTimeout(() => { modal.querySelector('#sub-cat').value = sub.categoriaId; }, 0);

    modal.querySelector('#sub-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const source = modal.querySelector('#sub-source').value;
      if (!source) { showToast('error', 'Selecciona una cuenta o tarjeta'); return; }

      let cuentaId = '', tarjetaId = '';
      if (source.startsWith('account:')) cuentaId = source.split(':')[1];
      if (source.startsWith('card:')) tarjetaId = source.split(':')[1];

      const data = {
        nombre: modal.querySelector('#sub-name').value.trim(),
        monto: parseFloat(modal.querySelector('#sub-amount').value) || 0,
        frecuencia: modal.querySelector('#sub-freq').value,
        diaCobro: parseInt(modal.querySelector('#sub-day').value) || 1,
        categoriaId: modal.querySelector('#sub-cat').value,
        cuentaId,
        tarjetaId,
        proximoCobro: modal.querySelector('#sub-next').value,
        notas: modal.querySelector('#sub-notes').value.trim(),
        activa: true,
        estado: sub?.estado || 'activa',
      };

      if (sub) {
        store.update('subscriptions', sub.id, data);
        showToast('success', 'Suscripción actualizada');
      } else {
        if (!enforceLimit('max_subscriptions', { title: 'Has alcanzado el máximo de suscripciones' })) return;
        store.add('subscriptions', { ...data, id: generateId() });
        showToast('success', 'Suscripción creada');
      }
      closeModal();
      render();
    });
  }

  render();
  return page;
}
