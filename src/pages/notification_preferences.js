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
          ${toggleRow('email_enabled', 'Email', 'Recibir alertas y resúmenes en tu correo', prefs.email_enabled)}
          ${toggleRow('push_enabled', 'Push (móvil)', 'Notificaciones nativas en Android', prefs.push_enabled)}
          ${toggleRow('in_app_enabled', 'Dentro de la app', 'Centro de notificaciones', prefs.in_app_enabled)}
        </div>

        <div class="card" style="padding:24px;margin-bottom:20px">
          <h3 style="margin-top:0">Resúmenes</h3>
          ${toggleRow('daily_summary', 'Resumen diario', 'Email cada mañana con saldos, próximos pagos y alertas', prefs.daily_summary)}
          ${toggleRow('weekly_summary', 'Resumen semanal', 'Email cada lunes con tendencias del último mes', prefs.weekly_summary)}
          <button id="send-now-btn" class="btn btn-secondary" style="margin-top:12px">
            ${icon('mail', 16)} Enviar resumen ahora (test)
          </button>
          <button id="test-push-btn" class="btn btn-secondary" style="margin-top:12px;margin-left:8px">
            ${icon('notification', 16)} Probar push (Android)
          </button>
        </div>

        <div class="card" style="padding:24px;margin-bottom:20px">
          <h3 style="margin-top:0">Tipos de alerta</h3>
          ${toggleRow('alert_payments', 'Vencimientos de pagos', 'Cuentas por pagar próximas a vencer', prefs.alert_payments)}
          ${toggleRow('alert_subscriptions', 'Suscripciones', 'Cargos próximos de servicios recurrentes', prefs.alert_subscriptions)}
          ${toggleRow('alert_debts', 'Deudas', 'Próximos pagos de deudas y préstamos', prefs.alert_debts)}
          ${toggleRow('alert_card_usage', 'Uso de tarjetas', 'Cuando una tarjeta supere el umbral de uso', prefs.alert_card_usage)}
        </div>

        <div class="card" style="padding:24px;margin-bottom:20px">
          <h3 style="margin-top:0">Sensibilidad</h3>
          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label" style="position:static;display:block;margin-bottom:8px">Umbral de uso de tarjeta (%)</label>
            <input type="range" id="card-threshold" min="50" max="100" step="5" value="${prefs.card_usage_threshold}" style="width:100%" />
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-secondary)">
              <span>50%</span>
              <span id="threshold-value" style="color:var(--accent-primary);font-weight:700">${prefs.card_usage_threshold}%</span>
              <span>100%</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" style="position:static;display:block;margin-bottom:8px">Días de anticipación para avisos</label>
            <input type="number" class="form-input" id="anticipation-days" min="0" max="30" value="${prefs.anticipation_days}" style="max-width:120px" />
            <span style="font-size:0.8rem;color:var(--text-secondary);margin-left:8px">días antes del vencimiento</span>
          </div>
        </div>

        <div class="card" style="padding:24px">
          <h3 style="margin-top:0">Horario silencioso (opcional)</h3>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">No enviarte push entre estas horas</p>
          <div style="display:flex;gap:16px;align-items:flex-end">
            <div class="form-group">
              <label class="form-label" style="position:static;display:block;margin-bottom:8px">Desde</label>
              <input type="time" class="form-input" id="quiet-start" value="${prefs.quiet_hours_start || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label" style="position:static;display:block;margin-bottom:8px">Hasta</label>
              <input type="time" class="form-input" id="quiet-end" value="${prefs.quiet_hours_end || ''}" />
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
      prefs.card_usage_threshold = v;
      if (sliderValue) sliderValue.textContent = `${v}%`;
    });

    page.querySelector('#anticipation-days')?.addEventListener('input', (e) => {
      prefs.anticipation_days = parseInt(e.target.value, 10) || 3;
    });
    page.querySelector('#quiet-start')?.addEventListener('input', (e) => {
      prefs.quiet_hours_start = e.target.value || null;
    });
    page.querySelector('#quiet-end')?.addEventListener('input', (e) => {
      prefs.quiet_hours_end = e.target.value || null;
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
        email_enabled: true, push_enabled: true, in_app_enabled: true,
        daily_summary: true, weekly_summary: false,
        alert_payments: true, alert_subscriptions: true, alert_debts: true, alert_card_usage: true,
        card_usage_threshold: 80, anticipation_days: 3,
      };
    }
    loading = false;
    render();
  }

  load();
  return page;
}
