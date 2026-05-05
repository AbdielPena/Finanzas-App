// ============================================
// Tithe Page — 10% calculation module with Net Deductions
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { formatMoney, getCurrentMonth, getMonthName, percentage, generateId, getToday, formatDate } from '../utils.js';
import { openModal, closeModal, showToast, confirmDialog } from '../components.js';

function getBaseTransactions(period) {
  return store.filter('transactions', t => 
    t.tipo === 'ingreso' &&
    (t.aplicaDiezmo === true || t.categoriaId === 'cat_salary' || (t.aplicaDiezmo === undefined)) && 
    t.fecha && t.fecha.startsWith(period)
  );
}

function getDeductions(period) {
  return store.filter('tithe_deductions', d => d.periodo === period);
}

function getTitheRecord(period) {
  return store.find('tithe', t => t.periodo === period);
}

function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export default function renderTithe() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const render = () => {
    const currentMonth = getCurrentMonth();
    const months = getLast6Months();

    // Math for current month
    const validTransactions = getBaseTransactions(currentMonth);
    const grossIncome = validTransactions.reduce((s, t) => s + (parseFloat(t.monto) || 0), 0);
    
    const deductions = getDeductions(currentMonth);
    const totalDeductions = deductions.reduce((s, d) => s + (parseFloat(d.monto) || 0), 0);

    const netBase = Math.max(0, grossIncome - totalDeductions);
    const tithePercent = parseFloat(store.getSetting('tithe_percentage', 10)) || 10;
    const currentTithe = netBase * (tithePercent / 100);
    
    const currentRecord = getTitheRecord(currentMonth);
    const currentPaid = currentRecord ? (parseFloat(currentRecord.montoPagado) || 0) : 0;
    const pct = currentTithe > 0 ? percentage(currentPaid, currentTithe) : 0;

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Cálculo de ingresos por porcentaje</h1>
          <p>Aplica el ${tithePercent}% sobre tu base neta — supervisa ingresos, excepciones y la cantidad a apartar</p>
        </div>
        <div class="page-header-actions">
          <div style="display:flex;align-items:center;gap:8px;background:var(--bg-card);padding:8px 14px;border-radius:10px;border:1px solid var(--border)">
            <label style="font-size:0.85rem;color:var(--text-secondary)">Mi porcentaje:</label>
            <input type="number" id="tithe-pct-input" value="${tithePercent}" min="0.1" max="100" step="0.5"
              style="width:70px;padding:4px 8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);text-align:center" />
            <span>%</span>
          </div>
        </div>
      </div>

      <!-- Current month Header -->
      <div class="card" style="margin-bottom:24px;border-top:3px solid var(--accent-primary)">
        <div class="card-header">
          <h3 style="display:flex;align-items:center;gap:8px">📅 ${getMonthName(currentMonth)} <span class="badge ${pct >= 100 ? 'badge-success' : pct > 0 ? 'badge-warning' : 'badge-neutral'}">${pct >= 100 ? 'Completo' : pct > 0 ? 'Parcial' : 'Pendiente'}</span></h3>
        </div>
        
        <!-- Metrics -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border-color)">
          <div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">Ingresos Sujetos (Bruto)</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--color-income)">${formatMoney(grossIncome)}</div>
          </div>
          <div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">Descuentos/Excepciones</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--color-expense)">- ${formatMoney(totalDeductions)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:6px;border-left:2px solid var(--accent-primary)">
            <div style="font-size:0.8rem;color:var(--accent-primary);margin-bottom:4px">Base Neta para ${tithePercent}%</div>
            <div style="font-size:1.4rem;font-weight:700;color:var(--text-primary)">${formatMoney(netBase)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">${tithePercent}% Calculado</div>
            <div style="font-size:1.5rem;font-weight:700;font-family:var(--font-heading);color:var(--accent-primary)">${formatMoney(currentTithe)}</div>
          </div>
        </div>

        <!-- Progress Box -->
        <div style="background:var(--bg-input);padding:16px;border-radius:var(--radius-md)">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
            <div>
              <span style="font-size:0.9rem;color:var(--text-secondary)">Aporte Separado: </span>
              <strong style="font-size:1.2rem;color:${pct >= 100 ? 'var(--color-income)' : 'var(--color-warning)'}">${formatMoney(currentPaid)}</strong>
            </div>
            <span style="font-weight:600;font-size:0.9rem">${pct}%</span>
          </div>
          
          <div class="progress-bar" style="height:10px;margin-bottom:16px">
            <div class="progress-fill" style="width:${Math.min(pct, 100)}%;background:${pct >= 100 ? 'var(--color-income)' : 'var(--accent-primary)'}"></div>
          </div>
          
          ${pct < 100 ? `
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:0.85rem;color:var(--text-secondary)">Resta separar: <strong>${formatMoney(Math.max(0, currentTithe - currentPaid))}</strong></span>
              <button class="btn btn-primary btn-sm" id="register-tithe-btn">${icon('plus', 16)} Registrar Aporte</button>
            </div>
          ` : `<div style="text-align:center;color:var(--color-income);font-weight:600">✓ Meta del ${tithePercent}% completada para este mes</div>`}
        </div>
      </div>

      <!-- Detail Panels -->
      <div class="grid grid-2" style="gap:24px;margin-bottom:28px;align-items:start">
        
        <!-- Ingresos List -->
        <div class="card">
          <div class="card-header">
            <h3>${icon('trendingUp', 16)} Ingresos que aplican este mes</h3>
          </div>
          <div style="padding:10px 0">
            ${validTransactions.length === 0 ? '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:10px 0">No hay ingresos aplicables este mes</div>' : ''}
            ${validTransactions.map(t => `
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-color);font-size:0.85rem">
                <div>
                  <div style="font-weight:500;margin-bottom:2px">${t.descripcion}</div>
                  <div style="color:var(--text-secondary);font-size:0.75rem">${formatDate(t.fecha)} ${(t.categoriaId === 'cat_salary') ? '• (Salario)' : ''}</div>
                </div>
                <div style="font-weight:600;color:var(--color-income)">${formatMoney(t.monto)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Deductions List -->
        <div class="card">
          <div class="card-header">
            <h3>${icon('minus', 16)} Descuentos Manuales</h3>
            <button class="btn btn-secondary btn-sm" id="add-deduct-btn">Agregar</button>
          </div>
          <div style="padding:10px 0">
            ${deductions.length === 0 ? '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:10px 0">No hay descuentos aplicados en la base de este mes</div>' : ''}
            ${deductions.map(d => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-color);font-size:0.85rem">
                <div>
                  <div style="font-weight:500;margin-bottom:2px">${d.descripcion}</div>
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                  <span style="font-weight:600;color:var(--color-expense)">- ${formatMoney(d.monto)}</span>
                  <button class="btn-icon" data-del-deduct="${d.id}">${icon('trash', 14)}</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;

    // SAVE custom percentage (debounced + commits on blur/enter)
    const pctInput = page.querySelector('#tithe-pct-input');
    if (pctInput) {
      const savePct = () => {
        let v = parseFloat(pctInput.value);
        if (isNaN(v) || v <= 0) v = 10;
        if (v > 100) v = 100;
        store.setSetting('tithe_percentage', v);
        showToast('success', `Porcentaje actualizado a ${v}%`);
        render();
      };
      pctInput.addEventListener('change', savePct);
      pctInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); pctInput.blur(); } });
    }

    // ADD A DEDUCTION
    page.querySelector('#add-deduct-btn')?.addEventListener('click', () => {
      const modal = openModal('Descontar de la Base', `
        <form id="deduct-form">
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">Registra montos (ej. Itbis, Gastos operativos directos, Devoluciones) que no deben formar parte de tu cálculo de ganancias netas.</p>
          <div class="form-group">
            <label class="form-label">Razón del descuento <span class="required">*</span></label>
            <input type="text" class="form-input" id="deduct-desc" placeholder="Ej: Pago de impuestos..." required />
          </div>
          <div class="form-group">
            <label class="form-label">Monto a descontar <span class="required">*</span></label>
            <div class="input-prefix-wrapper">
              <span class="input-prefix">RD$</span>
              <input type="number" class="form-input" id="deduct-amount" step="0.01" required />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
            <button type="submit" class="btn btn-primary">${icon('check', 18)} Aplicar Descuento</button>
          </div>
        </form>
      `);
      modal.querySelector('#deduct-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const amt = parseFloat(modal.querySelector('#deduct-amount').value) || 0;
        const desc = modal.querySelector('#deduct-desc').value.trim();
        if (amt > 0) {
          store.add('tithe_deductions', {
            id: generateId(),
            periodo: currentMonth,
            descripcion: desc,
            monto: amt
          });
          showToast('success', 'Descuento aplicado a la base neta');
          closeModal();
          render();
        }
      });
    });

    // DEL A DEDUCTION
    page.querySelectorAll('[data-del-deduct]').forEach(btn => btn.addEventListener('click', async () => {
      const ok = await confirmDialog('¿Eliminar descuento?', 'Ese monto volverá a sumarse a la base neta de tus ingresos.');
      if (ok) {
        store.remove('tithe_deductions', btn.dataset.delDeduct);
        showToast('info', 'Descuento eliminado');
        render();
      }
    }));

    // REGISTER A PAYMENT
    page.querySelector('#register-tithe-btn')?.addEventListener('click', () => {
      const remaining = Math.max(0, currentTithe - currentPaid);
      const modal = openModal('Registrar Aporte del 10%', `
        <form id="tithe-form">
          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:0.85rem;color:var(--text-secondary)">Pendiente neto a separar</div>
            <div style="font-size:1.5rem;font-weight:700;color:var(--accent-primary);font-family:var(--font-heading)">${formatMoney(remaining)}</div>
          </div>
          <div class="form-group">
            <label class="form-label">Monto (Abonable) <span class="required">*</span></label>
            <div class="input-prefix-wrapper">
              <span class="input-prefix">RD$</span>
              <input type="number" class="form-input" id="tithe-amount" value="${remaining}" step="0.01" required />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
            <button type="submit" class="btn btn-primary">${icon('check', 18)} Registrar</button>
          </div>
        </form>
      `);
      modal.querySelector('#tithe-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(modal.querySelector('#tithe-amount').value) || 0;
        if (amount <= 0) { showToast('error', 'Monto inválido'); return; }
        if (currentRecord) {
          const newPaid = (parseFloat(currentRecord.montoPagado) || 0) + amount;
          store.update('tithe', currentRecord.id, {
            montoPagado: newPaid,
            totalIngresos: grossIncome,
            baseNeta: netBase,
            montoDiezmo: currentTithe,
            estado: newPaid >= currentTithe ? 'completo' : 'parcial',
          });
        } else {
          store.add('tithe', {
            id: generateId(),
            periodo: currentMonth,
            totalIngresos: grossIncome,
            baseNeta: netBase,
            montoDiezmo: currentTithe,
            montoPagado: amount,
            estado: amount >= currentTithe ? 'completo' : 'parcial',
          });
        }
        showToast('success', 'Aporte registrado exitosamente');
        closeModal();
        render();
      });
    });
  };

  render();
  return page;
}
