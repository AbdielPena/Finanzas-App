// ============================================================
// Pagina: Seguridad (login biometrico, sesiones)
// ============================================================
import {
  isBiometricSupported, isBiometricEnabled, setBiometricEnabled,
  authenticateBiometric,
} from '../biometric.js';
import { showToast } from '../components.js';
import { logout } from '../auth.js';
import { icon } from '../icons.js';

export default function renderSecurity() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  let supported = false;
  let enabled = isBiometricEnabled();

  const render = () => {
    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Seguridad</h1>
          <p>Login biometrico y manejo de sesion</p>
        </div>
      </div>

      <div class="card" style="padding:24px;margin-bottom:20px">
        <h3 style="margin-top:0">Login biometrico</h3>
        ${!supported ? `
          <p style="color:var(--text-secondary)">
            Tu dispositivo no soporta biometria, o solo esta disponible en la app movil (no en navegador web).
          </p>
        ` : `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-weight:600">Desbloquear con huella o face</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px">
                Cada vez que abras FinanzApp en este dispositivo, te pedira autenticarte
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="bio-toggle" ${enabled ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <p style="font-size:0.78rem;color:var(--text-muted);margin-top:14px">
            Tu sesion seguira activa entre aperturas. Solo necesitaras la huella, no tu password.
          </p>
        `}
      </div>

      <div class="card" style="padding:24px">
        <h3 style="margin-top:0">Sesion</h3>
        <p style="color:var(--text-secondary);margin-bottom:16px">
          Tu sesion en este dispositivo se mantiene hasta que hagas logout manualmente.
          ${window.Capacitor || window.__TAURI__ ? '' : 'En el navegador, tambien se cerrara cuando cierres todas las pestanas del navegador.'}
        </p>
        <button id="logout-btn" class="btn btn-danger">${icon('logOut', 16)} Cerrar sesion ahora</button>
      </div>
    `;
    wire();
  };

  function wire() {
    page.querySelector('#bio-toggle')?.addEventListener('change', async (e) => {
      const wantEnable = e.target.checked;
      if (wantEnable) {
        // Pide autenticacion para confirmar (asi sabe que el usuario la tiene configurada)
        const ok = await authenticateBiometric('Confirma tu huella para activar');
        if (!ok) {
          e.target.checked = false;
          showToast('error', 'No se pudo verificar tu biometria');
          return;
        }
        setBiometricEnabled(true);
        enabled = true;
        showToast('success', 'Biometria activada', 'Te pediremos huella al abrir la app');
      } else {
        setBiometricEnabled(false);
        enabled = false;
        showToast('info', 'Biometria desactivada');
      }
    });

    page.querySelector('#logout-btn')?.addEventListener('click', () => {
      logout();
      location.reload();
    });
  }

  // Async check
  (async () => {
    supported = await isBiometricSupported();
    render();
  })();
  render();
  return page;
}
