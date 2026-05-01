// ============================================
// Goals Page — Financial goals & savings
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { generateId, formatMoney, formatDate, getToday, getDaysUntil, percentage } from '../utils.js';
import { openModal, closeModal, showToast, confirmDialog, emptyState } from '../components.js';
import { enforceLimit } from '../plans_engine.js';

const GOAL_COLORS = ['#6c63ff','#00d4aa','#42a5f5','#ff7043','#ab47bc','#ec407a','#ffa726','#26a69a'];
const GOAL_ICONS = ['🎯','🏠','✈️','🚗','💻','📱','🎓','💍','🏋️','🎮','👶','🏖️'];

function goalForm(goal = null) {
  return `
    <form id="goal-form">
      <div class="form-group">
        <label class="form-label">Nombre de la Meta <span class="required">*</span></label>
        <input type="text" class="form-input" id="goal-name" value="${goal?.nombre || ''}" placeholder="Ej: Fondo de emergencia, Vacaciones..." required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto Objetivo <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="goal-target" value="${goal?.montoObjetivo || ''}" step="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Monto Actual</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="goal-current" value="${goal?.montoActual || 0}" step="0.01" />
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Fecha Límite</label>
        <input type="date" class="form-input" id="goal-deadline" value="${goal?.fechaLimite || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Icono</label>
        <div class="color-picker-group" id="goal-icon-picker" style="gap:6px">
          ${GOAL_ICONS.map(ic => `<div class="color-option ${goal?.icono === ic ? 'selected' : ''}" data-icon="${ic}" style="background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:1.2rem;border-radius:8px">${ic}</div>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="color-picker-group" id="goal-color-picker">
          ${GOAL_COLORS.map(c => `<div class="color-option ${goal?.color === c ? 'selected' : ''}" data-color="${c}" style="background:${c}"></div>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea class="form-textarea" id="goal-notes" placeholder="¿Para qué es esta meta?">${goal?.notas || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check', 18)} ${goal ? 'Guardar' : 'Crear Meta'}</button>
      </div>
    </form>
  `;
}

export default function renderGoals() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const render = () => {
    const goals = store.getAll('goals');
    if (goals.length === 0) {
      page.innerHTML = '';
      page.appendChild(emptyState('goal', 'Sin metas financieras', 'Establece objetivos de ahorro para motivarte a alcanzarlos', 'Crear Meta', () => openGoalModal()));
      return;
    }

    const active = goals.filter(g => g.estado === 'activa');
    const completed = goals.filter(g => g.estado === 'completada');
    const totalTarget = active.reduce((s, g) => s + (parseFloat(g.montoObjetivo) || 0), 0);
    const totalSaved = active.reduce((s, g) => s + (parseFloat(g.montoActual) || 0), 0);

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Metas Financieras</h1>
          <p>${active.length} activa${active.length !== 1 ? 's' : ''} • ${completed.length} completada${completed.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-goal-btn">${icon('plus', 18)} Nueva Meta</button>
        </div>
      </div>

      <div class="grid grid-3" style="margin-bottom:28px">
        <div class="stat-card">
          <div class="stat-icon accent">${icon('goal', 24)}</div>
          <div class="stat-content">
            <div class="stat-label">Objetivo Total</div>
            <div class="stat-value">${formatMoney(totalTarget)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon income">${icon('trendingUp', 24)}</div>
          <div class="stat-content">
            <div class="stat-label">Total Ahorrado</div>
            <div class="stat-value">${formatMoney(totalSaved)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning">${icon('barChart', 24)}</div>
          <div class="stat-content">
            <div class="stat-label">Progreso Global</div>
            <div class="stat-value">${percentage(totalSaved, totalTarget)}%</div>
          </div>
        </div>
      </div>

      <div class="goal-grid stagger-children">
        ${goals.map(goal => {
          const pct = percentage(parseFloat(goal.montoActual) || 0, parseFloat(goal.montoObjetivo) || 1);
          const remaining = (parseFloat(goal.montoObjetivo) || 0) - (parseFloat(goal.montoActual) || 0);
          const isCompleted = goal.estado === 'completada';
          const color = goal.color || '#6c63ff';
          const color2 = color + 'CC';
          const daysLeft = goal.fechaLimite ? getDaysUntil(goal.fechaLimite) : null;
          return `
            <div class="goal-tile" style="--gt-grad:linear-gradient(135deg, ${color} 0%, ${color2} 100%);${isCompleted ? 'opacity:0.7' : ''}">
              <div class="goal-tile-head">
                <div class="goal-tile-icon">
                  <span style="font-size:1.3rem">${goal.icono || '🎯'}</span>
                </div>
                <div style="flex:1;min-width:0">
                  <h4 class="goal-tile-title">${goal.nombre}</h4>
                  ${daysLeft !== null ? `<div class="goal-tile-deadline">${daysLeft >= 0 ? `${daysLeft} días restantes` : 'Plazo vencido'}</div>` : ''}
                </div>
                ${isCompleted ? '<span class="badge badge-success" style="align-self:flex-start">✓</span>' : ''}
              </div>
              <div class="goal-tile-amounts">
                <div>
                  <div class="gt-saved">${formatMoney(goal.montoActual || 0)}</div>
                  <div style="font-size:0.72rem">de ${formatMoney(goal.montoObjetivo)}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-family:var(--font-heading);font-weight:700;font-size:1.4rem;color:${color}">${pct}%</div>
                  <div style="font-size:0.72rem">Faltan ${formatMoney(Math.max(0, remaining))}</div>
                </div>
              </div>
              <div class="goal-tile-bar">
                <div class="goal-tile-bar-fill" style="width:${Math.min(pct, 100)}%"></div>
              </div>
              <div class="goal-tile-actions">
                ${!isCompleted ? `<button class="btn btn-success btn-sm" data-contribute="${goal.id}">${icon('plus', 14)} Aportar</button>` : ''}
                <button class="btn btn-secondary btn-sm" data-edit="${goal.id}">${icon('edit', 14)}</button>
                <button class="btn-icon" data-del="${goal.id}">${icon('trash', 16)}</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    page.querySelector('#add-goal-btn')?.addEventListener('click', () => openGoalModal());
    page.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
      const goal = store.getById('goals', btn.dataset.edit); if (goal) openGoalModal(goal);
    }));
    page.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', async () => {
      const ok = await confirmDialog('¿Eliminar meta?', 'Se eliminará esta meta y su historial de aportes.');
      if (ok) {
        store.filter('goal_contributions', c => c.metaId === btn.dataset.del).forEach(c => store.remove('goal_contributions', c.id));
        store.remove('goals', btn.dataset.del); showToast('success', 'Meta eliminada'); render();
      }
    }));
    page.querySelectorAll('[data-contribute]').forEach(btn => btn.addEventListener('click', () => {
      const goal = store.getById('goals', btn.dataset.contribute);
      if (goal) openContributeModal(goal);
    }));
  };

  function openGoalModal(goal = null) {
    const modal = openModal(goal ? 'Editar Meta' : 'Nueva Meta', goalForm(goal));
    // Icon picker
    modal.querySelectorAll('#goal-icon-picker .color-option').forEach(opt => {
      opt.addEventListener('click', () => {
        modal.querySelectorAll('#goal-icon-picker .color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
    // Color picker
    modal.querySelectorAll('#goal-color-picker .color-option').forEach(opt => {
      opt.addEventListener('click', () => {
        modal.querySelectorAll('#goal-color-picker .color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
    modal.querySelector('#goal-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const montoObjetivo = parseFloat(modal.querySelector('#goal-target').value) || 0;
      const montoActual = parseFloat(modal.querySelector('#goal-current').value) || 0;
      const selectedIcon = modal.querySelector('#goal-icon-picker .selected');
      const selectedColor = modal.querySelector('#goal-color-picker .selected');
      const data = {
        nombre: modal.querySelector('#goal-name').value.trim(),
        montoObjetivo, montoActual,
        fechaLimite: modal.querySelector('#goal-deadline').value,
        icono: selectedIcon?.dataset.icon || '🎯',
        color: selectedColor?.dataset.color || '#6c63ff',
        notas: modal.querySelector('#goal-notes').value.trim(),
        estado: montoActual >= montoObjetivo ? 'completada' : 'activa',
      };
      if (goal) { store.update('goals', goal.id, data); showToast('success', 'Meta actualizada'); }
      else {
        if (!enforceLimit('max_goals', { title: 'Has alcanzado el máximo de metas' })) return;
        store.add('goals', { ...data, id: generateId() });
        showToast('success', 'Meta creada');
      }
      closeModal(); render();
    });
  }

  function openContributeModal(goal) {
    const remaining = (parseFloat(goal.montoObjetivo) || 0) - (parseFloat(goal.montoActual) || 0);
    const modal = openModal(`Aportar a: ${goal.nombre}`, `
      <form id="contribute-form">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:2rem">${goal.icono || '🎯'}</div>
          <div style="font-size:0.85rem;color:var(--text-secondary)">Faltan</div>
          <div style="font-size:1.5rem;font-weight:700;color:${goal.color || 'var(--accent-primary)'};font-family:var(--font-heading)">${formatMoney(remaining)}</div>
        </div>
        <div class="form-group">
          <label class="form-label">Monto del Aporte <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="contrib-amount" step="0.01" required placeholder="0.00" />
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
          <button type="submit" class="btn btn-success">${icon('check', 18)} Aportar</button>
        </div>
      </form>
    `);
    modal.querySelector('#contribute-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(modal.querySelector('#contrib-amount').value) || 0;
      if (amount <= 0) { showToast('error', 'Monto inválido'); return; }
      store.add('goal_contributions', { id: generateId(), metaId: goal.id, monto: amount, fecha: getToday() });
      const newAmount = (parseFloat(goal.montoActual) || 0) + amount;
      const estado = newAmount >= goal.montoObjetivo ? 'completada' : 'activa';
      store.update('goals', goal.id, { montoActual: newAmount, estado });
      if (estado === 'completada') showToast('success', '🎉 ¡Meta alcanzada!', `${goal.nombre} ha sido completada`);
      else showToast('success', 'Aporte registrado');
      closeModal(); render();
    });
  }

  render();
  return page;
}
