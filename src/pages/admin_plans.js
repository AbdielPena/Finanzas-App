// ============================================
// Admin Plans — Gestión del catálogo SaaS
// Solo accesible para SuperAdmin.
// Permite CRUD de planes y asignación a usuarios.
// ============================================

import {
  ensureSeeded, getAllPlans, getActivePlans, getPlanById,
  createPlan, updatePlan, deletePlan, togglePlanStatus,
  assignPlanToUser, removeUserAssignment, getAllAssignments,
  FEATURE_CATEGORIES, ALL_FEATURES,
} from '../plans_engine.js';
import { getAllUsersAdmin, getCurrentUser } from '../auth.js';
import { icon } from '../icons.js';
import { showToast, confirmDialog, openModal, closeModal } from '../components.js';
import { formatDate, formatMoney } from '../utils.js';

function getAssignmentsMap() {
  try { return getAllAssignments() || {}; } catch { return {}; }
}

export default function renderAdminPlans() {
  ensureSeeded();
  const me = getCurrentUser();
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  // Guard: solo SuperAdmin
  if (!me?.isSuperAdmin) {
    page.innerHTML = `
      <div class="page-header"><div class="page-header-left">
        <h1>Acceso restringido</h1>
        <p>Solo el SuperAdministrador puede gestionar planes.</p>
      </div></div>
    `;
    return page;
  }

  let currentTab = 'catalog'; // catalog | assignments

  const render = () => {
    const plans = getAllPlans(true);
    const users = getAllUsersAdmin();
    const assignments = getAssignmentsMap();

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Planes SaaS</h1>
          <p>Administra catálogo, precios, límites y asignaciones.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="btn-new-plan">
            ${icon('plus', 16)}<span>Nuevo plan</span>
          </button>
        </div>
      </div>

      <div class="tabs-row" style="display:flex;gap:8px;margin-bottom:22px;border-bottom:1px solid var(--border);padding-bottom:2px">
        <button class="chip ${currentTab === 'catalog' ? 'active' : ''}" data-tab="catalog">
          ${icon('star', 14)}<span>Catálogo (${plans.length})</span>
        </button>
        <button class="chip ${currentTab === 'assignments' ? 'active' : ''}" data-tab="assignments">
          ${icon('user', 14)}<span>Asignaciones (${Object.keys(assignments).length}/${users.length})</span>
        </button>
      </div>

      <div id="tab-content"></div>
    `;

    renderTab();
    bindHeader();
  };

  const renderTab = () => {
    const host = page.querySelector('#tab-content');
    if (!host) return;
    if (currentTab === 'catalog') host.innerHTML = renderCatalogTab();
    else host.innerHTML = renderAssignmentsTab();
    bindTabEvents();
  };

  const renderCatalogTab = () => {
    const plans = getAllPlans(true);
    if (plans.length === 0) {
      return `
        <div class="card" style="text-align:center;padding:60px 20px">
          <div style="font-size:3rem;margin-bottom:10px">📦</div>
          <h3 style="margin-bottom:6px">Sin planes todavía</h3>
          <p class="text-muted">Crea tu primer plan para empezar.</p>
        </div>
      `;
    }
    return `
      <div class="grid grid-auto" style="gap:18px">
        ${plans.map(p => renderPlanCard(p)).join('')}
      </div>
    `;
  };

  const renderPlanCard = (p) => {
    const usersOn = Object.values(getAssignmentsMap()).filter(a => a.planId === p.id).length;
    const statusBadge = p.status === 'active'
      ? `<span class="badge badge-success">Activo</span>`
      : `<span class="badge badge-warning">Inactivo</span>`;
    const featured = p.featured ? `<span class="badge badge-info">Destacado</span>` : '';
    const limitsCount = Object.keys(p.limits || {}).length;
    const featuresCount = Object.values(p.features || {}).filter(v => v).length;
    return `
      <div class="card plan-admin-card" style="border-left:4px solid ${p.color};position:relative">
        <div class="plan-admin-head">
          <div>
            <div class="plan-admin-name" style="color:${p.color}">${p.name}</div>
            <div class="plan-admin-tagline">${p.tagline || ''}</div>
          </div>
          <div class="plan-admin-price">
            <div class="plan-admin-amount">${p.price === 0 ? 'Gratis' : `${p.currency} ${p.price}`}</div>
            <div class="plan-admin-cycle">${p.billing === 'annual' ? '/año' : p.billing === 'once' ? ' único' : '/mes'}</div>
          </div>
        </div>
        <p class="text-muted" style="font-size:0.86rem;margin:10px 0 14px;min-height:38px">${p.description || ''}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
          ${statusBadge} ${featured}
          <span class="badge">${limitsCount} límites</span>
          <span class="badge">${featuresCount} features</span>
          <span class="badge">${usersOn} usuarios</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-sm btn-ghost" data-action="edit" data-id="${p.id}">${icon('edit', 13)}<span>Editar</span></button>
          <button class="btn btn-sm btn-ghost" data-action="toggle" data-id="${p.id}">${icon('check', 13)}<span>${p.status === 'active' ? 'Desactivar' : 'Activar'}</span></button>
          <button class="btn btn-sm btn-ghost" data-action="delete" data-id="${p.id}" style="color:var(--bad)">${icon('trash', 13)}<span>Eliminar</span></button>
        </div>
      </div>
    `;
  };

  const renderAssignmentsTab = () => {
    const users = getAllUsersAdmin();
    const plans = getAllPlans(false);
    const assignments = getAssignmentsMap();
    if (users.length === 0) {
      return `<div class="card" style="text-align:center;padding:40px">No hay usuarios registrados.</div>`;
    }
    return `
      <div class="card" style="padding:0;overflow:hidden">
        <table class="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Plan actual</th>
              <th>Estado</th>
              <th>Vence</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => {
              const a = assignments[u.id];
              const plan = a ? plans.find(p => p.id === a.planId) : null;
              return `
                <tr>
                  <td><strong>${u.nombre || 'Sin nombre'}</strong>${u.isSuperAdmin ? ' <span class="badge badge-info">Admin</span>' : ''}</td>
                  <td class="text-muted">${u.email || '—'}</td>
                  <td>
                    <select class="form-input form-input-sm assignment-plan-select" data-user="${u.id}" style="min-width:140px">
                      <option value="">— sin plan (legacy) —</option>
                      ${plans.map(p => `<option value="${p.id}" ${a?.planId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                  </td>
                  <td>${a ? `<span class="badge badge-${a.status === 'active' ? 'success' : a.status === 'trial' ? 'info' : 'warning'}">${a.status}</span>` : '—'}</td>
                  <td class="text-muted">${a?.endDate ? formatDate(a.endDate) : '—'}</td>
                  <td style="text-align:right">
                    ${a ? `<button class="btn btn-sm btn-ghost" data-action="unassign" data-user="${u.id}">${icon('trash', 13)}</button>` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const bindHeader = () => {
    page.querySelector('#btn-new-plan')?.addEventListener('click', () => openPlanEditor(null));
    page.querySelectorAll('.chip[data-tab]').forEach(el => {
      el.addEventListener('click', () => {
        currentTab = el.dataset.tab;
        render();
      });
    });
  };

  const bindTabEvents = () => {
    // Catalog actions
    page.querySelectorAll('[data-action="edit"]').forEach(b => {
      b.addEventListener('click', () => openPlanEditor(b.dataset.id));
    });
    page.querySelectorAll('[data-action="toggle"]').forEach(b => {
      b.addEventListener('click', () => {
        togglePlanStatus(b.dataset.id);
        showToast('success', 'Estado actualizado');
        render();
      });
    });
    page.querySelectorAll('[data-action="delete"]').forEach(b => {
      b.addEventListener('click', async () => {
        const ok = await confirmDialog('¿Eliminar plan?', 'Si hay usuarios asignados se desactivará en lugar de borrarse.');
        if (!ok) return;
        const res = deletePlan(b.dataset.id);
        if (res.deactivated) showToast('info', 'Plan desactivado', `${res.affectedUsers} usuarios afectados.`);
        else if (res.deleted) showToast('success', 'Plan eliminado');
        render();
      });
    });
    // Assignment change
    page.querySelectorAll('.assignment-plan-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const userId = sel.dataset.user;
        const planId = sel.value;
        if (!planId) {
          removeUserAssignment(userId);
          showToast('info', 'Asignación removida');
        } else {
          assignPlanToUser(userId, planId);
          showToast('success', 'Plan asignado');
        }
        render();
      });
    });
    page.querySelectorAll('[data-action="unassign"]').forEach(b => {
      b.addEventListener('click', () => {
        removeUserAssignment(b.dataset.user);
        showToast('info', 'Asignación removida');
        render();
      });
    });
  };

  // --- Plan editor modal ---
  const openPlanEditor = (planId) => {
    const plan = planId ? getPlanById(planId) : null;
    const isEdit = !!plan;
    const data = plan || {
      name: '', description: '', price: 0, currency: 'USD', billing: 'monthly',
      status: 'active', featured: false, color: '#8B5CF6', tagline: '', cta: '',
      limits: {}, features: {},
    };

    const html = `
      <form class="plan-editor-form" id="plan-editor-form">
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label>Nombre</label>
            <input type="text" class="form-input" name="name" value="${escape(data.name)}" required>
          </div>
          <div class="form-group">
            <label>Precio</label>
            <input type="number" class="form-input" name="price" value="${data.price}" step="0.01" min="0">
          </div>
          <div class="form-group">
            <label>Moneda</label>
            <select class="form-input" name="currency">
              ${['USD','DOP','EUR','MXN'].map(c => `<option ${data.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Ciclo</label>
            <select class="form-input" name="billing">
              <option value="monthly" ${data.billing === 'monthly' ? 'selected' : ''}>Mensual</option>
              <option value="annual" ${data.billing === 'annual' ? 'selected' : ''}>Anual</option>
              <option value="once" ${data.billing === 'once' ? 'selected' : ''}>Único</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Descripción</label>
          <textarea class="form-input" name="description" rows="2">${escape(data.description)}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Tagline</label>
            <input type="text" class="form-input" name="tagline" value="${escape(data.tagline)}" placeholder="Ej: Más elegido">
          </div>
          <div class="form-group">
            <label>Color</label>
            <input type="color" class="form-input" name="color" value="${data.color}">
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select class="form-input" name="status">
              <option value="active" ${data.status === 'active' ? 'selected' : ''}>Activo</option>
              <option value="inactive" ${data.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
          <div class="form-group" style="display:flex;align-items:center">
            <label style="display:flex;gap:6px;align-items:center">
              <input type="checkbox" name="featured" ${data.featured ? 'checked' : ''}> Destacado
            </label>
          </div>
        </div>

        <h3 style="margin-top:18px;margin-bottom:10px;font-size:0.95rem;color:var(--text-1)">Límites por categoría</h3>
        <div class="limits-tabs" id="limits-tabs">
          ${Object.values(FEATURE_CATEGORIES).map((cat, i) => `
            <button type="button" class="chip limit-tab ${i === 0 ? 'active' : ''}" data-cat="${cat.id}">${cat.name}</button>
          `).join('')}
        </div>
        <div id="limits-panels">
          ${Object.values(FEATURE_CATEGORIES).map((cat, i) => renderLimitsPanel(cat, data, i === 0)).join('')}
        </div>

        <h3 style="margin-top:18px;margin-bottom:10px;font-size:0.95rem;color:var(--text-1)">Feature flags</h3>
        <div class="features-grid">
          ${ALL_FEATURES.map(f => `
            <label class="feature-toggle">
              <input type="checkbox" name="feature_${f}" ${data.features?.[f] ? 'checked' : ''}>
              <span>${f.replace(/_/g, ' ')}</span>
            </label>
          `).join('')}
        </div>

        <div class="modal-actions" style="margin-top:22px;display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn btn-ghost" id="plan-cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar cambios' : 'Crear plan'}</button>
        </div>
      </form>
    `;

    openModal(isEdit ? `Editar ${data.name}` : 'Nuevo plan', html, { wide: true });

    // Bind tabs
    setTimeout(() => {
      const modal = document.querySelector('.modal-overlay');
      if (!modal) return;
      modal.querySelectorAll('.limit-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          modal.querySelectorAll('.limit-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          modal.querySelectorAll('.limits-panel').forEach(p => p.style.display = 'none');
          const panel = modal.querySelector(`.limits-panel[data-cat="${tab.dataset.cat}"]`);
          if (panel) panel.style.display = 'grid';
        });
      });
      modal.querySelector('#plan-cancel')?.addEventListener('click', closeModal);
      modal.querySelector('#plan-editor-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const limits = {};
        for (const cat of Object.values(FEATURE_CATEGORIES)) {
          for (const lim of cat.limits || []) {
            const raw = fd.get(`limit_${lim.key}`);
            limits[lim.key] = raw === '' || raw === null ? -1 : parseInt(raw, 10);
          }
        }
        const features = {};
        for (const f of ALL_FEATURES) {
          features[f] = fd.get(`feature_${f}`) === 'on';
        }
        const payload = {
          name: fd.get('name'),
          description: fd.get('description'),
          price: parseFloat(fd.get('price')) || 0,
          currency: fd.get('currency'),
          billing: fd.get('billing'),
          status: fd.get('status'),
          featured: fd.get('featured') === 'on',
          color: fd.get('color'),
          tagline: fd.get('tagline'),
          limits, features,
        };
        if (isEdit) updatePlan(planId, payload);
        else createPlan(payload);
        closeModal();
        showToast('success', isEdit ? 'Plan actualizado' : 'Plan creado');
        render();
      });
    }, 20);
  };

  const renderLimitsPanel = (cat, data, visible) => {
    if (!cat.limits || cat.limits.length === 0) {
      return `<div class="limits-panel" data-cat="${cat.id}" style="display:${visible ? 'block' : 'none'};padding:14px;background:var(--bg-2);border-radius:var(--r-md);color:var(--text-2);font-size:0.88rem">
        Esta categoría no tiene límites numéricos. Controla sus features abajo.
      </div>`;
    }
    return `
      <div class="limits-panel" data-cat="${cat.id}" style="display:${visible ? 'grid' : 'none'};grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
        ${cat.limits.map(lim => {
          const val = data.limits?.[lim.key];
          const numeric = val === undefined || val === null || val === -1 ? '' : val;
          return `
            <label style="display:flex;flex-direction:column;gap:4px;background:var(--bg-2);padding:10px 12px;border-radius:var(--r-md)">
              <span style="font-size:0.78rem;color:var(--text-1);font-weight:600">${lim.label}</span>
              <div style="display:flex;gap:6px;align-items:center">
                <input type="number" class="form-input form-input-sm" name="limit_${lim.key}" value="${numeric}" min="0" placeholder="∞" style="flex:1">
                <span style="font-size:0.7rem;color:var(--text-2)">${lim.unit}</span>
              </div>
              <small style="color:var(--text-2);font-size:0.68rem">Vacío = ilimitado</small>
            </label>
          `;
        }).join('')}
      </div>
    `;
  };

  const escape = (s) => String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  render();
  return page;
}
