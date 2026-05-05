// ============================================
// Router — Simple SPA hash-based router
// ============================================

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.beforeEach = null;
    this._container = null;
  }

  init(containerId) {
    this._container = document.getElementById(containerId);
    window.addEventListener('hashchange', () => this._resolve());
    // Initial route
    if (!window.location.hash) {
      window.location.hash = '#/dashboard';
    } else {
      this._resolve();
    }
  }

  register(path, handler) {
    this.routes[path] = handler;
    return this;
  }

  navigate(path) {
    window.location.hash = `#${path}`;
  }

  _resolve() {
    const hash = window.location.hash.slice(1) || '/dashboard';
    const path = hash.split('?')[0];
    
    // Auth guard
    if (this.beforeEach) {
      const allowed = this.beforeEach(path);
      if (!allowed) return;
    }

    const handler = this.routes[path];
    if (handler && this._container) {
      this.currentRoute = path;
      // Update sidebar and bottom nav active state
      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.route === path);
      });
      document.querySelectorAll('.bottom-nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.route === path);
      });
      // Update header title
      this._updateHeader(path);

      // Render Skeleton Loader to give premium feel
      this._container.innerHTML = `
        <div style="padding:20px; animation: fadeIn 0.15s ease;">
          <div style="display:flex; justify-content:space-between; margin-bottom: 24px">
            <div style="width:300px">
              <div class="skeleton skeleton-text" style="height:28px; width:60%; margin-bottom:12px"></div>
              <div class="skeleton skeleton-text" style="height:14px; width:40%"></div>
            </div>
            <div class="skeleton skeleton-button"></div>
          </div>
          <div class="grid grid-3" style="margin-bottom: 24px">
            <div class="skeleton" style="height:110px"></div>
            <div class="skeleton" style="height:110px"></div>
            <div class="skeleton" style="height:110px"></div>
          </div>
          <div class="skeleton" style="height:300px; border-radius:var(--radius-xl)"></div>
        </div>
      `;

      // Mount actual view after micro-delay
      setTimeout(() => {
        const update = () => {
          this._container.innerHTML = '';
          const content = handler();
          if (typeof content === 'string') {
            this._container.innerHTML = content;
          } else if (content instanceof HTMLElement) {
            this._container.appendChild(content);
          }
          this._container.scrollTop = 0;
          window.scrollTo(0, 0);
        };
        // Usa View Transitions API si esta disponible (Chrome/Edge); fallback transparente
        if (document.startViewTransition) {
          document.startViewTransition(update);
        } else {
          update();
        }
      }, 150);
    } else if (this._container) {
      this._container.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
          <h3>Página no encontrada</h3>
          <p>La ruta "${path}" no existe.</p>
          <button class="btn btn-primary" onclick="location.hash='#/dashboard'">Ir al Dashboard</button>
        </div>
      `;
    }
  }

  _updateHeader(path) {
    const titles = {
      '/dashboard': ['Dashboard', 'Resumen financiero general'],
      '/accounts': ['Cuentas Bancarias', 'Gestiona tus bancos y cuentas'],
      '/cards': ['Tarjetas de Crédito', 'Control de tus tarjetas'],
      '/transactions': ['Transacciones', 'Registro de ingresos y gastos'],
      '/subscriptions': ['Suscripciones', 'Servicios y pagos recurrentes'],
      '/debts': ['Deudas', 'Préstamos y obligaciones'],
      '/receivables': ['Cuentas por Cobrar', 'Dinero que te deben'],
      '/payables': ['Cuentas por Pagar', 'Pagos pendientes'],
      '/external_cards': ['Tarjetas Terceros', 'Tarjetas externas que gestionas'],
      '/goals': ['Metas Financieras', 'Objetivos de ahorro'],
      '/tithe': ['Cálculo de ingresos por porcentaje', 'Configura tu porcentaje de ahorro/diezmo'],
      '/notifications': ['Notificaciones', 'Centro de alertas'],
      '/categories': ['Categorías', 'Categorías personalizadas'],
      '/settings': ['Configuración', 'Preferencias de la aplicación'],
    };
    const [title, subtitle] = titles[path] || ['FinanzApp', ''];
    const titleEl = document.getElementById('header-title');
    const subtitleEl = document.getElementById('header-subtitle');
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;
  }
}

export const router = new Router();
export default router;
