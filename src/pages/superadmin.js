// ============================================
// SuperAdmin Page — Global User Management
// ============================================
import {
  getAllUsersAdmin, updateUserAdminStatus, forcePasswordResetAdmin, getAdminAuditLogs, terminateUserSessions
} from '../auth.js';
import { icon } from '../icons.js';
import { showToast, confirmDialog, openModal, closeModal } from '../components.js';
import { formatDate } from '../utils.js';

const STATUS_BADGES = {
  activo: 'badge-success',
  suspendido: 'badge-danger',
  inactivo: 'badge-warning'
};

export default function renderSuperAdmin() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  let currentTab = 'users'; // 'users' or 'audit'

  const render = () => {
    try {
      const users = getAllUsersAdmin();
      const logs = getAdminAuditLogs().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

      page.innerHTML = `
        <div class="page-header">
          <div class="page-header-left">
            <h1>Panel de Administrador Global</h1>
            <p>Control de acceso total y herramientas de auditoría</p>
          </div>
        </div>

        <div class="tabs" style="margin-bottom:20px;border-bottom:1px solid var(--border-color);display:flex;gap:20px">
          <button class="btn btn-ghost ${currentTab === 'users' ? 'active-tab' : ''}" style="${currentTab==='users'?'border-bottom:2px solid var(--accent-primary);border-radius:0':''}" data-tab="users">${icon('users',18)} Usuarios (${users.length})</button>
          <button class="btn btn-ghost ${currentTab === 'audit' ? 'active-tab' : ''}" style="${currentTab==='audit'?'border-bottom:2px solid var(--accent-primary);border-radius:0':''}" data-tab="audit">${icon('fileText',18)} Auditoría</button>
        </div>

        ${currentTab === 'users' ? renderUsersTab(users) : renderAuditTab(logs, users)}
      `;

      // Tab switching
      page.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentTab = btn.dataset.tab;
          render();
        });
      });

      if (currentTab === 'users') attachUserEvents();

    } catch (e) {
      page.innerHTML = `<div class="empty-state card"><h3>No Autorizado</h3><p>${e.message || 'Contenido restringido.'}</p></div>`;
    }
  };

  const renderUsersTab = (users) => `
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:15px;background:var(--bg-input);border-bottom:1px solid var(--border-color);display:flex;gap:12px;align-items:center">
        ${icon('search', 16)}
        <input type="text" id="admin-search" placeholder="Buscar por nombre o correo..." class="form-input" style="flex:1;border:none;background:transparent;box-shadow:none" />
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Estado</th>
              <th>Workspaces</th>
              <th>Creado el</th>
              <th>Último Acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="admin-users-list">
            ${users.map(u => {
              const status = u.estado || (u.activo ? 'activo' : 'inactivo');
              return `
              <tr class="sa-user-row" data-search="${(u.nombre+u.email).toLowerCase()}">
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;flex-shrink:0">
                      ${u.avatar || u.nombre?.charAt(0)}
                    </div>
                    <div>
                      <div style="font-weight:600">${u.nombre} ${u.isSuperAdmin ? '<span style="color:var(--color-warning);font-size:0.7rem">👑 SuperAdmin</span>' : ''}</div>
                      <div style="font-size:0.75rem;color:var(--text-muted)">${u.email}</div>
                    </div>
                  </div>
                </td>
                <td><span class="badge ${STATUS_BADGES[status] || 'badge-neutral'}">${status.toUpperCase()}</span></td>
                <td>${(u.workspaces || []).length} ${(u.workspaces || []).length === 1 ? 'espacio' : 'espacios'}</td>
                <td style="color:var(--text-secondary);font-size:0.85rem">${formatDate(u.createdAt)}</td>
                <td style="color:var(--text-secondary);font-size:0.85rem">${u.lastLogin ? formatDate(u.lastLogin) : 'Nunca'}</td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn-icon sa-action-status" data-id="${u.id}" data-status="${status}" title="Cambiar Estado">
                      ${icon(status === 'activo' ? 'lock' : 'check', 16)}
                    </button>
                    ${!u.isSuperAdmin ? `<button class="btn-icon sa-action-pass" data-id="${u.id}" data-name="${u.nombre}" title="Restablecer Contraseña" style="color:var(--color-warning)">
                      ${icon('key', 16)}
                    </button>` : `<button class="btn-icon" disabled style="opacity:0.3" title="No puedes resetear a un SuperAdmin">${icon('key', 16)}</button>`}
                  </div>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const renderAuditTab = (logs, users) => `
    <div class="card" style="padding:0;overflow:hidden">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Acción Realizada</th>
              <th>Administrador</th>
              <th>Afectado</th>
              <th>Detalles Extras</th>
            </tr>
          </thead>
          <tbody>
            ${logs.length > 0 ? logs.map(l => {
              const sAdmin = users.find(u => u.id === l.adminId)?.nombre || l.adminId;
              const sTarg =  users.find(u => u.id === l.targetUserId)?.nombre || l.targetUserId;
              return `
              <tr>
                <td style="font-size:0.8rem;color:var(--text-secondary)">${formatDate(l.timestamp)} ${new Date(l.timestamp).toLocaleTimeString()}</td>
                <td style="font-weight:600">${l.action}</td>
                <td style="color:var(--accent-primary)">${sAdmin}</td>
                <td>${sTarg}</td>
                <td style="font-size:0.8rem;color:var(--text-muted)">${l.details || '-'}</td>
              </tr>
            `}).join('') : '<tr><td colspan="5" class="center muted" style="padding:40px">No hay registros de auditoría aún.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const attachUserEvents = () => {
    // Search
    const searchInput = page.querySelector('#admin-search');
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      page.querySelectorAll('.sa-user-row').forEach(row => {
        row.style.display = row.dataset.search.includes(q) ? '' : 'none';
      });
    });

    // Change status
    page.querySelectorAll('.sa-action-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const current = btn.dataset.status;
        const options = ['activo', 'suspendido', 'inactivo'].filter(o => o !== current);
        
        const modal = openModal('Cambiar Estado del Usuario', `
          <p>Selecciona el nuevo estado para esta cuenta (Actual: <strong>${current}</strong>):</p>
          <div style="display:flex;gap:10px;margin-bottom:20px;margin-top:10px">
            ${options.map(o => `<button class="btn ${o==='activo'?'btn-success':o==='suspendido'?'btn-danger':'btn-warning'}" id="st-${o}" style="flex:1">${o.toUpperCase()}</button>`).join('')}
          </div>
          <p style="font-size:0.8rem;color:var(--text-muted)">Los usuarios suspendidos o inactivos no podrán iniciar sesión.</p>
        `);
        
        options.forEach(o => {
          modal.querySelector(`#st-${o}`).addEventListener('click', () => {
            try {
              updateUserAdminStatus(id, o);
              showToast('success', `Estado cambiado a ${o}`);
              closeModal();
              if (o === 'suspendido') terminateUserSessions(id); // Logs the forced session close
              render();
            } catch(e) {
              showToast('error', e.message);
            }
          });
        });
      });
    });

    // Reset password
    page.querySelectorAll('.sa-action-pass').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        
        const modal = openModal('Restablecer Contraseña', `
          <form id="sa-reset-form">
            <p style="margin-bottom:15px;font-size:0.9rem">Establecerás una nueva clave temporal para <strong>${name}</strong>.</p>
            <div class="form-group">
              <label class="form-label">Nueva Contraseña</label>
              <input type="text" class="form-input" id="sa-new-pass" required minlength="6" autocomplete="off" />
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;cursor:pointer">
              <input type="checkbox" id="sa-force-change" checked style="width:18px;height:18px;accent-color:var(--accent-primary)" />
              <label for="sa-force-change" style="font-size:0.85rem;color:var(--text-secondary)">Forzar al usuario a cambiarla en su próximo acceso</label>
            </div>
            <div class="form-actions" style="margin-top:20px">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Cancelar</button>
              <button type="submit" class="btn btn-primary" style="background:var(--color-warning);border-color:var(--color-warning)">${icon('check',16)} Actualizar</button>
            </div>
          </form>
        `);

        modal.querySelector('#sa-reset-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const p = modal.querySelector('#sa-new-pass').value;
          const f = modal.querySelector('#sa-force-change').checked;
          const submitBtn = modal.querySelector('button[type=submit]');
          submitBtn.disabled = true;

          try {
            await forcePasswordResetAdmin(id, p, f);
            showToast('success', 'Contraseña restablecida con éxito');
            closeModal();
            render();
          } catch(err) {
            showToast('error', err.message);
            submitBtn.disabled = false;
          }
        });
      });
    });
  };

  render();
  return page;
}
