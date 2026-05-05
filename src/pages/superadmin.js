// ============================================
// SuperAdmin Page — Global User Management
// Lee del backend (PostgreSQL via /admin/users).
// ============================================
import { admin as adminApi } from '../api-client.js';
import { icon } from '../icons.js';
import { showToast, openModal, closeModal } from '../components.js';
import { formatDate } from '../utils.js';

const STATUS_BADGES = {
  activo: 'badge-success',
  suspendido: 'badge-danger',
  inactivo: 'badge-warning',
};

export default function renderSuperAdmin() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  let currentTab = 'users';
  let users = [];
  let logs = [];
  let loading = false;
  let lastError = null;
  let search = '';

  const fetchUsers = async () => {
    loading = true; lastError = null; render();
    try {
      const r = await adminApi.users(search || undefined);
      users = (r.data || []).map((u) => ({
        // Normaliza camelCase del API (auto-camelizado por api-client)
        id: u.id,
        email: u.email,
        nombre: u.nombre,
        isSuperAdmin: u.isSuperAdmin,
        estado: u.estado || 'activo',
        emailVerified: u.emailVerified,
        ultimoAcceso: u.ultimoAcceso,
        createdAt: u.createdAt,
        workspacesCount: u.workspacesCount ?? 0,
      }));
    } catch (e) {
      lastError = e?.message || 'Error cargando usuarios';
      users = [];
    } finally {
      loading = false; render();
    }
  };

  const fetchAuditLogs = async () => {
    loading = true; lastError = null; render();
    try {
      const r = await adminApi.auditLogs(200);
      logs = (r.data || []).map((l) => ({
        id: l.id,
        timestamp: l.createdAt,
        action: l.accion,
        actorEmail: l.actorEmail,
        actorNombre: l.actorNombre,
        targetType: l.targetType,
        targetId: l.targetId,
        metadata: l.metadata,
        ip: l.ip,
      }));
    } catch (e) {
      lastError = e?.message || 'Error cargando auditoria';
      logs = [];
    } finally {
      loading = false; render();
    }
  };

  const renderUsersTab = () => `
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:15px;background:var(--bg-input);border-bottom:1px solid var(--border-color);display:flex;gap:12px;align-items:center">
        ${icon('search', 16)}
        <input type="text" id="admin-search" value="${escapeAttr(search)}" placeholder="Buscar por nombre o correo..." class="form-input" style="flex:1;border:none;background:transparent;box-shadow:none" />
        <button id="admin-refresh" class="btn btn-ghost btn-sm">${icon('refresh', 14)} Refrescar</button>
      </div>
      ${loading ? `<div class="empty-state" style="padding:40px;text-align:center;color:var(--text-secondary)">Cargando...</div>` : ''}
      ${lastError ? `<div class="empty-state" style="padding:30px;text-align:center;color:var(--color-expense)">${lastError}</div>` : ''}
      ${!loading && !lastError ? `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Estado</th>
              <th>Workspaces</th>
              <th>Creado</th>
              <th>Último acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${users.length === 0 ? `
              <tr><td colspan="7" class="center muted" style="padding:40px">No hay usuarios.</td></tr>
            ` : users.map((u) => {
              const status = u.estado || 'activo';
              const verifBadge = u.emailVerified ? '<span style="color:var(--color-income);font-size:0.7rem">✓ verificado</span>' : '<span style="color:var(--text-muted);font-size:0.7rem">no verificado</span>';
              return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;flex-shrink:0">
                      ${(u.nombre || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style="font-weight:600">${escapeHtml(u.nombre || '-')} ${u.isSuperAdmin ? '<span style="color:var(--color-warning);font-size:0.7rem">👑 SuperAdmin</span>' : ''}</div>
                      <div style="font-size:0.72rem">${verifBadge}</div>
                    </div>
                  </div>
                </td>
                <td style="font-size:0.85rem">${escapeHtml(u.email || '-')}</td>
                <td><span class="badge ${STATUS_BADGES[status] || 'badge-neutral'}">${status.toUpperCase()}</span></td>
                <td>${u.workspacesCount}</td>
                <td style="color:var(--text-secondary);font-size:0.82rem">${u.createdAt ? formatDate(u.createdAt) : '-'}</td>
                <td style="color:var(--text-secondary);font-size:0.82rem">${u.ultimoAcceso ? formatDate(u.ultimoAcceso) : 'Nunca'}</td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn-icon sa-action-status" data-id="${u.id}" data-status="${status}" title="Cambiar estado">
                      ${icon(status === 'activo' ? 'lock' : 'check', 16)}
                    </button>
                    ${!u.isSuperAdmin ? `
                      <button class="btn-icon sa-action-pass" data-id="${u.id}" data-name="${escapeAttr(u.nombre || u.email)}" title="Restablecer contraseña" style="color:var(--color-warning)">
                        ${icon('key', 16)}
                      </button>
                      <button class="btn-icon sa-action-sessions" data-id="${u.id}" title="Cerrar todas las sesiones" style="color:var(--color-expense)">
                        ${icon('logOut', 16)}
                      </button>
                    ` : `<button class="btn-icon" disabled style="opacity:0.3" title="No puedes resetear a un SuperAdmin">${icon('key', 16)}</button>`}
                  </div>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    </div>
  `;

  const renderAuditTab = () => `
    <div class="card" style="padding:0;overflow:hidden">
      ${loading ? `<div class="empty-state" style="padding:40px;text-align:center;color:var(--text-secondary)">Cargando...</div>` : ''}
      ${lastError ? `<div class="empty-state" style="padding:30px;text-align:center;color:var(--color-expense)">${lastError}</div>` : ''}
      ${!loading && !lastError ? `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Acción</th>
              <th>Administrador</th>
              <th>Tipo</th>
              <th>Target</th>
              <th>IP</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            ${logs.length === 0 ? `
              <tr><td colspan="7" class="center muted" style="padding:40px">No hay registros de auditoría aún.</td></tr>
            ` : logs.map((l) => `
              <tr>
                <td style="font-size:0.78rem;color:var(--text-secondary);white-space:nowrap">${formatDate(l.timestamp)} ${new Date(l.timestamp).toLocaleTimeString()}</td>
                <td style="font-weight:600">${escapeHtml(l.action)}</td>
                <td style="color:var(--accent-primary)">${escapeHtml(l.actorNombre || l.actorEmail || '-')}</td>
                <td style="font-size:0.78rem">${escapeHtml(l.targetType || '-')}</td>
                <td style="font-size:0.78rem;font-family:monospace">${escapeHtml((l.targetId || '').slice(0, 8))}</td>
                <td style="font-size:0.78rem">${escapeHtml(l.ip || '-')}</td>
                <td style="font-size:0.75rem;color:var(--text-muted);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.metadata ? escapeHtml(JSON.stringify(l.metadata)) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    </div>
  `;

  const render = () => {
    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Panel de Administrador Global</h1>
          <p>Control de acceso total y herramientas de auditoría</p>
        </div>
      </div>

      <div class="tabs" style="margin-bottom:20px;border-bottom:1px solid var(--border-color);display:flex;gap:20px">
        <button class="btn btn-ghost ${currentTab === 'users' ? 'active-tab' : ''}" style="${currentTab==='users'?'border-bottom:2px solid var(--accent-primary);border-radius:0':''}" data-tab="users">${icon('users',18)} Usuarios${users.length ? ` (${users.length})` : ''}</button>
        <button class="btn btn-ghost ${currentTab === 'audit' ? 'active-tab' : ''}" style="${currentTab==='audit'?'border-bottom:2px solid var(--accent-primary);border-radius:0':''}" data-tab="audit">${icon('fileText',18)} Auditoría</button>
      </div>

      ${currentTab === 'users' ? renderUsersTab() : renderAuditTab()}
    `;

    page.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        if (currentTab === 'users') fetchUsers();
        else fetchAuditLogs();
      });
    });

    if (currentTab === 'users' && !loading && !lastError) attachUserEvents();
  };

  const attachUserEvents = () => {
    let searchTimer = null;
    page.querySelector('#admin-search')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const v = e.target.value;
      searchTimer = setTimeout(() => { search = v; fetchUsers(); }, 300);
    });
    page.querySelector('#admin-refresh')?.addEventListener('click', () => fetchUsers());

    page.querySelectorAll('.sa-action-status').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const current = btn.dataset.status;
        const options = ['activo', 'suspendido', 'inactivo'].filter((o) => o !== current);
        const modal = openModal('Cambiar estado del usuario', `
          <p>Selecciona el nuevo estado (Actual: <strong>${current}</strong>):</p>
          <div style="display:flex;gap:10px;margin:14px 0">
            ${options.map((o) => `<button class="btn ${o==='activo'?'btn-success':o==='suspendido'?'btn-danger':'btn-warning'}" data-st="${o}" style="flex:1">${o.toUpperCase()}</button>`).join('')}
          </div>
          <p style="font-size:0.8rem;color:var(--text-muted)">Los usuarios suspendidos o inactivos no podrán iniciar sesión.</p>
        `);
        modal.querySelectorAll('[data-st]').forEach((b) => {
          b.addEventListener('click', async () => {
            try {
              await adminApi.setUserStatus(id, b.dataset.st);
              showToast('success', `Estado cambiado a ${b.dataset.st}`);
              closeModal();
              fetchUsers();
            } catch (e) { showToast('error', e?.message || 'Error'); }
          });
        });
      });
    });

    page.querySelectorAll('.sa-action-sessions').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Cerrar todas las sesiones activas de este usuario?')) return;
        try {
          await adminApi.terminateSessions(btn.dataset.id);
          showToast('success', 'Sesiones cerradas');
        } catch (e) { showToast('error', e?.message || 'Error'); }
      });
    });

    page.querySelectorAll('.sa-action-pass').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const modal = openModal('Restablecer contraseña', `
          <form id="sa-reset-form">
            <p style="margin-bottom:15px;font-size:0.9rem">Establecerás una nueva clave temporal para <strong>${escapeHtml(name)}</strong>.</p>
            <div class="form-group">
              <label class="form-label">Nueva contraseña</label>
              <input type="text" class="form-input" id="sa-new-pass" required minlength="6" autocomplete="off" />
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;cursor:pointer">
              <input type="checkbox" id="sa-force-change" checked style="width:18px;height:18px;accent-color:var(--accent-primary)" />
              <label for="sa-force-change" style="font-size:0.85rem;color:var(--text-secondary)">Forzar al usuario a cambiarla en su próximo acceso</label>
            </div>
            <div class="form-actions" style="margin-top:20px">
              <button type="button" class="btn btn-secondary" id="sa-cancel">Cancelar</button>
              <button type="submit" class="btn btn-primary" style="background:var(--color-warning);border-color:var(--color-warning)">${icon('check',16)} Actualizar</button>
            </div>
          </form>
        `);
        modal.querySelector('#sa-cancel').addEventListener('click', () => closeModal());
        modal.querySelector('#sa-reset-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const p = modal.querySelector('#sa-new-pass').value;
          const f = modal.querySelector('#sa-force-change').checked;
          const sub = modal.querySelector('button[type=submit]');
          sub.disabled = true;
          try {
            await adminApi.forceResetPassword(id, p, f);
            showToast('success', 'Contraseña restablecida');
            closeModal();
            fetchUsers();
          } catch (err) {
            showToast('error', err?.message || 'Error');
            sub.disabled = false;
          }
        });
      });
    });
  };

  // Boot
  render();
  fetchUsers();

  return page;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
