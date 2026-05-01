// ============================================
// Users Page — Workspace Member Management (Admin only)
// ============================================
import {
  getWorkspaceId, getWorkspaceMembers, getCurrentUser,
  addMember, updateMemberRole, removeMember, ROLES
} from '../auth.js';
import { openModal, closeModal, showToast, confirmDialog } from '../components.js';
import { icon } from '../icons.js';

const ROLE_BADGES = {
  admin:      'badge-danger',
  editor:     'badge-success',
  supervisor: 'badge-warning',
  viewer:     'badge-neutral',
};

export default function renderUsers() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const render = () => {
    const wsId   = getWorkspaceId();
    const me     = getCurrentUser();
    const members = getWorkspaceMembers(wsId);

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Usuarios del Workspace</h1>
          <p>${members.length} miembro${members.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-user-btn">${icon('plus', 18)} Agregar Miembro</button>
        </div>
      </div>

      <!-- Roles legend -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:28px">
        ${Object.entries(ROLES).map(([key, label]) => `
          <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:12px 16px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span class="badge ${ROLE_BADGES[key]}">${label}</span>
            </div>
            <div style="font-size:0.75rem;color:var(--text-muted)">
              ${{ admin: 'Acceso total. Puede gestionar usuarios y configuración.', editor: 'Puede crear y editar transacciones y registros.', supervisor: 'Solo lectura. Ve todo sin poder modificar.', viewer: 'Vista básica de dashboard y transacciones.' }[key]}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Members list -->
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:16px 20px;background:var(--bg-input);border-bottom:1px solid var(--border-color);font-weight:600;font-size:0.85rem;color:var(--text-secondary)">
          MIEMBROS ACTIVOS
        </div>
        <div style="display:flex;flex-direction:column">
          ${members.map(member => {
            const isMe = member.id === me?.id;
            return `
              <div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border-color)">
                <div style="width:42px;height:42px;border-radius:50%;background:var(--accent-primary);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:white;flex-shrink:0">
                  ${member.avatar || member.nombre?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:0.95rem">
                    ${member.nombre} ${isMe ? '<span style="font-size:0.73rem;color:var(--text-muted)">(tú)</span>' : ''}
                  </div>
                  <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">${member.email}</div>
                </div>
                <span class="badge ${ROLE_BADGES[member.role] || 'badge-neutral'}" style="flex-shrink:0">
                  ${ROLES[member.role] || member.role}
                </span>
                ${!isMe ? `
                  <div style="display:flex;gap:6px;flex-shrink:0">
                    <select class="form-select" data-change-role="${member.id}" style="font-size:0.8rem;padding:4px 8px;width:auto">
                      ${Object.entries(ROLES).map(([k, v]) =>
                        `<option value="${k}" ${member.role === k ? 'selected' : ''}>${v}</option>`
                      ).join('')}
                    </select>
                    <button class="btn-icon" data-remove-member="${member.id}" title="Eliminar del workspace" style="color:var(--color-expense)">
                      ${icon('trash', 15)}
                    </button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Events
    page.querySelector('#add-user-btn')?.addEventListener('click', openAddModal);

    page.querySelectorAll('[data-change-role]').forEach(sel => {
      sel.addEventListener('change', () => {
        try {
          updateMemberRole(wsId, sel.dataset.changeRole, sel.value);
          showToast('success', 'Rol actualizado');
          render();
        } catch (err) {
          showToast('error', err.message);
          render();
        }
      });
    });

    page.querySelectorAll('[data-remove-member]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const member = members.find(m => m.id === btn.dataset.removeMember);
        const ok = await confirmDialog('¿Eliminar del workspace?', `${member?.nombre} perderá acceso a este workspace.`);
        if (ok) {
          try {
            removeMember(wsId, btn.dataset.removeMember);
            showToast('success', 'Miembro eliminado del workspace');
            render();
          } catch (err) {
            showToast('error', err.message);
          }
        }
      });
    });
  };

  function openAddModal() {
    const modal = openModal('Agregar Miembro', `
      <form id="add-user-form">
        <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:12px;font-size:0.82rem;color:var(--text-secondary);margin-bottom:16px">
          ℹ️ Si el correo ya tiene cuenta en FinanzApp, se le dará acceso a este workspace con el rol seleccionado.
          Si no tiene, se creará una cuenta nueva.
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input type="text" class="form-input" id="au-name" placeholder="Nombre del usuario" required />
          </div>
          <div class="form-group">
            <label class="form-label">Rol *</label>
            <select class="form-select" id="au-role" required>
              ${Object.entries(ROLES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Correo electrónico *</label>
          <input type="email" class="form-input" id="au-email" placeholder="correo@ejemplo.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña inicial *</label>
          <input type="password" class="form-input" id="au-pass" placeholder="Mín. 6 caracteres" required minlength="6" />
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">El usuario puede cambiarla desde Configuración.</div>
        </div>
        <div id="au-error" style="color:var(--color-expense);font-size:0.82rem;display:none;margin-bottom:8px"></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="au-submit">${icon('check', 18)} Agregar Miembro</button>
        </div>
      </form>
    `);

    modal.querySelector('#add-user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = modal.querySelector('#au-error');
      const btn   = modal.querySelector('#au-submit');
      errEl.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Agregando...';

      try {
        await addMember({
          workspaceId: getWorkspaceId(),
          nombre: modal.querySelector('#au-name').value,
          email:  modal.querySelector('#au-email').value,
          password: modal.querySelector('#au-pass').value,
          role:   modal.querySelector('#au-role').value,
        });
        showToast('success', 'Miembro agregado al workspace');
        closeModal();
        render();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Agregar Miembro';
      }
    });
  }

  render();
  return page;
}
