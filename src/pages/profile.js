// ============================================
// Profile Page — Account Manager
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { openModal, closeModal, showToast, confirmDialog } from '../components.js';
import {
  getCurrentUser, getSession, getCurrentWorkspace, getWorkspaceMembers,
  ROLES, logout
} from '../auth.js';

// ─────────────────────────────────────────────
// Inline import of changePassword (avoiding circular deps)
// ─────────────────────────────────────────────
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function doChangePassword(userId, oldPass, newPass) {
  const usersRaw = localStorage.getItem('finanzapp_users');
  if (!usersRaw) throw new Error('No se encontró la base de usuarios.');
  const users = JSON.parse(usersRaw);
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) throw new Error('Usuario no encontrado.');
  const user = users[idx];
  const oldHash = await hashPassword(oldPass, user.salt);
  if (oldHash !== user.passwordHash) throw new Error('La contraseña actual es incorrecta.');
  const newSalt = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2,'0')).join('');
  const newHash = await hashPassword(newPass, newSalt);
  users[idx] = { ...user, passwordHash: newHash, salt: newSalt };
  localStorage.setItem('finanzapp_users', JSON.stringify(users));
}

async function doUpdateProfile(userId, updates) {
  const usersRaw = localStorage.getItem('finanzapp_users');
  if (!usersRaw) return;
  const users = JSON.parse(usersRaw);
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return;
  users[idx] = { ...users[idx], ...updates };
  localStorage.setItem('finanzapp_users', JSON.stringify(users));
}

const AVATARS = ['😊','🦁','🐼','🦊','🐸','🤖','🧑‍💻','👩‍💼','🧙','🦄','💎','🚀','🎯','💡','🔥'];

export default function renderProfile() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const user = getCurrentUser();
  const session = getSession();
  const workspace = getCurrentWorkspace();
  const members = workspace ? getWorkspaceMembers(workspace.id) : [];

  if (!user || !session) {
    page.innerHTML = `<div class="empty-state card"><h3>No autenticado</h3><p>Por favor inicia sesión.</p></div>`;
    return page;
  }

  const roleLabel = ROLES[session.role] || session.role || 'Usuario';
  const roleColor = { admin: 'var(--color-income)', editor: 'var(--accent-primary)', supervisor: 'var(--color-warning)', viewer: 'var(--text-muted)' }[session.role] || 'var(--text-muted)';

  const render = () => {
    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Mi Perfil</h1>
          <p>Gestiona tu cuenta, seguridad y preferencias</p>
        </div>
      </div>

      <div class="grid grid-2" style="gap:20px;align-items:start">

        <!-- ── Perfil del Usuario ── -->
        <div class="card" style="padding:28px">
          <div style="display:flex;align-items:center;gap:18px;margin-bottom:24px">
            <div id="avatar-display" style="width:72px;height:72px;border-radius:50%;background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:2.4rem;cursor:pointer;border:2px solid var(--accent-primary);flex-shrink:0" title="Cambiar avatar">
              ${user.avatar || '😊'}
            </div>
            <div>
              <div style="font-size:1.4rem;font-weight:700">${user.nombre}</div>
              <div style="font-size:0.85rem;color:var(--text-muted)">${user.email}</div>
              <div style="margin-top:6px"><span class="badge" style="background:${roleColor}22;color:${roleColor};border:1px solid ${roleColor}44">${roleLabel}</span></div>
            </div>
          </div>

          <!-- Avatar picker (hidden) -->
          <div id="avatar-picker" style="display:none;flex-wrap:wrap;gap:8px;margin-bottom:20px;padding:12px;background:var(--bg-input);border-radius:10px">
            ${AVATARS.map(a => `<button class="avatar-opt" style="width:36px;height:36px;border-radius:50%;background:var(--bg-card);border:2px solid transparent;font-size:1.3rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s" data-avatar="${a}">${a}</button>`).join('')}
            <button id="close-avatar" class="btn btn-ghost btn-sm" style="width:100%">Cerrar</button>
          </div>

          <!-- Edit name -->
          <div class="form-group">
            <label class="form-label">Nombre</label>
            <div style="display:flex;gap:8px">
              <input type="text" class="form-input" id="profile-name" value="${user.nombre}" placeholder="Tu nombre" />
              <button class="btn btn-primary" id="save-name-btn" style="white-space:nowrap">${icon('check',16)} Guardar</button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <input type="text" class="form-input" value="${user.email}" disabled style="opacity:0.6" />
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px">El correo no se puede cambiar (es tu identificador de acceso).</div>
          </div>

          <hr style="border:none;border-top:1px solid var(--border-color);margin:20px 0" />
          <h4 style="margin-bottom:16px;font-size:0.9rem;color:var(--text-secondary)">🔐 Cambiar Contraseña</h4>

          <form id="change-pass-form">
            <div class="form-group">
              <label class="form-label">Contraseña Actual</label>
              <input type="password" class="form-input" id="old-pass" placeholder="Tu contraseña actual" autocomplete="current-password" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nueva Contraseña</label>
                <input type="password" class="form-input" id="new-pass" placeholder="Mínimo 6 caracteres" autocomplete="new-password" required />
              </div>
              <div class="form-group">
                <label class="form-label">Confirmar Nueva</label>
                <input type="password" class="form-input" id="confirm-pass" placeholder="Repetir contraseña" autocomplete="new-password" required />
              </div>
            </div>
            <div id="pass-error" style="color:var(--color-expense);font-size:0.82rem;display:none;margin-bottom:10px"></div>
            <button type="submit" class="btn btn-primary" style="width:100%">${icon('lock',16)} Cambiar Contraseña</button>
          </form>
        </div>

        <!-- ── Workspace Info ── -->
        <div style="display:flex;flex-direction:column;gap:20px">
          <div class="card" style="padding:24px">
            <h3 style="font-size:1rem;margin-bottom:16px;display:flex;align-items:center;gap:8px">${icon('bank',18)} Workspace Activo</h3>
            <div style="padding:14px;background:var(--bg-input);border-radius:10px;margin-bottom:16px">
              <div style="font-size:1.1rem;font-weight:700">${workspace?.nombre || 'Workspace'}</div>
              <div style="font-size:0.76rem;color:var(--text-muted);margin-top:4px">ID: ${workspace?.id || ''}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:6px">Creado: ${workspace?.createdAt ? new Date(workspace.createdAt).toLocaleDateString('es-DO') : '—'}</div>
            </div>

            <h4 style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px">${icon('users',14)} Miembros (${members.length})</h4>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${members.map(m => `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-input);border-radius:8px">
                  <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-primary);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">${m.avatar || m.nombre?.charAt(0) || '?'}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.nombre} ${m.id === session.userId ? '<span style="font-size:0.7rem;color:var(--accent-primary)">(tú)</span>' : ''}</div>
                    <div style="font-size:0.72rem;color:var(--text-muted)">${m.email}</div>
                  </div>
                  <span class="badge badge-neutral" style="font-size:0.7rem">${ROLES[m.role] || m.role}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Session / Security info -->
          <div class="card" style="padding:24px">
            <h3 style="font-size:1rem;margin-bottom:16px;display:flex;align-items:center;gap:8px">${icon('settings',18)} Sesión y Seguridad</h3>
            <div style="display:flex;flex-direction:column;gap:10px;font-size:0.85rem">
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--text-muted)">Sesión activa</span>
                <span style="color:var(--color-income)">● Conectado</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--text-muted)">Rol en workspace</span>
                <span style="color:${roleColor};font-weight:600">${roleLabel}</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--text-muted)">Cuenta creada</span>
                <span>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-DO') : '—'}</span>
              </div>
            </div>
            <hr style="border:none;border-top:1px solid var(--border-color);margin:16px 0" />
            <button id="logout-profile-btn" class="btn btn-secondary" style="width:100%;color:var(--color-expense);border-color:var(--color-expense)">${icon('logout',16)} Cerrar Sesión</button>
          </div>
        </div>
      </div>
    `;

    // ── Avatar toggle
    const avatarDisplay = page.querySelector('#avatar-display');
    const avatarPicker  = page.querySelector('#avatar-picker');
    avatarDisplay.addEventListener('click', () => {
      avatarPicker.style.display = avatarPicker.style.display === 'none' ? 'flex' : 'none';
    });
    page.querySelector('#close-avatar')?.addEventListener('click', () => {
      avatarPicker.style.display = 'none';
    });
    page.querySelectorAll('.avatar-opt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const av = btn.dataset.avatar;
        await doUpdateProfile(session.userId, { avatar: av });
        // Update session storage display
        const sessRaw = sessionStorage.getItem('finanzapp_session');
        if (sessRaw) {
          const sess = JSON.parse(sessRaw);
          sess.avatar = av;
          sessionStorage.setItem('finanzapp_session', JSON.stringify(sess));
        }
        showToast('success', 'Avatar actualizado');
        render();
      });
    });

    // ── Save name
    page.querySelector('#save-name-btn').addEventListener('click', async () => {
      const nombre = page.querySelector('#profile-name').value.trim();
      if (!nombre) { showToast('error', 'El nombre no puede estar vacío'); return; }
      await doUpdateProfile(session.userId, { nombre });
      showToast('success', '✅ Nombre actualizado');
      render();
    });

    // ── Change password
    page.querySelector('#change-pass-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = page.querySelector('#pass-error');
      const oldPass = page.querySelector('#old-pass').value;
      const newPass = page.querySelector('#new-pass').value;
      const confPass = page.querySelector('#confirm-pass').value;
      errEl.style.display = 'none';

      if (newPass.length < 6) { errEl.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.'; errEl.style.display = 'block'; return; }
      if (newPass !== confPass) { errEl.textContent = 'Las contraseñas nuevas no coinciden.'; errEl.style.display = 'block'; return; }

      const btn = e.target.querySelector('[type=submit]');
      btn.disabled = true; btn.textContent = 'Cambiando...';
      try {
        await doChangePassword(session.userId, oldPass, newPass);
        showToast('success', '🔐 Contraseña cambiada correctamente');
        e.target.reset();
      } catch (err) {
        errEl.textContent = err.message; errEl.style.display = 'block';
      } finally {
        btn.disabled = false; btn.innerHTML = `${icon('lock',16)} Cambiar Contraseña`;
      }
    });

    // ── Logout
    page.querySelector('#logout-profile-btn')?.addEventListener('click', async () => {
      const ok = await confirmDialog('Cerrar Sesión', '¿Deseas cerrar tu sesión actual?');
      if (ok) { logout(); location.reload(); }
    });
  };

  render();
  return page;
}
