// ============================================================
// Push Notifications setup (Android via FCM)
// Solo se activa cuando corre dentro de Capacitor (APK).
// Requiere que el usuario haya hecho setup de Firebase
// (google-services.json en android/app/).
// ============================================================
import { notificationPrefs } from './api-client.js';

let initialized = false;

export async function initPushNotifications() {
  if (initialized) return;
  if (typeof window === 'undefined' || !window.Capacitor) return;

  try {
    const { PushNotifications } = window.Capacitor.Plugins || {};
    if (!PushNotifications) {
      console.warn('[push] PushNotifications plugin no disponible');
      return;
    }

    initialized = true;

    // Pide permiso al usuario
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      console.log('[push] usuario rechazo permisos');
      return;
    }

    // Registra el dispositivo en FCM
    await PushNotifications.register();

    // Listener: token recibido
    PushNotifications.addListener('registration', async (tokenData) => {
      const token = tokenData.value;
      console.log('[push] token recibido', token.slice(0, 20) + '...');
      try {
        // Guarda el token en backend asociado al usuario logueado
        await notificationPrefs.update({ push_token: token });
      } catch (e) {
        console.warn('[push] no se pudo guardar token en backend:', e.message);
      }
    });

    // Listener: error en registro
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[push] error registrando:', err);
    });

    // Listener: notificacion recibida con app abierta (foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[push] notificacion recibida en foreground:', notification);
      // Opcional: mostrar toast in-app
      if (window.Toastify || document.body) {
        showPushBanner(notification);
      }
    });

    // Listener: usuario tocó la notificación
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[push] usuario tap notificacion:', action);
      const route = action?.notification?.data?.route;
      if (route) {
        window.location.hash = route;
      }
    });
  } catch (e) {
    console.warn('[push] init fallo:', e.message);
  }
}

function showPushBanner(notification) {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed; top: 12px; left: 12px; right: 12px; z-index: 99998;
    background: linear-gradient(90deg, #6c63ff, #4a3fcf);
    color: white; padding: 14px 16px; border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    animation: slideDown 0.4s ease-out;
    cursor: pointer;
  `;
  banner.innerHTML = `
    <div style="font-weight:700;margin-bottom:2px">${escapeHtml(notification.title || 'FinanzApp')}</div>
    <div style="font-size:0.9rem;opacity:0.9">${escapeHtml(notification.body || '')}</div>
  `;
  banner.addEventListener('click', () => banner.remove());
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 5000);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

export default { initPushNotifications };
