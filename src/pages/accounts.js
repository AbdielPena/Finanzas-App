// ============================================
// Accounts & Products Page — Bank grouping
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { generateId, formatMoney } from '../utils.js';
import { openModal, closeModal, showToast, confirmDialog, emptyState } from '../components.js';
import { calcAccountBalance } from '../balance_engine.js';
import { enforceLimit } from '../plans_engine.js';

const BANK_COLORS = ['#6c63ff','#00d4aa','#42a5f5','#ff7043','#ab47bc','#26a69a','#ec407a','#ffa726','#5c6bc0','#8d6e63'];

function bankForm(bank = null) {
  return `
    <form id="bank-form">
      <div class="form-group">
        <label class="form-label">Nombre del Banco <span class="required">*</span></label>
        <input type="text" class="form-input" id="bank-name" value="${bank?.nombre || ''}" placeholder="Ej: Banreservas, Popular..." required />
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="color-picker-group" id="bank-color-picker">
          ${BANK_COLORS.map(c => `<div class="color-option ${bank?.color === c || (!bank && c === BANK_COLORS[0]) ? 'selected' : ''}" data-color="${c}" style="background:${c}"></div>`).join('')}
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="bank-submit-btn">${icon('check', 18)} ${bank ? 'Guardar' : 'Crear Banco'}</button>
      </div>
    </form>
  `;
}

function accountForm(account = null) {
  const banks = store.getAll('banks');
  return `
    <form id="account-form">
      <div class="form-group">
        <label class="form-label">Banco <span class="required">*</span></label>
        <select class="form-select" id="acc-bank" required>
          <option value="">Seleccionar banco</option>
          ${banks.map(b => `<option value="${b.id}" ${account?.bancoId === b.id ? 'selected' : ''}>${b.nombre}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre de la Cuenta <span class="required">*</span></label>
        <input type="text" class="form-input" id="acc-name" value="${account?.nombre || ''}" placeholder="Ej: Nómina, Ahorros..." required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-select" id="acc-type">
            <option value="ahorro" ${account?.tipo === 'ahorro' ? 'selected' : ''}>Ahorro</option>
            <option value="corriente" ${account?.tipo === 'corriente' ? 'selected' : ''}>Corriente</option>
            <option value="nómina" ${account?.tipo === 'nómina' ? 'selected' : ''}>Nómina</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Saldo Inicial</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="acc-balance" value="${account?.saldoInicial || 0}" step="0.01" />
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="acc-submit-btn">${icon('check', 18)} ${account ? 'Guardar' : 'Crear Cuenta'}</button>
      </div>
    </form>
  `;
}

function transferForm() {
  const banks = store.getAll('banks');
  return `
    <form id="transfer-form">
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">Mueve dinero de forma interna entre tus propias cuentas del mismo banco.</p>
      <div class="form-group">
        <label class="form-label">Selecciona el Banco <span class="required">*</span></label>
        <select class="form-select" id="trans-bank" required>
          <option value="">— Escoger institución —</option>
          ${banks.map(b => `<option value="${b.id}">${b.nombre}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Desde <span class="required">*</span></label>
          <select class="form-select" id="trans-source" disabled required>
            <option value="">Selecciona banco primero</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Hacia <span class="required">*</span></label>
          <select class="form-select" id="trans-target" disabled required>
            <option value="">Selecciona banco primero</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto RD$ <span class="required">*</span></label>
          <input type="number" class="form-input" id="trans-amount" placeholder="0.00" step="0.01" min="0.01" required />
        </div>
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input type="date" class="form-input" id="trans-date" value="${new Date().toISOString().split('T')[0]}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Concepto / Nota</label>
        <input type="text" class="form-input" id="trans-notes" placeholder="Ej: Reorganización de fondos" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="trans-submit-btn">${icon('transaction', 18)} Confirmar Transferencia</button>
      </div>
    </form>
  `;
}

export default function renderAccounts() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  let selectedBankId = 'todos';

  const render = () => {
    const allBanks = store.getAll('banks');
    const allAccounts = store.getAll('accounts');
    const allCards = store.getAll('cards');

    if (allBanks.length === 0 && allAccounts.length === 0 && allCards.length === 0) {
      page.innerHTML = '';
      page.appendChild(emptyState('bank', 'Sin cuentas bancarias', 'Agrega tu primer banco para comenzar a gestionar tus finanzas', 'Agregar Banco', () => openBankModal()));
      return;
    }

    const banksToRender = selectedBankId === 'todos' ? allBanks : allBanks.filter(b => b.id === selectedBankId);

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Mis Productos Financieros</h1>
          <p>Organizados por institución bancaria</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" id="add-bank-btn">${icon('plus', 18)} Banco</button>
          <button class="btn btn-secondary" id="transfer-btn">${icon('transaction', 18)} Transf. Interna</button>
          <button class="btn btn-primary" id="add-account-btn">${icon('plus', 18)} Cuenta</button>
        </div>
      </div>

      <!-- Wallet Cards Overview (new visual layer) -->
      ${allAccounts.length > 0 ? `
        <div class="wallet-grid">
          ${allAccounts.map(acc => {
            const bank = allBanks.find(b => b.id === acc.bancoId);
            const bal = calcAccountBalance(acc.id);
            const c1 = bank?.color || 'var(--accent)';
            const c2 = bank?.color ? `${bank.color}CC` : 'var(--accent-hover)';
            return `
              <div class="wallet-card" style="--wc-a:${c1};--wc-b:${c2}" data-filter-bank="${bank?.id || ''}">
                <div>
                  <div class="wallet-card-bank">${bank?.nombre || 'Sin banco'}</div>
                  <div class="wallet-card-name">${acc.nombre}</div>
                </div>
                <div class="wallet-card-foot">
                  <div>
                    <span class="wallet-card-type">${acc.tipo || 'General'}</span>
                    <div class="wallet-card-balance">${formatMoney(bal)}</div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <!-- Bank Filter -->
      <div class="table-toolbar" style="margin-bottom: 24px;">
        <div class="table-filters" style="display:flex;gap:10px;overflow-x:auto;padding-bottom:10px;">
          <button class="table-filter-chip ${selectedBankId === 'todos' ? 'active' : ''}" data-filter-bank="todos">${icon('bank', 14)} Todos los Bancos</button>
          ${allBanks.map(b => `
            <button class="table-filter-chip ${selectedBankId === b.id ? 'active' : ''}" data-filter-bank="${b.id}">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${b.color || '#fff'};margin-right:6px"></span>${b.nombre}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Banks List -->
      <div class="stagger-children">
        ${banksToRender.map(bank => {
          const bAccounts = allAccounts.filter(a => a.bancoId === bank.id);
          const bCards = allCards.filter(c => c.bancoId === bank.id);
          
          let sumAcc = 0;
          bAccounts.forEach(a => { sumAcc += calcAccountBalance(a.id); });
          
          let sumCards = 0;
          bCards.forEach(c => { sumCards += parseFloat(c.saldoUsado) || 0; });
          
          const netTotal = sumAcc - sumCards;

          return `
            <div class="card" style="margin-bottom:24px; border: 1px solid rgba(255,255,255,0.05); overflow:hidden">
              <!-- Bank Header -->
              <div style="background: linear-gradient(90deg, ${bank.color ? bank.color+'22' : 'rgba(255,255,255,0.05)'} 0%, transparent 100%); padding: 20px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${bank.color || 'var(--accent-primary)'}">
                <div>
                  <h2 style="margin:0 0 5px 0; display:flex; align-items:center; gap:10px; font-size:1.4rem">
                    ${bank.nombre}
                  </h2>
                  <div style="font-size:0.85rem; color:var(--text-secondary)">
                    ${bAccounts.length} Cuenta(s) líquidas • ${bCards.length} Tarjeta(s) de crédito
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:0.85rem; color:var(--text-secondary)">Capital Neto en Banco</div>
                  <div style="font-size:1.5rem; font-weight:700; color:${netTotal >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">${formatMoney(netTotal)}</div>
                  <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end">
                    <button class="btn btn-ghost btn-sm" data-edit-bank="${bank.id}">${icon('edit', 14)} Editar</button>
                    <button class="btn btn-ghost btn-sm danger" data-delete-bank="${bank.id}">${icon('trash', 14)}</button>
                  </div>
                </div>
              </div>

              <!-- Bank Products -->
              <div style="padding: 20px;">
                <!-- Cuentas Section -->
                <div style="margin-bottom: ${bCards.length > 0 ? '24px' : '0'}">
                  <h3 style="font-size:1.1rem; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; color:var(--color-info)">
                    <span>${icon('bank', 16)} Cuentas Bancarias</span>
                    <span style="font-size:0.9rem">${formatMoney(sumAcc)}</span>
                  </h3>
                  ${bAccounts.length > 0 ? `
                    <div class="table-container" style="background:var(--bg-card); border-radius:var(--radius-md)">
                      <table class="data-table" style="margin:0">
                        <thead style="background:transparent">
                          <tr>
                            <th style="padding-left:16px">Nombre de Cuenta</th>
                            <th>Tipo</th>
                            <th class="right">Saldo Disponible</th>
                            <th class="right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${bAccounts.map(acc => {
                            const bal = calcAccountBalance(acc.id);
                            return `
                              <tr>
                                <td style="padding-left:16px"><strong style="color:var(--text-primary)">${acc.nombre}</strong></td>
                                <td><span class="badge badge-neutral">${acc.tipo || 'General'}</span></td>
                                <td class="right cell-amount ${bal >= 0 ? 'income' : 'expense'}">${formatMoney(bal)}</td>
                                <td class="cell-actions">
                                  <button class="cell-action-btn" data-edit-acc="${acc.id}" title="Editar">${icon('edit', 16)}</button>
                                  <button class="cell-action-btn danger" data-delete-acc="${acc.id}" title="Eliminar">${icon('trash', 16)}</button>
                                </td>
                              </tr>
                            `;
                          }).join('')}
                        </tbody>
                      </table>
                    </div>
                  ` : '<div style="color:var(--text-muted);font-size:0.85rem;padding:10px 16px;background:var(--bg-body);border-radius:var(--radius-sm)">Sin cuentas monetarias registradas en esta institución.</div>'}
                </div>

                <!-- Tarjetas Section -->
                ${bCards.length > 0 ? `
                  <div>
                    <h3 style="font-size:1.1rem; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; color:var(--color-expense)">
                      <span>${icon('creditCard', 16)} Tarjetas de Crédito</span>
                      <span style="font-size:0.9rem">Deuda: ${formatMoney(sumCards)}</span>
                    </h3>
                    <div class="table-container" style="background:var(--bg-card); border-radius:var(--radius-md)">
                      <table class="data-table" style="margin:0">
                        <thead style="background:transparent">
                          <tr>
                            <th style="padding-left:16px">Producto</th>
                            <th>Límite</th>
                            <th class="right">Balance Consumido</th>
                            <th class="right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${bCards.map(card => {
                            const limite = parseFloat(card.limiteCredito) || 0;
                            const consumido = parseFloat(card.saldoUsado) || 0;
                            return `
                              <tr>
                                <td style="padding-left:16px"><strong style="color:var(--text-primary)">${card.nombre}</strong></td>
                                <td style="color:var(--text-secondary)">${formatMoney(limite)}</td>
                                <td class="right cell-amount expense">${formatMoney(consumido)}</td>
                                <td class="cell-actions">
                                  <button class="cell-action-btn summary-link" onclick="location.hash='#/cards'" title="Ir a Tarjetas">${icon('eye', 16)}</button>
                                </td>
                              </tr>
                            `;
                          }).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ` : `<div style="display:none"></div>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Event Listeners
    page.querySelector('#add-bank-btn')?.addEventListener('click', () => openBankModal());
    page.querySelector('#add-account-btn')?.addEventListener('click', () => openAccountModal());
    page.querySelector('#transfer-btn')?.addEventListener('click', () => openTransferModal());
    
    // Filter by bank
    page.querySelectorAll('[data-filter-bank]').forEach(btn => btn.addEventListener('click', () => {
      selectedBankId = btn.dataset.filterBank;
      render();
    }));

    page.querySelectorAll('[data-edit-bank]').forEach(btn => btn.addEventListener('click', () => {
      const bank = store.getById('banks', btn.dataset.editBank);
      if (bank) openBankModal(bank);
    }));
    page.querySelectorAll('[data-delete-bank]').forEach(btn => btn.addEventListener('click', async () => {
      const ok = await confirmDialog('¿Eliminar institución bancaria?', 'Se eliminará el banco y TODAS sus cuentas asociadas permanentemente.');
      if (ok) {
        const bankId = btn.dataset.deleteBank;
        store.filter('accounts', a => a.bancoId === bankId).forEach(a => store.remove('accounts', a.id));
        // Remove cards too? For safety, let's also cascade delete cards for this bank (or just wait for user to use cards view)
        store.filter('cards', c => c.bancoId === bankId).forEach(c => store.remove('cards', c.id));
        store.remove('banks', bankId);
        showToast('success', 'Banco y productos eliminados');
        if (selectedBankId === bankId) selectedBankId = 'todos';
        render();
      }
    }));
    page.querySelectorAll('[data-edit-acc]').forEach(btn => btn.addEventListener('click', () => {
      const acc = store.getById('accounts', btn.dataset.editAcc);
      if (acc) openAccountModal(acc);
    }));
    page.querySelectorAll('[data-delete-acc]').forEach(btn => btn.addEventListener('click', async () => {
      const ok = await confirmDialog('¿Eliminar cuenta bancaria?', 'Solo se borrará el registro de la cuenta, pero las transacciones asociadas quedarán huérfanas.');
      if (ok) { store.remove('accounts', btn.dataset.deleteAcc); showToast('success', 'Cuenta eliminada'); render(); }
    }));
  };

  function openBankModal(bank = null) {
    const modal = openModal(bank ? 'Editar Institución' : 'Nueva Institución', bankForm(bank));
    
    // Handle Colors
    modal.querySelectorAll('.color-option').forEach(opt => {
      opt.addEventListener('click', () => {
        modal.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });

    const form = modal.querySelector('#bank-form');
    const submitBtn = modal.querySelector('#bank-submit-btn');

    form.onsubmit = (e) => {
      e.preventDefault();
      if (submitBtn.disabled) return;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Guardando...';

      setTimeout(() => {
        try {
          const nombre = modal.querySelector('#bank-name').value.trim();
          const selected = modal.querySelector('.color-option.selected');
          const color = selected ? selected.dataset.color : BANK_COLORS[0];
          
          if (bank) {
            store.update('banks', bank.id, { nombre, color });
            showToast('success', 'Datos guardados correctamente');
          } else {
            store.add('banks', { id: generateId(), nombre, color, icono: '' });
            showToast('success', 'Institución creada');
          }
          closeModal();
          render();
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = icon('check', 18) + ' ' + (bank ? 'Guardar' : 'Crear Banco');
          showToast('error', 'Ocurrió un error al guardar');
        }
      }, 100);
    };
  }

  function openAccountModal(account = null) {
    if (store.getAll('banks').length === 0) {
      showToast('warning', 'Primero debes registrar una institución (banco)');
      return openBankModal();
    }
    const modal = openModal(account ? 'Editar Cuenta' : 'Nueva Cuenta', accountForm(account));
    
    const form = modal.querySelector('#account-form');
    const submitBtn = modal.querySelector('#acc-submit-btn');

    form.onsubmit = (e) => {
      e.preventDefault();
      if (submitBtn.disabled) return;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Guardando...';

      setTimeout(() => {
        try {
          const data = {
            bancoId: modal.querySelector('#acc-bank').value,
            nombre: modal.querySelector('#acc-name').value.trim(),
            tipo: modal.querySelector('#acc-type').value,
            saldoInicial: parseFloat(modal.querySelector('#acc-balance').value) || 0,
            activa: true,
          };
          if (account) {
            store.update('accounts', account.id, data);
            showToast('success', 'Cuenta bancaria actualizada');
          } else {
            if (!enforceLimit('max_accounts', { title: 'Has alcanzado el máximo de cuentas' })) return;
            store.add('accounts', { ...data, id: generateId() });
            showToast('success', 'Cuenta bancaria creada');
          }
          closeModal();
          render();
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = icon('check', 18) + ' ' + (account ? 'Guardar' : 'Crear Cuenta');
          showToast('error', 'Ocurrió un error al registrar la cuenta');
        }
      }, 100);
    };
  }

  function openTransferModal() {
    if (store.getAll('accounts').length < 2) {
      showToast('warning', 'Necesitas al menos 2 cuentas para realizar una transferencia.');
      return;
    }
    const modal = openModal('Transferencia Interna', transferForm());
    const bankSel = modal.querySelector('#trans-bank');
    const sourceSel = modal.querySelector('#trans-source');
    const targetSel = modal.querySelector('#trans-target');
    const form = modal.querySelector('#transfer-form');

    bankSel.addEventListener('change', () => {
      const bankId = bankSel.value;
      if (!bankId) {
        sourceSel.disabled = targetSel.disabled = true;
        sourceSel.innerHTML = targetSel.innerHTML = '<option value="">Selecciona banco primero</option>';
        return;
      }
      const accs = store.filter('accounts', a => a.bancoId === bankId);
      if (accs.length < 2) {
        showToast('info', 'Este banco no tiene suficientes cuentas para transferencias internas.');
        sourceSel.disabled = targetSel.disabled = true;
        sourceSel.innerHTML = targetSel.innerHTML = '<option value="">Faltan cuentas</option>';
        return;
      }
      const options = accs.map(a => `<option value="${a.id}">${a.nombre} (${formatMoney(calcAccountBalance(a.id))})</option>`).join('');
      sourceSel.innerHTML = options;
      targetSel.innerHTML = options;
      // Tratar de que no sean el mismo por defecto
      if (targetSel.options.length > 1) targetSel.selectedIndex = 1;

      sourceSel.disabled = targetSel.disabled = false;
    });

    form.onsubmit = (e) => {
      e.preventDefault();
      const originId = sourceSel.value;
      const targetId = targetSel.value;
      const amount = parseFloat(modal.querySelector('#trans-amount').value);

      if (originId === targetId) {
        showToast('error', 'La cuenta de origen y destino no pueden ser la misma.');
        return;
      }

      const balance = calcAccountBalance(originId);
      if (balance < amount) {
        showToast('error', `Saldo insuficiente. Tienes ${formatMoney(balance)} disponible.`);
        return;
      }

      store.add('transactions', {
        id: generateId(),
        tipo: 'transferencia',
        monto: amount,
        descripcion: modal.querySelector('#trans-notes').value.trim() || 'Transferencia Interna',
        cuentaId: originId,       // De donde sale
        cuentaDestinoId: targetId, // A donde llega
        fecha: modal.querySelector('#trans-date').value,
        estado: 'activo',
        notas: `Transferencia interna entre cuentas del mismo banco`
      });

      showToast('success', 'Transferencia ejecutada con éxito');
      closeModal();
      render();
    };
  }

  render();
  return page;
}
