// ============================================================
// Pagina: Instalar el widget de FinanzApp
// Guia visual para que el usuario agregue el widget a su pantalla
// ============================================================
import { icon } from '../icons.js';

export default function renderWidgetInstall() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const isAndroid = /Android/i.test(navigator.userAgent);
  const isCapacitor = !!window.Capacitor;

  page.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Widget de FinanzApp</h1>
        <p>Registra ingresos y gastos sin abrir la app</p>
      </div>
    </div>

    ${!isAndroid ? `
      <div class="card" style="padding:24px;text-align:center">
        <div style="font-size:3rem;margin-bottom:12px">📱</div>
        <h3>Solo disponible en Android</h3>
        <p style="color:var(--text-secondary)">
          Los widgets son una funcionalidad nativa de Android. Instala la app
          FinanzApp en tu celular Android para usar el widget en tu pantalla
          de inicio.
        </p>
      </div>
    ` : !isCapacitor ? `
      <div class="card" style="padding:24px;text-align:center">
        <div style="font-size:3rem;margin-bottom:12px">📥</div>
        <h3>Descarga la app Android</h3>
        <p style="color:var(--text-secondary);margin-bottom:16px">
          Estas viendo FinanzApp en el navegador de Chrome. Para usar el widget
          necesitas instalar el APK.
        </p>
        <a href="https://github.com/AbdielPena/Finanzas-App/releases/latest"
           class="btn btn-primary"
           target="_blank">${icon('download', 16)} Descargar APK</a>
      </div>
    ` : `
      <!-- Demo visual del widget -->
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:24px">
        <div style="background:linear-gradient(135deg,#6c63ff,#4a3fcf);padding:20px;color:white">
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;opacity:0.8;margin-bottom:4px">
            <span style="font-weight:600">FINANZAPP</span>
            <span>Hace un momento</span>
          </div>
          <div style="font-size:1.8rem;font-weight:700;margin-bottom:14px">RD$25,400.00</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
            <div style="background:#22c55e;padding:14px 8px;border-radius:10px;text-align:center">
              <div style="font-size:1.3rem;font-weight:700;color:white">+</div>
              <div style="font-size:0.7rem;color:white">Ingreso</div>
            </div>
            <div style="background:#ef4444;padding:14px 8px;border-radius:10px;text-align:center">
              <div style="font-size:1.3rem;font-weight:700;color:white">-</div>
              <div style="font-size:0.7rem;color:white">Gasto</div>
            </div>
            <div style="background:#3b82f6;padding:14px 8px;border-radius:10px;text-align:center">
              <div style="font-size:1.1rem;color:white">↔</div>
              <div style="font-size:0.7rem;color:white">Transf.</div>
            </div>
            <div style="background:rgba(255,255,255,0.18);padding:14px 8px;border-radius:10px;text-align:center;border:1px solid rgba(255,255,255,0.3)">
              <div style="font-size:1.3rem;color:white">⌂</div>
              <div style="font-size:0.7rem;color:white">Abrir</div>
            </div>
          </div>
        </div>
      </div>

      <h3 style="margin:24px 0 12px">Como agregarlo a tu pantalla de inicio:</h3>

      <div class="card" style="padding:20px;margin-bottom:12px">
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="background:var(--accent-primary);color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700">1</div>
          <div>
            <strong>Mantén pulsado un espacio vacío</strong> en tu pantalla de inicio
            <p style="color:var(--text-secondary);margin:4px 0 0;font-size:0.9rem">Hasta que aparezca un menu</p>
          </div>
        </div>
      </div>

      <div class="card" style="padding:20px;margin-bottom:12px">
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="background:var(--accent-primary);color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700">2</div>
          <div>
            <strong>Tap "Widgets"</strong>
            <p style="color:var(--text-secondary);margin:4px 0 0;font-size:0.9rem">El nombre puede variar segun tu marca: Widgets, Personalizar, Anadir</p>
          </div>
        </div>
      </div>

      <div class="card" style="padding:20px;margin-bottom:12px">
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="background:var(--accent-primary);color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700">3</div>
          <div>
            <strong>Busca "FinanzApp Quick"</strong> en la lista de widgets
            <p style="color:var(--text-secondary);margin:4px 0 0;font-size:0.9rem">Aparecera con el icono morado de la app</p>
          </div>
        </div>
      </div>

      <div class="card" style="padding:20px;margin-bottom:12px">
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="background:var(--accent-primary);color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700">4</div>
          <div>
            <strong>Manten pulsado el widget y arrastralo</strong> a la posicion que quieras
            <p style="color:var(--text-secondary);margin:4px 0 0;font-size:0.9rem">Puedes redimensionarlo arrastrando los bordes</p>
          </div>
        </div>
      </div>

      <div class="card" style="padding:20px;background:linear-gradient(135deg,rgba(108,99,255,0.1),rgba(74,63,207,0.05));border:1px solid rgba(108,99,255,0.3)">
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="background:var(--color-income);color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700">✓</div>
          <div>
            <strong>Listo. Usa los botones rapidos:</strong>
            <ul style="color:var(--text-secondary);margin:8px 0 0 0;padding-left:20px;font-size:0.9rem">
              <li><strong>Ingreso</strong> - abre el formulario pre-rellenado para registrar dinero entrante</li>
              <li><strong>Gasto</strong> - abre el formulario para registrar un gasto</li>
              <li><strong>Transferencia</strong> - mover dinero entre cuentas</li>
              <li><strong>Abrir</strong> - lleva al dashboard de la app</li>
            </ul>
          </div>
        </div>
      </div>
    `}
  `;

  return page;
}
