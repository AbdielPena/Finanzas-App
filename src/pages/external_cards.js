// ============================================
// External Cards Page — Third party credit cards
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { generateId, formatMoney, percentage, formatDate } from '../utils.js';
import { openModal, closeModal, showToast, confirmDialog, emptyState } from '../components.js';
import { getAssistantWidgetHTML } from '../credit_assistant.js';
import { enforceLimit } from '../plans_engine.js';

function cardForm(card = null) {
  return `
    <form id="ext-card-form">
      <div class="form-group">
        <label class="form-label">Nombre o Alias de Tarjeta <span class="required">*</span></label>
        <input type="text" class="form-input" id="ecc-name" value="${card?.nombre || ''}" placeholder="Ej: Visa Azul, Amex..." required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Titular / Propietario <span class="required">*</span></label>
          <input type="text" class="form-input" id="ecc-owner" value="${card?.titular || ''}" placeholder="Ej: Esposa, Pedro..." required />
        </div>
        <div class="form-group">
          <label class="form-label">Banco <span class="required">*</span></label>
          <input type="text" class="form-input" id="ecc-bank" value="${card?.banco || ''}" placeholder="Ej: BHD, Popular..." required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Límite de Crédito <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="ecc-limit" value="${card?.limiteCredito || ''}" step="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Balance Actual Usado</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="ecc-used" value="${card?.saldoUsado || 0}" step="0.01" />
          </div>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Tasa Interés (%)</label>
          <input type="number" class="form-input" id="ecc-rate" value="${card?.tasaInteres || ''}" step="0.01" placeholder="Ej: 3.5" />
        </div>
        <div class="form-group">
          <label class="form-label">Día Corte</label>
          <input type="number" class="form-input" id="ecc-cut" value="${card?.diaCorte || ''}" min="1" max="31" placeholder="1-31" />
        </div>
        <div class="form-group">
          <label class="form-label">Día Pago</label>
          <input type="number" class="form-input" id="ecc-pay" value="${card?.diaPago || ''}" min="1" max="31" placeholder="1-31" />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check', 18)} ${card ? 'Guardar' : 'Agregar Tarjeta'}</button>
      </div>
    </form>
  `;
}

function txForm(card) {
  const accounts = store.getAll('accounts').filter(a => a.activa !== false);
  return `
    <form id="ext-tx-form">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Balance actual de la tarjeta</div>
        <div style="font-size:1.5rem;font-weight:700;color:var(--color-expense);font-family:var(--font-heading)">${formatMoney(card.saldoUsado)}</div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo de Movimiento</label>
          <select class="form-select" id="ext-tx-type" required>
            <option value="consumo">Consumo (Sube la deuda)</option>
            <option value="pago" selected>Pago (Baja la deuda)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Monto (RD$) <span class="required">*</span></label>
          <input type="number" class="form-input" id="ext-tx-amount" step="0.01" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Concepto</label>
        <input type="text" class="form-input" id="ext-tx-desc" placeholder="Ej: Pago de cuota, Compra súper..." required />
      </div>

      <div class="form-group" id="bank-link-group">
        <label class="form-label">¿De dónde salió el dinero?</label>
        <select class="form-select" id="ext-tx-account">
          <option value="">Fue dinero externo / No tocar mis cuentas</option>
          ${accounts.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('')}
        </select>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Si seleccionas una de tus cuentas, se registrará el retiro en tu historial personal.</div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check', 18)} Registrar Movimiento</button>
      </div>
    </form>
  `;
}

export default function renderExternalCards() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const render = () => {
    const cards = store.getAll('external_cards');

    if (cards.length === 0) {
      page.innerHTML = '';
      page.appendChild(emptyState('creditCard', 'Sin Tarjetas Externas', 'Lleva el control de plásticos de formato corporativo, cónyuge o familiares sin afectar tu propio patrimonio.', 'Agregar Tarjeta Externa', () => openCardModal()));
      return;
    }

    const totalLimit = cards.reduce((s, c) => s + (parseFloat(c.limiteCredito) || 0), 0);
    const totalUsed = cards.reduce((s, c) => s + (parseFloat(c.saldoUsado) || 0), 0);
    const totalAvailable = totalLimit - totalUsed;

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Tarjetas Externas</h1>
          <p>Plásticos gestionados por terceros (No afectan net worth)</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-ext-btn">${icon('plus', 18)} Nueva Tarjeta</button>
        </div>
      </div>

      <!-- Summary -->
      <div class="grid grid-3" style="margin-bottom:28px">
        <div class="stat-card" style="background:var(--bg-secondary); border: 1px dashed var(--border-color)">
          <div class="stat-icon info">${icon('creditCard', 24)}</div>
          <div class="stat-content">
            <div class="stat-label">Límite Ajenos</div>
            <div class="stat-value">${formatMoney(totalLimit)}</div>
          </div>
        </div>
        <div class="stat-card" style="background:var(--bg-secondary); border: 1px dashed var(--border-color)">
          <div class="stat-icon expense">${icon('trendingDown', 24)}</div>
          <div class="stat-content">
            <div class="stat-label">Deuda Externa Total</div>
            <div class="stat-value">${formatMoney(totalUsed)}</div>
          </div>
        </div>
        <div class="stat-card" style="background:var(--bg-secondary); border: 1px dashed var(--border-color)">
          <div class="stat-icon warning">${icon('info', 24)}</div>
          <div class="stat-content">
            <div class="stat-label">Total Tarjetas</div>
            <div class="stat-value">${cards.length}</div>
          </div>
        </div>
      </div>

      <!-- Cards grid -->
      <div class="grid grid-auto stagger-children">
        ${cards.map(card => {
          const used = parseFloat(card.saldoUsado) || 0;
          const limit = parseFloat(card.limiteCredito) || 1;
          const pct = percentage(used, limit);
          const barColor = pct >= 90 ? 'var(--color-expense)' : pct >= 70 ? 'var(--color-warning)' : 'var(--accent-primary)';
          
          return `
            <div class="card" style="position:relative;overflow:hidden">
              <div style="position:absolute;top:0;left:0;right:0;height:3px;background:var(--color-warning)"></div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
                <div>
                  <h4 style="margin-bottom:2px">${card.nombre}</h4>
                  <span style="font-size:0.75rem;color:var(--text-muted)">Banco: ${card.banco} • Titular: <strong>${card.titular}</strong></span>
                </div>
                <div style="display:flex;gap:4px">
                  <button class="btn-icon" data-tx-ext="${card.id}" title="Movimiento">${icon('dollarSign', 16)}</button>
                  <button class="btn-icon" data-hist-ext="${card.id}" title="Historial">${icon('fileText', 16)}</button>
                  <button class="btn-icon" data-edit-ext="${card.id}" title="Editar">${icon('edit', 16)}</button>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.8rem">
                <span style="color:var(--text-secondary)">Deuda:</span>
                <span style="font-weight:600;color:var(--color-expense)">${formatMoney(used)} <span style="color:var(--text-muted);font-weight:400">/ ${formatMoney(limit)}</span></span>
              </div>
              <div class="progress-bar" style="margin-bottom:12px">
                <div class="progress-fill" style="width:${pct}%;background:${barColor}"></div>
              </div>
              
              <!-- Assistant Injection -->
              ${getAssistantWidgetHTML(card, true)}

            </div>
          `;
        }).join('')}
      </div>
    `;

    page.querySelector('#add-ext-btn')?.addEventListener('click', () => openCardModal());
    page.querySelectorAll('[data-edit-ext]').forEach(btn => btn.addEventListener('click', () => {
      const card = store.getById('external_cards', btn.dataset.editExt);
      if (card) openCardModal(card);
    }));
    page.querySelectorAll('[data-tx-ext]').forEach(btn => btn.addEventListener('click', () => {
      const card = store.getById('external_cards', btn.dataset.txExt);
      if (card) openTxModal(card);
    }));
    page.querySelectorAll('[data-hist-ext]').forEach(btn => btn.addEventListener('click', () => {
      openHistoryModal(btn.dataset.histExt);
    }));
  };

  function openCardModal(card = null) {
    const modal = openModal(card ? 'Editar Tarjeta Externa' : 'Nueva Tarjeta Externa', cardForm(card));
    
    modal.querySelector('#ext-card-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        nombre: modal.querySelector('#ecc-name').value.trim(),
        titular: modal.querySelector('#ecc-owner').value.trim(),
        banco: modal.querySelector('#ecc-bank').value.trim(),
        limiteCredito: parseFloat(modal.querySelector('#ecc-limit').value) || 0,
        saldoUsado: parseFloat(modal.querySelector('#ecc-used').value) || 0,
        tasaInteres: parseFloat(modal.querySelector('#ecc-rate').value) || null,
        diaCorte: parseInt(modal.querySelector('#ecc-cut').value) || null,
        diaPago: parseInt(modal.querySelector('#ecc-pay').value) || null
      };

      if (card) {
        store.update('external_cards', card.id, data);
        showToast('success', 'Tarjeta externa actualizada');
      } else {
        if (!enforceLimit('max_external_cards', { title: 'Has alcanzado el máximo de tarjetas externas' })) return;
        store.add('external_cards', { ...data, id: generateId() });
        showToast('success', 'Tarjeta externa creada');
      }
      closeModal();
      render();
    });
  }

  function openTxModal(card) {
    const modal = openModal('Registrar Movimiento Externo', txForm(card));
    const typeSelect = modal.querySelector('#ext-tx-type');
    const accGroup = modal.querySelector('#bank-link-group');

    // Only show "Bank select" when paying
    typeSelect.addEventListener('change', () => {
      if(typeSelect.value === 'pago') {
        accGroup.style.display = 'block';
      } else {
        accGroup.style.display = 'none';
        modal.querySelector('#ext-tx-account').value = '';
      }
    });

    modal.querySelector('#ext-tx-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const type = typeSelect.value;
      const amount = parseFloat(modal.querySelector('#ext-tx-amount').value);
      const desc = modal.querySelector('#ext-tx-desc').value.trim();
      const accountId = modal.querySelector('#ext-tx-account').value;

      if (!amount || amount <= 0) { showToast('error', 'El monto debe ser mayor a cero'); return; }
      
      let newBalance = parseFloat(card.saldoUsado) || 0;
      if (type === 'consumo') {
        newBalance += amount;
      } else {
        newBalance -= amount;
        if(newBalance < 0) newBalance = 0;
      }

      // 1. Update Card Balance
      store.update('external_cards', card.id, { saldoUsado: newBalance });

      // 2. Save External Tx Record
      store.add('external_transactions', {
        id: generateId(),
        tarjetaId: card.id,
        tipo: type,
        monto: amount,
        descripcion: desc,
        fecha: new Date().toISOString()
      });

      // 3. If paying from personal account, deduct from personal finances
      if (type === 'pago' && accountId) {
        store.add('transactions', {
          id: generateId(),
          tipo: 'gasto',
          cuentaId: accountId,
          monto: amount,
          descripcion: `Pago a Tarjeta: ${card.nombre} (${card.titular})`,
          fecha: new Date().toISOString().split('T')[0],
          categoriaId: 'cat_ext_card',
          aplicaDiezmo: false
        });
      }

      showToast('success', 'Movimiento registrado correctamente');
      closeModal();
      render();
    });
  }

  function openHistoryModal(cardId) {
    const card = store.getById('external_cards', cardId);
    let txs = store.getAll('external_transactions').filter(t => t.tarjetaId === cardId);
    txs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    let html = '';
    if (txs.length === 0) {
      html = '<div style="text-align:center;padding:20px;color:var(--text-muted)">No hay registros.</div>';
    } else {
      html = `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha / Concepto</th>
                <th class="right">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${txs.map(t => {
                const color = t.tipo === 'pago' ? 'var(--color-income)' : 'var(--color-expense)';
                const sign = t.tipo === 'pago' ? '-' : '+';
                return `
                  <tr>
                    <td>
                      <div style="font-weight:500">${t.descripcion}</div>
                      <div style="font-size:0.75rem;color:var(--text-muted)">${formatDate(t.fecha)} • ${t.tipo.toUpperCase()}</div>
                    </td>
                    <td class="right" style="color:${color};font-weight:600">${sign}${formatMoney(t.monto)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    html += `<button class="btn btn-secondary btn-block" style="margin-top:15px" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cerrar</button>`;
    openModal(`Historial - ${card.nombre}`, html);
  }

  render();
  store.on('external_cards', render); // bind logic to rerender when background changes
  return page;
}
