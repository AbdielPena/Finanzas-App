// ============================================
// Login Page — Multi-user Auth
// ============================================
import {
  hasAnyUsers, loginUser, registerUser, selectWorkspace,
  ROLES, hasLegacyData, finishForcedPasswordChange
} from '../auth.js';
import {
  isBiometricSupported, isBiometricEnabled, setBiometricEnabled,
  saveCredentialsForBiometric, getStoredCredentials,
} from '../biometric.js';
import { openModal, closeModal, showToast } from '../components.js';
import { icon } from '../icons.js';

const AVATARS = ['😊','🦁','🐼','🦊','🐸','🤖','🧑‍💻','👩‍💼','🧙','🦄'];

export function renderLogin(onSuccess) {
  const el = document.createElement('div');
  el.id = 'login-root';
  el.style.cssText = `
    position: relative;
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    background: var(--bg-body);
    padding: 20px;
    overflow: hidden;
  `;

  // Capa de partículas Three.js (ondas) detrás del contenido del login
  const fxLayer = document.createElement('div');
  fxLayer.id = 'login-fx';
  fxLayer.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none';
  el.appendChild(fxLayer);

  // Overlay sutil para que la card resalte sin perder el efecto
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:absolute;inset:0;z-index:1;pointer-events:none;
    background:
      radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 80%),
      radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.10) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.08) 0%, transparent 50%);
  `;
  el.appendChild(overlay);

  let destroyParticles = null;
  requestAnimationFrame(async () => {
    try {
      const { mountParticleWaves } = await import('../particle-waves.js');
      destroyParticles = mountParticleWaves(fxLayer, {
        density: window.innerWidth < 600 ? 28 : 45,
        speed: 0.06,
        amplitude: 60,
        separation: 110,
        particleColor: '#6c63ff',
      });
    } catch (e) {
      console.warn('[login] particles fx no se pudo iniciar:', e?.message || e);
    }
  });

  // Cleanup al desmontar el nodo
  const observer = new MutationObserver(() => {
    if (!document.body.contains(el)) {
      try { destroyParticles?.(); } catch {}
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  function showScreen(screen) {
    [...el.querySelectorAll(':scope > .login-screen')].forEach((n) => n.remove());
    const node = screen();
    node.classList.add('login-screen');
    node.style.position = 'relative';
    node.style.zIndex = '2';
    el.appendChild(node);
  }

  // ── Login Screen
  function loginScreen() {
    const div = document.createElement('div');
    div.style.cssText = 'width:100%;max-width:420px';
    div.innerHTML = `
      <div style="text-align:center;margin-bottom:36px">
        <span class="brand-logo" style="color:var(--text-primary);height:36px;width:160px;margin:0 auto 12px;display:inline-block"></span>
        <h1 style="font-family:var(--font-heading);font-size:1.4rem;color:var(--text-primary);margin:0">Finanzas</h1>
        <p style="color:var(--text-muted);font-size:0.9rem;margin-top:6px">Tu asistente financiero inteligente</p>
      </div>

      <div class="card" style="padding:32px">
        <h2 style="font-size:1.15rem;margin:0 0 24px;text-align:center">Iniciar Sesión</h2>
        <form id="login-form">
          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <input type="email" class="form-input" id="login-email" placeholder="correo@ejemplo.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <input type="password" class="form-input" id="login-pass" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <div id="login-error" style="color:var(--color-expense);font-size:0.82rem;margin:-8px 0 12px;display:none"></div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center" id="login-btn">
            Entrar →
          </button>
        </form>
        <button type="button" id="bio-quick-login" class="btn btn-secondary" style="display:none;width:100%;justify-content:center;align-items:center;gap:8px;margin-top:10px">
          ${icon('lock', 16)} Iniciar con biometría
        </button>
        <div style="text-align:center;margin-top:20px;font-size:0.85rem;color:var(--text-muted)">
          ¿No tienes cuenta?
          <button class="btn btn-ghost btn-sm" id="go-register" style="font-size:0.85rem">Regístrate gratis</button>
        </div>
      </div>
    `;

    div.querySelector('#go-register').addEventListener('click', () => showScreen(registerScreen));

    div.querySelector('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailVal = div.querySelector('#login-email').value;
      const passVal  = div.querySelector('#login-pass').value;
      await processLogin(emailVal, passVal, div);
    });

    // Quick-login con biometria (solo si la APK tiene biometria activada
    // y guardo credenciales en una sesion previa)
    setTimeout(async () => {
      try {
        if (!isBiometricEnabled()) return;
        const supported = await isBiometricSupported();
        if (!supported) return;
        const btn = div.querySelector('#bio-quick-login');
        if (!btn) return;
        btn.style.display = 'flex';
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.innerHTML = `${icon('lock', 16)} Verificando...`;
          try {
            const creds = await getStoredCredentials();
            if (!creds || !creds.email) {
              showToast('warning', 'No hay credenciales biometricas guardadas', 'Inicia sesion una vez para activarlas.');
              btn.disabled = false;
              btn.innerHTML = `${icon('lock', 16)} Iniciar con biometria`;
              return;
            }
            await processLogin(creds.email, creds.password, div);
          } catch (err) {
            showToast('error', 'Login biometrico fallo', err?.message || '');
            btn.disabled = false;
            btn.innerHTML = `${icon('lock', 16)} Iniciar con biometria`;
          }
        });
      } catch {}
    }, 50);

    return div;
  }

  async function processLogin(emailVal, passVal, div) {
    const btn   = div.querySelector('#login-btn');
    const errEl = div.querySelector('#login-error');
    errEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    try {
      const result = await loginUser(emailVal, passVal);
      let user = result.user;
      let workspaces = result.workspaces;
      if (result.forcePasswordChange) {
        showScreen(() => forcedPasswordChangeScreen(user, user.workspaces || [], onSuccess));
        return;
      }
      // Despues de un login exitoso, ofrecer activar biometria si aplica.
      await maybeOfferBiometricSetup(emailVal, passVal);
      if (workspaces && workspaces.length === 1) {
        selectWorkspace(user.id, workspaces[0].id);
        onSuccess();
      } else {
        showScreen(() => workspaceSelector(user, workspaces, onSuccess));
      }
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Entrar →';
    }
  }

  async function maybeOfferBiometricSetup(email, password) {
    try {
      const PROMPTED_KEY = 'finanzapp_bio_prompt_shown';
      if (localStorage.getItem(PROMPTED_KEY) === '1') return;
      if (isBiometricEnabled()) return;
      const supported = await isBiometricSupported();
      if (!supported) return;
      // Marca el prompt como mostrado aun si el usuario lo rechaza
      localStorage.setItem(PROMPTED_KEY, '1');
      await new Promise((resolve) => {
        const modal = openModal('Inicio de sesion biometrico', `
          <div style="text-align:center;padding:8px 4px 16px">
            <div style="font-size:2.4rem;margin-bottom:10px">🔒</div>
            <p style="margin:0 0 12px;font-size:0.95rem">¿Quieres activar el inicio de sesion con huella o face ID?</p>
            <p style="margin:0;font-size:0.8rem;color:var(--text-muted)">La proxima vez podras entrar a FinanzApp con un solo toque, sin escribir tu contrasena.</p>
          </div>
          <div class="form-actions" style="margin-top:18px">
            <button type="button" class="btn btn-secondary" id="bio-skip">Ahora no</button>
            <button type="button" class="btn btn-primary" id="bio-enable">${icon('lock', 14)} Activar</button>
          </div>
        `);
        modal.querySelector('#bio-skip').addEventListener('click', () => { closeModal(); resolve(); });
        modal.querySelector('#bio-enable').addEventListener('click', async () => {
          const ok = await saveCredentialsForBiometric(email, password);
          if (ok) {
            setBiometricEnabled(true);
            showToast('success', 'Biometria activada', 'La proxima vez podras iniciar sesion con tu huella.');
          } else {
            showToast('warning', 'No se pudo activar', 'Intenta de nuevo desde Configuracion → Seguridad.');
          }
          closeModal();
          resolve();
        });
      });
    } catch (e) {
      console.warn('[bio-prompt] error:', e?.message || e);
    }
  }

  // ── Register Screen
  function registerScreen() {
    const div = document.createElement('div');
    div.style.cssText = 'width:100%;max-width:460px';
    div.innerHTML = `
      <div style="text-align:center;margin-bottom:28px">
        <span class="brand-logo" style="color:var(--text-primary);height:32px;width:150px;margin:0 auto 10px;display:inline-block"></span>
        <h1 style="font-family:var(--font-heading);font-size:1.5rem;margin:0">Crear cuenta</h1>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:6px">Tu información y datos son completamente privados</p>
      </div>

      <div class="card" style="padding:32px">
        ${hasLegacyData() ? `
          <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.35);border-radius:10px;padding:12px 14px;font-size:0.82rem;color:#f59e0b;margin-bottom:18px;display:flex;gap:8px;align-items:flex-start">
            <span style="font-size:1.1rem;flex-shrink:0">🔄</span>
            <div>
              <strong>¡Datos anteriores detectados!</strong><br/>
              Al crear tu cuenta, tus cuentas bancarias, transacciones y toda la configuración previa se migrarán automáticamente a tu nuevo workspace.
            </div>
          </div>
        ` : ''}
        <form id="reg-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tu nombre *</label>
              <input type="text" class="form-input" id="reg-name" placeholder="Juan Pérez" required />
            </div>
            <div class="form-group">
              <label class="form-label">Avatar</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap" id="avatar-picker">
                ${AVATARS.map((a,i) => `
                  <button type="button" class="avatar-btn" data-avatar="${a}"
                    style="width:34px;height:34px;border-radius:50%;border:2px solid ${i===0?'var(--accent-primary)':'var(--border-color)'};background:var(--bg-input);font-size:1.1rem;cursor:pointer;transition:all 0.15s">
                    ${a}
                  </button>`).join('')}
              </div>
              <input type="hidden" id="reg-avatar" value="${AVATARS[0]}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Correo electrónico *</label>
            <input type="email" class="form-input" id="reg-email" placeholder="correo@ejemplo.com" required autocomplete="email" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Contraseña *</label>
              <input type="password" class="form-input" id="reg-pass" placeholder="Mín. 6 caracteres" required minlength="6" />
            </div>
            <div class="form-group">
              <label class="form-label">Confirmar *</label>
              <input type="password" class="form-input" id="reg-pass2" placeholder="••••••••" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Nombre de tu espacio de trabajo</label>
            <input type="text" class="form-input" id="reg-ws" placeholder="Ej: Finanzas Personales, Mi Empresa..." />
          </div>
          <div id="reg-error" style="color:var(--color-expense);font-size:0.82rem;margin:-8px 0 12px;display:none"></div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center" id="reg-btn">
            Crear mi cuenta →
          </button>
        </form>
        <div style="text-align:center;margin-top:16px;font-size:0.85rem;color:var(--text-muted)">
          ¿Ya tienes cuenta?
          <button class="btn btn-ghost btn-sm" id="go-login" style="font-size:0.85rem">Iniciar sesión</button>
        </div>
      </div>
    `;

    div.querySelector('#go-login').addEventListener('click', () => showScreen(loginScreen));

    // Avatar picker
    div.querySelectorAll('.avatar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        div.querySelectorAll('.avatar-btn').forEach(b => b.style.borderColor = 'var(--border-color)');
        btn.style.borderColor = 'var(--accent-primary)';
        div.querySelector('#reg-avatar').value = btn.dataset.avatar;
      });
    });

    div.querySelector('#reg-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = div.querySelector('#reg-error');
      const btn   = div.querySelector('#reg-btn');
      errEl.style.display = 'none';

      const pass  = div.querySelector('#reg-pass').value;
      const pass2 = div.querySelector('#reg-pass2').value;
      if (pass !== pass2) {
        errEl.textContent = 'Las contraseñas no coinciden.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Creando cuenta...';

      try {
        const { user, workspace, migrated } = await registerUser({
          nombre:        div.querySelector('#reg-name').value,
          email:         div.querySelector('#reg-email').value,
          password:      pass,
          workspaceName: div.querySelector('#reg-ws').value || undefined,
          avatar:        div.querySelector('#reg-avatar').value,
        });
        selectWorkspace(user.id, workspace.id);
        onSuccess(migrated);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Crear mi cuenta →';
      }
    });

    return div;
  }

  // ── Workspace Selector (multiple workspaces)
  function workspaceSelector(user, workspaces, onSuccess) {
    const div = document.createElement('div');
    div.style.cssText = 'width:100%;max-width:440px';
    div.innerHTML = `
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:2rem;margin-bottom:8px">${user.avatar || '👤'}</div>
        <h2 style="font-size:1.2rem;margin:0">Hola, ${user.nombre}</h2>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:4px">Selecciona un espacio de trabajo</p>
      </div>
      <div class="card" style="padding:24px">
        <div style="display:flex;flex-direction:column;gap:10px">
          ${workspaces.map(ws => `
            <button class="ws-select-btn" data-ws-id="${ws.id}"
              style="background:var(--bg-input);border:1px solid var(--border-color);border-radius:12px;padding:14px 18px;text-align:left;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:14px">
              <div style="font-size:1.4rem">🏢</div>
              <div>
                <div style="font-weight:600;font-size:0.95rem">${ws.nombre}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">Rol: ${ROLES[ws.role] || ws.role}</div>
              </div>
              <div style="margin-left:auto;color:var(--text-muted)">→</div>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    div.querySelectorAll('.ws-select-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => btn.style.borderColor = 'var(--accent-primary)');
      btn.addEventListener('mouseleave', () => btn.style.borderColor = 'var(--border-color)');
      btn.addEventListener('click', () => {
        selectWorkspace(user.id, btn.dataset.wsId);
        onSuccess();
      });
    });

    return div;
  }

  

  // ── Forced Password Change Screen
  function forcedPasswordChangeScreen(user, workspaces, onSuccess) {
    const div = document.createElement('div');
    div.style.cssText = 'width:100%;max-width:440px';
    div.innerHTML = `
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:2rem;margin-bottom:8px">🔐</div>
        <h2 style="font-size:1.2rem;margin:0">Actualización Requerida</h2>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:4px">Hola ${user.nombre}, el administrador ha solicitado que restablezcas tu contraseña antes de continuar.</p>
      </div>
      <div class="card" style="padding:24px">
        <form id="force-pass-form">
          <div class="form-group">
            <label class="form-label">Nueva Contraseña *</label>
            <input type="password" class="form-input" id="fp-pass" placeholder="Mínimo 6 caracteres" required minlength="6" />
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar Contraseña *</label>
            <input type="password" class="form-input" id="fp-pass2" placeholder="Repite la contraseña" required />
          </div>
          <div id="fp-error" style="color:var(--color-expense);font-size:0.82rem;margin:-8px 0 12px;display:none"></div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center" id="fp-btn">
            Actualizar y Entrar →
          </button>
        </form>
      </div>
    `;

    div.querySelector('#force-pass-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = div.querySelector('#fp-error');
      const btn   = div.querySelector('#fp-btn');
      errEl.style.display = 'none';

      const pass = div.querySelector('#fp-pass').value;
      const pass2 = div.querySelector('#fp-pass2').value;

      if (pass !== pass2) {
        errEl.textContent = 'Las contraseñas no coinciden.';
        errEl.style.display = 'block';
        return;
      }
      if (pass.length < 6) {
        errEl.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Actualizando...';

      try {
        await finishForcedPasswordChange(user.id, pass);
        // Continue login flow
        if (workspaces.length === 1) {
          selectWorkspace(user.id, workspaces[0].id);
          onSuccess();
        } else {
          showScreen(() => workspaceSelector(user, workspaces, onSuccess));
        }
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Actualizar y Entrar →';
      }
    });

    return div;
  }

  // ── Initial render
  if (hasAnyUsers()) {
    showScreen(loginScreen);
  } else {
    showScreen(registerScreen);
  }

  return el;
}
