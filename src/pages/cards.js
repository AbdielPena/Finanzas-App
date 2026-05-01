// ============================================
// Cards Page — Credit cards management
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { generateId, formatMoney, percentage } from '../utils.js';
import { openModal, closeModal, showToast, confirmDialog, emptyState } from '../components.js';
import { getAssistantWidgetHTML } from '../credit_assistant.js';
import { enforceLimit } from '../plans_engine.js';

function cardForm(card = null) {
  const banks = store.getAll('banks');
  return `
    <form id="card-form">
      <div class="form-group">
        <label class="form-label">Banco</label>
        <select class="form-select" id="card-bank">
          <option value="">Sin banco / Otro</option>
          ${banks.map(b => `<option value="${b.id}" ${card?.bancoId === b.id ? 'selected' : ''}>${b.nombre}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre de la Tarjeta <span class="required">*</span></label>
        <input type="text" class="form-input" id="card-name" value="${card?.nombre || ''}" placeholder="Ej: Visa Gold, MasterCard..." required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Límite de Crédito <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="card-limit" value="${card?.limiteCredito || ''}" step="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Límite con Sobregiro</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="card-overdraft" value="${card?.limiteSobregiro || ''}" step="0.01" placeholder="Dejar vacío si aplica igual" />
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Saldo Usado</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="card-used" value="${card?.saldoUsado || 0}" step="0.01" />
          </div>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Tasa Interés (%)</label>
          <input type="number" class="form-input" id="card-rate" value="${card?.tasaInteres || ''}" step="0.01" placeholder="Ej: 3.5" />
        </div>
        <div class="form-group">
          <label class="form-label">Día de Corte</label>
          <input type="number" class="form-input" id="card-cut" value="${card?.diaCorte || ''}" min="1" max="31" placeholder="1-31" />
        </div>
        <div class="form-group">
          <label class="form-label">Día de Pago</label>
          <input type="number" class="form-input" id="card-pay" value="${card?.diaPago || ''}" min="1" max="31" placeholder="1-31" />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check', 18)} ${card ? 'Guardar' : 'Agregar Tarjeta'}</button>
      </div>
    </form>
  `;
}

function payCardForm(card) {
  const accounts = store.getAll('accounts').filter(a => a.activa !== false);
  return `
    <form id="pay-card-form">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Saldo actual de la tarjeta</div>
        <div style="font-size:1.5rem;font-weight:700;color:var(--color-expense);font-family:var(--font-heading)">${formatMoney(card.saldoUsado)}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Monto a Pagar <span class="required">*</span></label>
        <div class="input-prefix-wrapper">
          <span class="input-prefix">RD$</span>
          <input type="number" class="form-input" id="pay-amount" value="${card.saldoUsado}" step="0.01" max="${card.saldoUsado}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Desde Cuenta</label>
        <select class="form-select" id="pay-account">
          <option value="">Sin cuenta origen (solo ajustar tarjeta)</option>
          ${accounts.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-success">${icon('check', 18)} Pagar</button>
      </div>
    </form>
  `;
}

export default function renderCards() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const render = () => {
    const cards = store.getAll('cards');

    if (cards.length === 0) {
      page.innerHTML = '';
      page.appendChild(emptyState('creditCard', 'Sin tarjetas de crédito', 'Agrega tus tarjetas para controlar tus límites y gastos', 'Agregar Tarjeta', () => openCardModal()));
      return;
    }

    const totalLimit = cards.reduce((s, c) => s + (parseFloat(c.limiteCredito) || 0), 0);
    const totalUsed = cards.reduce((s, c) => s + (parseFloat(c.saldoUsado) || 0), 0);
    const totalAvailable = totalLimit - totalUsed;

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Tarjetas de Crédito</h1>
          <p>${cards.length} tarjeta${cards.length !== 1 ? 's' : ''} registrada${cards.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-card-btn">${icon('plus', 18)} Nueva Tarjeta</button>
        </div>
      </div>

      <!-- Summary -->
      <div class="grid grid-3" style="margin-bottom:28px">
        <div class="stat-card">
          <div class="stat-icon accent">${icon('creditCard', 24)}</div>
          <div class="stat-content">
            <div class="stat-label">Límite Total</div>
            <div class="stat-value">${formatMoney(totalLimit)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon expense">${icon('trendingDown', 24)}</div>
          <div class="stat-content">
            <div class="stat-label">Saldo Usado</div>
            <div class="stat-value">${formatMoney(totalUsed)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon income">${icon('trendingUp', 24)}</div>
          <div class="stat-content">
            <div class="stat-label">Disponible</div>
            <div class="stat-value">${formatMoney(totalAvailable)}</div>
          </div>
        </div>
      </div>

      <!-- Cards grid -->
      <div class="grid grid-auto stagger-children">
        ${cards.map(card => {
          const bank = card.bancoId ? store.getById('banks', card.bancoId) : null;
          const used = parseFloat(card.saldoUsado) || 0;
          const limit = parseFloat(card.limiteCredito) || 1;
          const pct = percentage(used, limit);
          const barColor = pct >= 90 ? 'var(--color-expense)' : pct >= 70 ? 'var(--color-warning)' : 'var(--accent-primary)';
          return `
            <div class="card" style="position:relative;overflow:hidden">
              <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${bank?.color || 'var(--accent-primary)'}"></div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
                <div>
                  <h4 style="margin-bottom:2px">${card.nombre}</h4>
                  <span style="font-size:0.75rem;color:var(--text-muted)">${bank?.nombre || 'Sin banco'} ${card.diaCorte ? `• Corte: ${card.diaCorte}` : ''} ${card.diaPago ? `• Pago: ${card.diaPago}` : ''}</span>
                </div>
                <div style="display:flex;gap:4px">
                  <button class="btn-icon" data-pay-card="${card.id}" title="Pagar">${icon('dollarSign', 16)}</button>
                  <button class="btn-icon" data-edit-card="${card.id}" title="Editar">${icon('edit', 16)}</button>
                  <button class="btn-icon" data-del-card="${card.id}" title="Eliminar">${icon('trash', 16)}</button>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.8rem">
                <span style="color:var(--text-secondary)">Usado</span>
                <span style="font-weight:600">${formatMoney(used)} <span style="color:var(--text-muted);font-weight:400">/ ${formatMoney(limit)}</span></span>
              </div>
              <div class="progress-bar" style="margin-bottom:12px">
                <div class="progress-fill" style="width:${pct}%;background:${barColor}"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:0.8rem">
                <span style="color:var(--text-secondary)">Disponible</span>
                <span style="color:var(--color-income);font-weight:600">${formatMoney(limit - used)}</span>
              </div>
              ${card.limiteSobregiro && card.limiteSobregiro > limit ? `
              <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-top:4px">
                <span style="color:var(--text-muted)">Con Sobregiro</span>
                <span style="color:var(--text-secondary)">${formatMoney(card.limiteSobregiro - used)}</span>
              </div>` : ''}
              ${card.tasaInteres ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:8px;margin-bottom:8px">Tasa: ${card.tasaInteres}%</div>` : ''}
              
              <!-- Assistant Injection -->
              ${getAssistantWidgetHTML(card, false)}
            </div>
          `;
        }).join('')}
      </div>
    `;

    page.querySelector('#add-card-btn')?.addEventListener('click', () => openCardModal());
    page.querySelectorAll('[data-edit-card]').forEach(btn => btn.addEventListener('click', () => {
      const card = store.getById('cards', btn.dataset.editCard);
      if (card) openCardModal(card);
    }));
    page.querySelectorAll('[data-del-card]').forEach(btn => btn.addEventListener('click', async () => {
      const ok = await confirmDialog('¿Eliminar tarjeta?', 'Esta acción no se puede deshacer.');
      if (ok) { store.remove('cards', btn.dataset.delCard); showToast('success', 'Tarjeta eliminada'); render(); }
    }));
    page.querySelectorAll('[data-pay-card]').forEach(btn => btn.addEventListener('click', () => {
      const card = store.getById('cards', btn.dataset.payCard);
      if (card) openPayModal(card);
    }));
  };

  function openCardModal(card = null) {
    const modal = openModal(card ? 'Editar Tarjeta' : 'Nueva Tarjeta', cardForm(card));
    modal.querySelector('#card-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        bancoId: modal.querySelector('#card-bank').value,
        nombre: modal.querySelector('#card-name').value.trim(),
        limiteCredito: parseFloat(modal.querySelector('#card-limit').value) || 0,
        limiteSobregiro: parseFloat(modal.querySelector('#card-overdraft').value) || parseFloat(modal.querySelector('#card-limit').value) || 0,
        saldoUsado: parseFloat(modal.querySelector('#card-used').value) || 0,
        tasaInteres: parseFloat(modal.querySelector('#card-rate').value) || 0,
        diaCorte: parseInt(modal.querySelector('#card-cut').value) || null,
        diaPago: parseInt(modal.querySelector('#card-pay').value) || null,
        activa: true,
      };
      if (card) {
        store.update('cards', card.id, data);
        showToast('success', 'Tarjeta actualizada');
      } else {
        if (!enforceLimit('max_cards', { title: 'Has alcanzado el máximo de tarjetas' })) return;
        store.add('cards', { ...data, id: generateId() });
        showToast('success', 'Tarjeta agregada');
      }
      closeModal();
      render();
    });
  }

  function openPayModal(card) {
    const modal = openModal(`Pagar: ${card.nombre}`, payCardForm(card));
    modal.querySelector('#pay-card-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(modal.querySelector('#pay-amount').value) || 0;
      const accountId = modal.querySelector('#pay-account').value;
      if (amount <= 0) { showToast('error', 'Monto inválido'); return; }
      // Update card balance
      const newUsed = Math.max(0, (parseFloat(card.saldoUsado) || 0) - amount);
      store.update('cards', card.id, { saldoUsado: newUsed });
      // Create transaction if account selected
      if (accountId) {
        store.add('transactions', {
          id: generateId(),
          tipo: 'gasto',
          monto: amount,
          descripcion: `Pago a tarjeta: ${card.nombre}`,
          categoriaId: 'cat_debt_payment',
          cuentaId: accountId,
          tarjetaId: card.id,
          fecha: new Date().toISOString().split('T')[0],
          notas: 'Pago de tarjeta de crédito',
        });
      }
      showToast('success', 'Pago registrado', `Se abonaron ${formatMoney(amount)} a ${card.nombre}`);
      closeModal();
      render();
    });
  }

  render();
  return page;
}
