// ============================================================
// Pagina: Preferencias de notificaciones
// ============================================================
import { notificationPrefs as prefsApi } from '../api-client.js';
import { showToast } from '../components.js';
import { icon } from '../icons.js';

export default function renderNotificationPreferences() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  let prefs = null;
  let loading = true;

  const render = () => {
    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Preferencias de Notificaciones</h1>
          <p>Decide cómo y cuándo te avisamos</p>
        </div>
      </div>

      ${loading ? `
        <div class="card" style="padding:40px;text-align:center;color:var(--text-secondary)">
          Cargando preferencias...
        </div>
      ` : `
        <div class="card" style="padding:24px;margin-bottom:20px">
          <h3 style="margin-top:0">Canales</h3>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:20px">Por dónde quieres recibir las notificaciones</p>
          ${toggleRow('emailEnabled', 'Email', 'Recibir alertas y resúmenes en tu correo', prefs.emailEnabled)}
          ${toggleRow('pushEnabled', 'Push (móvil)', 'Notificaciones nativas en Android', prefs.pushEnabled)}
          ${toggleRow('inAppEnabled', 'Dentro de la app', 'Centro de notificaciones', prefs.inAppEnabled)}
        </div>

        <div class="card" style="padding:24px;margin-bottom:20px">
          <h3 style="margin-top:0">Resúmenes</h3>
          ${toggleRow('dailySummary', 'Resumen diario', 'Email cada mañana con saldos, próximos pagos y alertas', prefs.dailySummary)}
          ${toggleRow('weeklySummary', 'Resumen semanal', 'Email cada lunes con tendencias del último mes', prefs.weeklySummary)}
          <button id="send-now-btn" class="btn btn-secondary" style="margin-top:12px">
            ${icon('mail', 16)} Enviar resumen ahora (test)
          </button>
          <button id="test-push-btn" class="btn btn-secondary" style="margin-top:12px;margin-left:8px">
            ${icon('notification', 16)} Probar push (Android)
          </button>
          <button id="diag-push-btn" class="btn btn-ghost" style="margin-top:12px;margin-left:8px">
            ${icon('settings', 16)} Diagnostico push
          </button>
          <pre id="diag-push-out" style="margin-top:12px;background:var(--bg-2);padding:12px;border-radius:8px;font-size:0.75rem;white-space:pre-wrap;display:none"></pre>
        </div>

        <div class="card" style="padding:24px;margin-bottom:20px">
          <h3 style="margin-top:0">Tipos de alerta</h3>
          ${toggleRow('alertPayments', 'Vencimientos de pagos', 'Cuentas por pagar próximas a vencer', prefs.alertPayments)}
          ${toggleRow('alertSubscriptions', 'Suscripciones', 'Cargos próximos de servicios recurrentes', prefs.alertSubscriptions)}
          ${toggleRow('alertDebts', 'Deudas', 'Próximos pagos de deudas y préstamos', prefs.alertDebts)}
          ${toggleRow('alertCardUsage', 'Uso de tarjetas', 'Cuando una tarjeta supere el umbral de uso', prefs.alertCardUsage)}
        </div>

        <div class="card" style="padding:24px;margin-bottom:20px">
          <h3 style="margin-top:0">Sensibilidad</h3>
          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label" style="position:static;display:block;margin-bottom:8px">Umbral de uso de tarjeta (%)</label>
            <input type="range" id="card-threshold" min="50" max="100" step="5" value="${prefs.cardUsageThreshold ?? 80}" style="width:100%" />
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-secondary)">
              <span>50%</span>
              <span id="threshold-value" style="color:var(--accent-primary);font-weight:700">${prefs.cardUsageThreshold ?? 80}%</span>
              <span>100%</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" style="position:static;display:block;margin-bottom:8px">Días de anticipación para avisos</label>
            <input type="number" class="form-input" id="anticipation-days" min="0" max="30" value="${prefs.anticipationDays ?? 3}" style="max-width:120px" />
            <span style="font-size:0.8rem;color:var(--text-secondary);margin-left:8px">días antes del vencimiento</span>
          </div>
        </div>

        <div class="card" style="padding:24px">
          <h3 style="margin-top:0">Horario silencioso (opcional)</h3>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">No enviarte push entre estas horas</p>
          <div style="display:flex;gap:16px;align-items:flex-end">
            <div class="form-group">
              <label class="form-label" style="position:static;display:block;margin-bottom:8px">Desde</label>
              <input type="time" class="form-input" id="quiet-start" value="${prefs.quietHoursStart || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label" style="position:static;display:block;margin-bottom:8px">Hasta</label>
              <input type="time" class="form-input" id="quiet-end" value="${prefs.quietHoursEnd || ''}" />
            </div>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-top:24px">
          <button id="save-btn" class="btn btn-primary">${icon('check', 16)} Guardar cambios</button>
          <button id="reset-btn" class="btn btn-ghost">Restablecer</button>
        </div>
      `}
    `;

    if (!loading) wireEvents();
  };

  function toggleRow(key, title, desc, value) {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-weight:600">${title}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px">${desc}</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" data-pref="${key}" ${value ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
  }

  function wireEvents() {
    // Toggles → guarda al cambiar
    page.querySelectorAll('[data-pref]').forEach(input => {
      input.addEventListener('change', () => {
        prefs[input.dataset.pref] = input.checked;
      });
    });

    // Slider de umbral
    const slider = page.querySelector('#card-threshold');
    const sliderValue = page.querySelector('#threshold-value');
    slider?.addEventListener('input', () => {
      const v = parseInt(slider.value, 10);
      prefs.cardUsageThreshold = v;
      if (sliderValue) sliderValue.textContent = `${v}%`;
    });

    page.querySelector('#anticipation-days')?.addEventListener('input', (e) => {
      prefs.anticipationDays = parseInt(e.target.value, 10) || 3;
    });
    page.querySelector('#quiet-start')?.addEventListener('input', (e) => {
      prefs.quietHoursStart = e.target.value || null;
    });
    page.querySelector('#quiet-end')?.addEventListener('input', (e) => {
      prefs.quietHoursEnd = e.target.value || null;
    });

    // Save
    page.querySelector('#save-btn')?.addEventListener('click', async () => {
      try {
        await prefsApi.update(prefs);
        showToast('success', 'Preferencias guardadas');
      } catch (e) {
        showToast('error', 'Error guardando: ' + e.message);
      }
    });

    page.querySelector('#reset-btn')?.addEventListener('click', () => {
      load();
    });

    page.querySelector('#send-now-btn')?.addEventListener('click', async () => {
      try {
        await prefsApi.sendSummary();
        showToast('success', 'Resumen enviado a tu email');
      } catch (e) {
        showToast('error', 'No se pudo enviar: ' + e.message);
      }
    });

    page.querySelector('#diag-push-btn')?.addEventListener('click', async () => {
      const out = page.querySelector('#diag-push-out');
      out.style.display = 'block';
      const lines = [];
      const log = (msg) => { lines.push(msg); out.textContent = lines.join('\n'); };
      log('1. Capacitor disponible: ' + Boolean(window.Capacitor));
      log('   isNativePlatform: ' + (window.Capacitor?.isNativePlatform?.() ?? 'n/a'));
      log('   getPlatform: ' + (window.Capacitor?.getPlatform?.() ?? 'n/a'));
      const plugins = window.Capacitor?.Plugins || {};
      log('2. Plugins cargados: ' + Object.keys(plugins).join(', '));
      const PN = plugins.PushNotifications;
      if (!PN) { log('ERROR: PushNotifications plugin NO disponible en window.Capacitor.Plugins'); return; }
      log('3. PushNotifications plugin OK');
      try {
        const perm = await PN.checkPermissions();
        log('4. Permiso actual: ' + JSON.stringify(perm));
        if (perm.receive !== 'granted') {
          const req = await PN.requestPermissions();
          log('5. Pedido permiso: ' + JSON.stringify(req));
        }
        log('6. Llamando register()...');
        await PN.register();
        log('7. register() OK - esperando token...');
      } catch (e) {
        log('ERROR en flow: ' + e.message);
      }
      // Listen for registration
      PN.addListener?.('registration', async (t) => {
        log('8. TOKEN recibido: ' + (t.value || '').slice(0, 30) + '...');
        try {
          const { notificationPrefs } = await import('../api-client.js');
          await notificationPrefs.update({ push_token: t.value });
          log('9. Token guardado en backend OK');
        } catch (e) {
          log('ERROR guardando token: ' + e.message);
        }
      });
      PN.addListener?.('registrationError', (e) => {
        log('ERROR de FCM: ' + JSON.stringify(e));
      });
    });

    page.querySelector('#test-push-btn')?.addEventListener('click', async () => {
      try {
        const r = await prefsApi.testPush();
        if (r.ok) {
          showToast('success', 'Push enviado, revisa tu Android');
        } else if (r.reason === 'no_device_token_registered') {
          showToast('error', r.hint || 'No hay device token registrado');
        } else if (r.reason === 'firebase_not_configured') {
          showToast('error', 'Firebase no esta configurado en backend');
        } else {
          showToast('error', 'Push fallo: ' + (r.reason || 'desconocido'));
        }
      } catch (e) {
        showToast('error', 'No se pudo enviar push: ' + e.message);
      }
    });
  }

  async function load() {
    loading = true;
    render();
    try {
      const r = await prefsApi.get();
      prefs = r.data;
    } catch (e) {
      showToast('error', 'Error cargando preferencias: ' + e.message);
      prefs = {
        emailEnabled: true, pushEnabled: true, inAppEnabled: true,
        dailySummary: true, weeklySummary: false,
        alertPayments: true, alertSubscriptions: true, alertDebts: true, alertCardUsage: true,
        cardUsageThreshold: 80, anticipationDays: 3,
      };
    }
    loading = false;
    render();
  }

  load();
  return page;
}
