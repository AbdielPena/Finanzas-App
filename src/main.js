// ============================================
// Main — Application entry point
// ============================================
import store, { setActiveWorkspace } from './store.js';
import { router } from './router.js';
import { icon } from './icons.js';
import { initCategories } from './categories.js';
import { generateAlerts, getUnreadCount } from './notifications.js';
import { renderLogin } from './pages/login.js';
import renderDashboard from './pages/dashboard.js';
import renderAccounts from './pages/accounts.js';
import renderCards from './pages/cards.js';
import renderTransactions from './pages/transactions.js';
import renderSubscriptions from './pages/subscriptions.js';
import renderDebts from './pages/debts.js';
import renderReceivables from './pages/receivables.js';
import renderPayables from './pages/payables.js';
import renderGoals from './pages/goals.js';
import renderTithe from './pages/tithe.js';
import renderNotifications, { updateNotifBadge } from './pages/notifications.page.js';
import renderNotificationPreferences from './pages/notification_preferences.js';
import renderWidgetInstall from './pages/widget_install.js';
import renderSecurity from './pages/security.js';
import renderCategories from './pages/categories.js';
import renderSettings from './pages/settings.js';
import renderNotes from './pages/notes.js';
import renderExternalCards from './pages/external_cards.js';
import renderUsers from './pages/users.js';
import renderSuperAdmin from './pages/superadmin.js';
import renderProfile from './pages/profile.js';
import renderPendingCenter from './pages/pending_center.js';
import renderPricing from './pages/pricing.js';
import renderAdminPlans from './pages/admin_plans.js';
import { ensureSeeded as ensurePlansSeeded, getCurrentPlan } from './plans_engine.js';
import { applyUserPalette, formatMoney, THEME_PALETTES } from './utils.js';
import { calcAccountBalance } from './balance_engine.js';
import { initAIChat } from './pages/ai-chat.js';
import {
  isLoggedIn, logout, getSession, getCurrentUser, getWorkspaceId,
  getCurrentWorkspace, can
} from './auth.js';
import { checkForUpdates } from './update-checker.js';
import { handleInitialDeepLink, setupDeepLinkListener } from './widget-deeplink.js';
import { initPushNotifications } from './push-notifications.js';
import { isBiometricEnabled, authenticateBiometric, isBiometricSupported } from './biometric.js';

// ---------- Bootstrap loading screen ----------
function showBootstrapLoader(text = 'Cargando tus datos...') {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="app-bootstrap">
      <div class="app-bootstrap-spinner"></div>
      <div class="app-bootstrap-text">${text}</div>
    </div>
  `;
}

// ---------- Initialize ----------
async function init() {
  try {
    const theme = store.getSetting('theme', 'dark');
    document.documentElement.setAttribute('data-theme', theme);

    if (!isLoggedIn()) {
      showLoginScreen();
      return;
    }

    // Si esta habilitada la biometria y estamos en app nativa, pide huella antes
    if (isBiometricEnabled() && (window.Capacitor || window.__TAURI__)) {
      showBootstrapLoader('Autenticate con tu huella...');
      const ok = await authenticateBiometric('Desbloquea FinanzApp');
      if (!ok) {
        // Si fallo, manda al login
        logout();
        showLoginScreen();
        return;
      }
    }

    // Set active workspace so store uses the right prefix
    const session = getSession();
    setActiveWorkspace(session.workspaceId);
    store.invalidate();

    // Bootstrap: precargar datos del backend con loader visible
    showBootstrapLoader('Sincronizando con el servidor...');
    try {
      await store.bootstrap();
    } catch (e) {
      console.warn('[bootstrap] fallo - usando localStorage:', e.message);
    }

    initCategories();
    try { generateAlerts(); } catch (e) { console.warn('Alert generation error:', e); }

    // Procesar prestamos automaticos al iniciar
    try {
      import('./loans_engine.js').then(engine => {
        engine.processAutoPayments();
      });
    } catch (e) { console.warn('Loans engine error:', e); }

    // Verificar updates en background (solo Tauri/Capacitor)
    checkForUpdates().catch(() => {});

    // Handler de deep links del widget (abre modal pre-rellenado al tap)
    setupDeepLinkListener();

    // Push notifications (solo Android via Capacitor + FCM)
    initPushNotifications().catch(() => {});

    showApp();
    // Procesar deep link inicial despues de mostrar la UI
    setTimeout(() => handleInitialDeepLink(), 600);
  } catch (e) {
    console.error('Init error:', e);
    document.getElementById('app').innerHTML = `<div style="padding:40px;color:#ff5252;font-family:monospace"><h2>Error de Inicializacion</h2><pre>${e.message}\n${e.stack}</pre></div>`;
  }
}


// ---------- Login Screen ----------
function showLoginScreen() {
  try {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(renderLogin(async (migrated) => {
      try {
        const session = getSession();
        setActiveWorkspace(session.workspaceId);
        store.invalidate();
        // Bootstrap con loader visible
        showBootstrapLoader('Cargando tu workspace...');
        try { await store.bootstrap(); } catch (e) { console.warn('[bootstrap] fallo:', e.message); }
        initCategories();
        try { generateAlerts(); } catch (e) { console.warn('Alert generation error:', e); }
        showApp();
        // Show migration success toast after app loads
        if (migrated > 0) {
          setTimeout(() => {
            import('./components.js').then(({ showToast }) => {
              showToast('success',
                '✅ Datos migrados correctamente',
                `Tus ${migrated} colecciones de datos anteriores ya están en tu nuevo workspace.`
              );
            });
          }, 800);
        }
      } catch (e) {
        console.error('Post-login error:', e);
        document.getElementById('app').innerHTML = `<div style="padding:40px;color:#ff5252;font-family:monospace"><h2>Error Post-Login</h2><pre>${e.message}\n${e.stack}</pre></div>`;
      }
    }));
  } catch (e) {
    console.error('Login screen error:', e);
  }
}


// ---------- Main App ----------
function showApp() {
  const app = document.getElementById('app');
  const unreadCount = getUnreadCount();
  const settings = store.getSettings();
  const theme = settings.theme || 'dark';
  const palette = settings.themePalette || 'azul-fintech';
  const currentUser = getCurrentUser();
  const currentWs = getCurrentWorkspace();
  const session = getSession();

  applyUserPalette(palette);

  // Limpiar FAB anterior si existía (hot-reload)
  document.getElementById('ai-fab')?.remove();
  document.getElementById('chat-drawer')?.remove();

  app.innerHTML = `
    <div class="app-shell" id="app-shell">
      <!-- Mobile overlay -->
      <div class="mobile-overlay" id="mobile-overlay"></div>

      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">${icon('wallet', 20)}</div>
          <span class="sidebar-logo-text">FinanzApp</span>
        </div>
        <nav class="sidebar-nav">
          <div class="sidebar-section">
            <div class="sidebar-section-title">Principal</div>
            <button class="nav-item" data-route="/dashboard">
              ${icon('dashboard', 20)}
              <span class="nav-item-label">Dashboard</span>
            </button>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Finanzas</div>
            <button class="nav-item" data-route="/accounts">
              ${icon('bank', 20)}
              <span class="nav-item-label">Cuentas Bancarias</span>
            </button>
            <button class="nav-item" data-route="/cards">
              ${icon('creditCard', 20)}
              <span class="nav-item-label">Tarjetas de Crédito</span>
            </button>
            <button class="nav-item" data-route="/transactions">
              ${icon('transaction', 20)}
              <span class="nav-item-label">Transacciones</span>
            </button>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Gestión</div>
            <button class="nav-item" data-route="/subscriptions">
              ${icon('subscription', 20)}
              <span class="nav-item-label">Suscripciones</span>
            </button>
            <button class="nav-item" data-route="/debts">
              ${icon('handCoins', 20)}
              <span class="nav-item-label">Deudas</span>
            </button>
            <button class="nav-item" data-route="/receivables">
              ${icon('arrowDown', 20)}
              <span class="nav-item-label">Cuentas por Cobrar</span>
            </button>
            <button class="nav-item" data-route="/payables">
              ${icon('arrowUp', 20)}
              <span class="nav-item-label">Cuentas por Pagar</span>
            </button>
            <button class="nav-item" data-route="/pending" style="${store.filter('transactions',t=>t.estado==='hold').length > 0 ? 'color:#f59e0b' : ''}">
              ${icon('clock', 20)}
              <span class="nav-item-label">Pendientes ${store.filter('transactions',t=>t.estado==='hold').length > 0 ? `<span style="background:#f59e0b;color:#000;font-size:0.6rem;padding:1px 5px;border-radius:10px;margin-left:4px">${store.filter('transactions',t=>t.estado==='hold').length}</span>` : ''}</span>
            </button>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Terceros</div>
            <button class="nav-item" data-route="/external_cards">
              ${icon('creditCard', 20)}
              <span class="nav-item-label">Tarjetas Externas</span>
            </button>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Avanzado</div>
            <button class="nav-item" data-route="/goals">
              ${icon('goal', 20)}
              <span class="nav-item-label">Metas Financieras</span>
            </button>
            <button class="nav-item" data-route="/tithe">
              ${icon('tithe', 20)}
              <span class="nav-item-label">Cálculo del 10%</span>
            </button>
            <button class="nav-item" data-route="/notes">
              ${icon('fileText', 20)}
              <span class="nav-item-label">Notas</span>
            </button>
            ${can('manageUsers') ? `
            <button class="nav-item" data-route="/users">
              ${icon('users', 20)}
              <span class="nav-item-label">Usuarios</span>
            </button>` : ''}

            <button class="nav-item" data-route="/pricing">
              ${icon('star', 20)}
              <span class="nav-item-label">Planes</span>
            </button>
            ${can('manageUsers') ? `
            <button class="nav-item" data-route="/users">
              ${icon('users', 20)}
              <span class="nav-item-label">Usuarios</span>
            </button>` : ''}

            ${currentUser?.isSuperAdmin ? `
            <div class="sidebar-section-title" style="margin-top:10px;color:var(--color-warning)">Administración Global</div>
            <button class="nav-item" data-route="/superadmin" style="color:var(--color-warning)">
              ${icon('lock', 20)}
              <span class="nav-item-label">Super Administrador</span>
            </button>
            <button class="nav-item" data-route="/admin/planes" style="color:var(--color-warning)">
              ${icon('star', 20)}
              <span class="nav-item-label">Admin Planes</span>
            </button>` : ''}
          </div>
        </nav>
        <div class="sidebar-footer">
          <!-- User info (click → profile) -->
          <div id="sidebar-user" style="padding:10px 12px;border-top:1px solid var(--border-color);margin-bottom:4px;display:flex;align-items:center;gap:10px;cursor:pointer;border-radius:8px;transition:background 0.2s" onmouseover="this.style.background='var(--bg-input)'" onmouseout="this.style.background='transparent'">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-primary);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">
              ${currentUser?.avatar || session?.nombre?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:0.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${currentUser?.nombre || 'Usuario'}</div>
              <div style="font-size:0.7rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${currentWs?.nombre || 'Workspace'}</div>
            </div>
            <span style="font-size:0.65rem;color:var(--text-muted)">${icon('settings',12)}</span>
          </div>
          <button class="nav-item" data-route="/categories">
            ${icon('category', 20)}
            <span class="nav-item-label">Categorías</span>
          </button>
          <button class="nav-item" data-route="/settings">
            ${icon('settings', 20)}
            <span class="nav-item-label">Configuración</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="app-main">
        <header class="header">
          <div class="header-left">
            <button class="header-toggle" id="sidebar-toggle" title="Toggle sidebar">
              ${icon('panelLeft', 20)}
            </button>
            <div>
              <div class="header-title" id="header-title">Dashboard</div>
              <div class="header-subtitle" id="header-subtitle">Resumen financiero</div>
            </div>
          </div>
          <div class="header-right">
            <button class="header-action" id="theme-toggle" title="Cambiar tema">
              ${icon(theme === 'dark' ? 'sun' : 'moon', 20)}
            </button>
            <button class="header-action" data-route="/notifications" title="Notificaciones" style="position:relative">
              ${icon('notification', 20)}
              <span class="notif-badge" id="notif-badge" style="display:${unreadCount > 0 ? 'flex' : 'none'}">${unreadCount}</span>
            </button>
            <button class="header-action" id="logout-btn" title="Cerrar sesión">
              ${icon('logout', 20)}
            </button>
          </div>
        </header>
        <div id="page-content"></div>
      </main>

      <!-- Right Panel (desktop only, >1280px) -->
      <aside class="right-panel" id="right-panel">
        <div class="rp-top">
          <button class="rp-top-btn" data-route="/notifications" title="Notificaciones" style="position:relative">
            ${icon('notification', 18)}
            <span class="notif-badge" id="notif-badge-rp" style="display:${unreadCount > 0 ? 'flex' : 'none'}">${unreadCount}</span>
          </button>
          <button class="rp-top-btn" data-route="/settings" title="Configuración">${icon('settings', 18)}</button>
          <button class="rp-top-btn" data-route="/profile" title="Perfil">${icon('eye', 18)}</button>
        </div>

        <div class="rp-profile">
          <div class="rp-ring-wrap">
            <svg class="rp-ring" viewBox="0 0 120 120" width="110" height="110">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-3)" stroke-width="3"/>
              <circle id="rp-ring-fill" cx="60" cy="60" r="52" fill="none"
                stroke="url(#rpGrad)" stroke-width="3" stroke-linecap="round"
                stroke-dasharray="${(2 * Math.PI * 52).toFixed(1)}"
                stroke-dashoffset="${(2 * Math.PI * 52).toFixed(1)}"
                transform="rotate(-90 60 60)"/>
              <defs>
                <linearGradient id="rpGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="var(--accent)"/>
                  <stop offset="100%" stop-color="var(--violet)"/>
                </linearGradient>
              </defs>
            </svg>
            <div class="rp-avatar">${(currentUser?.avatar || session?.nombre?.charAt(0) || 'U').toUpperCase()}</div>
          </div>
          <div class="rp-name">${currentUser?.nombre || 'Usuario'}</div>
          <div class="rp-role">Plan Pro · ${currentWs?.nombre || 'Workspace'}</div>
        </div>

        <div class="rp-stats" id="rp-stats">
          <div class="rp-stat">
            <div class="rp-stat-val" id="rp-stat-accounts">0</div>
            <div class="rp-stat-label">Cuentas</div>
          </div>
          <div class="rp-stat">
            <div class="rp-stat-val" id="rp-stat-goals">0</div>
            <div class="rp-stat-label">Metas</div>
          </div>
          <div class="rp-stat">
            <div class="rp-stat-val" id="rp-stat-score">0</div>
            <div class="rp-stat-label">Score</div>
          </div>
        </div>

        <div class="rp-pcards">
          <button class="rp-pcard" data-route="/goals">
            <div class="rp-pcard-icon" style="background:var(--accent-soft);color:var(--accent)">${icon('goal', 16)}</div>
            <div>
              <div class="rp-pcard-title">Mis metas</div>
              <div class="rp-pcard-sub">Ver progreso</div>
            </div>
            ${icon('arrowUp', 14)}
          </button>
          <button class="rp-pcard" data-route="/tithe">
            <div class="rp-pcard-icon" style="background:var(--ok-soft);color:var(--ok)">${icon('tithe', 16)}</div>
            <div>
              <div class="rp-pcard-title">Aparta el 10%</div>
              <div class="rp-pcard-sub">Cálculo automático</div>
            </div>
            ${icon('arrowUp', 14)}
          </button>
          <button class="rp-pcard" data-route="/subscriptions">
            <div class="rp-pcard-icon" style="background:var(--pink-soft);color:var(--pink)">${icon('subscription', 16)}</div>
            <div>
              <div class="rp-pcard-title">Suscripciones</div>
              <div class="rp-pcard-sub">Gastos fijos</div>
            </div>
            ${icon('arrowUp', 14)}
          </button>
        </div>

        <div class="rp-gauge-card" id="rp-gauge-card">
          <div class="rp-gauge-head">
            <span>Ahorro anual</span>
            <span class="rp-gauge-period">2026</span>
          </div>
          <div class="rp-gauge-amount" id="rp-gauge-amount">RD$ 0</div>
          <div class="rp-gauge-target" id="rp-gauge-target">de meta</div>
          <div class="rp-gauge-bar"><div class="rp-gauge-fill" id="rp-gauge-fill" style="width:0%"></div></div>
        </div>
      </aside>

      <!-- Bottom Navigation for Mobile -->
      <nav class="bottom-nav">
        <button class="bottom-nav-item active" data-route="/dashboard">
          ${icon('dashboard', 24)}
          <span>Inicio</span>
        </button>
        <button class="bottom-nav-item" data-route="/transactions">
          ${icon('transaction', 24)}
          <span>Flujo</span>
        </button>
        <button class="bottom-nav-item" data-route="/cards">
          ${icon('creditCard', 24)}
          <span>Tarjetas</span>
        </button>
        <button class="bottom-nav-item" data-route="/debts">
          ${icon('handCoins', 24)}
          <span>Deudas</span>
        </button>
        <button class="bottom-nav-item" data-route="/settings">
          ${icon('settings', 24)}
          <span>Menú</span>
        </button>
      </nav>
    </div>

    <!-- Theme FAB + Palette Picker (fixed bottom-left on desktop, hidden on <960px) -->
    <div class="theme-fab-wrap" id="theme-fab-wrap">
      <button class="theme-fab" id="theme-fab" title="Personalizar tema">
        ${icon('settings', 18)}
      </button>
      <div class="theme-popover" id="theme-popover">
        <div class="theme-popover-section">
          <div class="theme-popover-title">Modo</div>
          <div class="theme-mode-row">
            <button class="theme-mode-btn" data-mode="light">${icon('sun', 16)}<span>Claro</span></button>
            <button class="theme-mode-btn" data-mode="dark">${icon('moon', 16)}<span>Oscuro</span></button>
          </div>
        </div>
        <div class="theme-popover-section">
          <div class="theme-popover-title">Acento</div>
          <div class="palette-dots" id="palette-dots">
            ${Object.entries(THEME_PALETTES).filter(([k]) => k !== 'morado-premium').map(([key, p]) => `
              <button class="palette-dot" data-palette="${key}" title="${p.name}"
                style="background:${p.gradient || p.primary};border-color:${p.primary}">
                <span class="palette-check">${icon('check', 12)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Setup navigation routing — incluye right panel (rp-top-btn, rp-pcard)
  document.querySelectorAll('.nav-item[data-route], .header-action[data-route], .bottom-nav-item[data-route], .rp-top-btn[data-route], .rp-pcard[data-route]').forEach(item => {
    item.addEventListener('click', () => {
      // Manage active state manually for bottom nav to feel instant
      if (item.classList.contains('bottom-nav-item')) {
        document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      }

      router.navigate(item.dataset.route);
      // Close mobile sidebar if any
      document.getElementById('sidebar')?.classList.remove('mobile-open');
      document.getElementById('mobile-overlay')?.classList.remove('show');
    });
  });

  // Sidebar toggle
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    const shell = document.getElementById('app-shell');
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
      document.getElementById('mobile-overlay').classList.toggle('show');
    } else {
      shell.classList.toggle('sidebar-collapsed');
      store.setSetting('sidebarCollapsed', shell.classList.contains('sidebar-collapsed'));
    }
  });

  // Mobile overlay click
  document.getElementById('mobile-overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('mobile-overlay').classList.remove('show');
  });

  // Restore sidebar state
  if (store.getSetting('sidebarCollapsed')) {
    document.getElementById('app-shell')?.classList.add('sidebar-collapsed');
  }

  // Theme toggle (header)
  const applyTheme = (mode) => {
    document.documentElement.setAttribute('data-theme', mode);
    store.setSetting('theme', mode);
    const tt = document.getElementById('theme-toggle');
    if (tt) tt.innerHTML = icon(mode === 'dark' ? 'sun' : 'moon', 20);
    // Sincronizar botones del popover
    document.querySelectorAll('.theme-mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
  };
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  // Theme FAB + Popover
  const fab = document.getElementById('theme-fab');
  const popover = document.getElementById('theme-popover');
  fab?.addEventListener('click', (e) => {
    e.stopPropagation();
    popover.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && e.target !== fab && !fab?.contains(e.target)) {
      popover.classList.remove('open');
    }
  });
  // Sincronizar estado inicial de modo
  applyTheme(theme);

  // Palette switcher en vivo
  const applyPalette = (key) => {
    applyUserPalette(key);
    store.setSetting('themePalette', key);
    document.querySelectorAll('.palette-dot').forEach(d => {
      d.classList.toggle('active', d.dataset.palette === key);
    });
  };
  document.querySelectorAll('.theme-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.mode));
  });
  document.querySelectorAll('.palette-dot').forEach(dot => {
    dot.addEventListener('click', () => applyPalette(dot.dataset.palette));
  });
  // Estado inicial del picker
  document.querySelector(`.palette-dot[data-palette="${palette}"]`)?.classList.add('active');

  // ============================
  // Right panel — data dinámica
  // ============================
  try {
    const accounts = store.getAll('accounts').filter(a => a.activa !== false);
    const goals = store.getAll('goals') || [];
    const transactions = store.getAll('transactions') || [];

    const totalBalance = accounts.reduce((s, a) => s + calcAccountBalance(a.id), 0);
    const goalsCount = goals.length;
    const accountsCount = accounts.length;

    // Score simple: basado en tasa de ahorro del último mes
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const mtxs = transactions.filter(t => t.fecha && t.fecha.startsWith(ym));
    const mIn = mtxs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + (parseFloat(t.monto) || 0), 0);
    const mOut = mtxs.filter(t => t.tipo === 'gasto').reduce((s, t) => s + (parseFloat(t.monto) || 0), 0);
    const tasa = mIn > 0 ? Math.max(0, (mIn - mOut) / mIn) : 0;
    const score = Math.round(Math.min(100, tasa * 100));

    const statA = document.getElementById('rp-stat-accounts');
    const statG = document.getElementById('rp-stat-goals');
    const statS = document.getElementById('rp-stat-score');
    if (statA) statA.textContent = accountsCount;
    if (statG) statG.textContent = goalsCount;
    if (statS) statS.textContent = score;

    // Ahorro anual: meta por defecto 180K si no hay configurada
    const yearGoal = parseFloat(store.getSetting('annualSavingGoal', 180000)) || 180000;
    const yearTxs = transactions.filter(t => t.fecha && t.fecha.startsWith(String(now.getFullYear())));
    const ingresosAnio = yearTxs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + (parseFloat(t.monto) || 0), 0);
    const gastosAnio = yearTxs.filter(t => t.tipo === 'gasto').reduce((s, t) => s + (parseFloat(t.monto) || 0), 0);
    const saved = Math.max(0, ingresosAnio - gastosAnio);
    const pctYear = Math.min(100, (saved / yearGoal) * 100);

    const gaugeAmount = document.getElementById('rp-gauge-amount');
    const gaugeTarget = document.getElementById('rp-gauge-target');
    const gaugeFill = document.getElementById('rp-gauge-fill');
    if (gaugeAmount) gaugeAmount.textContent = formatMoney(saved);
    if (gaugeTarget) gaugeTarget.textContent = `de ${formatMoney(yearGoal)}`;
    if (gaugeFill) {
      requestAnimationFrame(() => {
        gaugeFill.style.transition = 'width 1200ms cubic-bezier(0.22, 1, 0.36, 1)';
        gaugeFill.style.width = `${pctYear}%`;
      });
    }

    // Ring fill del profile (usa score)
    const ring = document.getElementById('rp-ring-fill');
    if (ring) {
      const circ = 2 * Math.PI * 52;
      requestAnimationFrame(() => {
        ring.style.transition = 'stroke-dashoffset 1400ms cubic-bezier(0.22, 1, 0.36, 1)';
        ring.style.strokeDashoffset = String(circ * (1 - (score / 100)));
      });
    }
  } catch (err) { console.warn('Right panel data error:', err); }

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
    location.reload();
  });

  // Register routes
  router.register('/dashboard', renderDashboard);
  router.register('/accounts', renderAccounts);
  router.register('/cards', renderCards);
  router.register('/transactions', renderTransactions);
  router.register('/subscriptions', renderSubscriptions);
  router.register('/debts', renderDebts);
  router.register('/receivables', renderReceivables);
  router.register('/payables', renderPayables);
  router.register('/goals', renderGoals);
  router.register('/tithe', renderTithe);
  router.register('/notifications', renderNotifications);
  router.register('/notification-preferences', renderNotificationPreferences);
  router.register('/widget', renderWidgetInstall);
  router.register('/security', renderSecurity);
  router.register('/categories', renderCategories);
  router.register('/settings', can('viewSettings') ? renderSettings : () => { const d = document.createElement('div'); d.className='page-content'; d.innerHTML='<div class="empty-state card"><h3>Acceso restringido</h3><p>No tienes permisos para ver la configuración.</p></div>'; return d; });
  router.register('/notes', renderNotes);
  router.register('/external_cards', renderExternalCards);
  router.register('/users', can('manageUsers') ? renderUsers : () => { const d = document.createElement('div'); d.className='page-content'; d.innerHTML='<div class="empty-state card"><h3>Acceso restringido</h3><p>Solo el administrador puede gestionar usuarios.</p></div>'; return d; });
  router.register('/superadmin', currentUser?.isSuperAdmin ? renderSuperAdmin : () => { const d = document.createElement('div'); d.className='page-content'; d.innerHTML='<div class="empty-state card"><h3>Acceso denegado</h3><p>Requiere privilegios de Super Administrador.</p></div>'; return d; });
  router.register('/profile', renderProfile);
  router.register('/pending', renderPendingCenter);
  router.register('/pricing', renderPricing);
  router.register('/admin/planes', currentUser?.isSuperAdmin ? renderAdminPlans : () => { const d = document.createElement('div'); d.className='page-content'; d.innerHTML='<div class="empty-state card"><h3>Acceso denegado</h3><p>Solo el SuperAdministrador puede gestionar planes.</p></div>'; return d; });

  // Seed default plan catalog on first run (idempotent, no data loss)
  try { ensurePlansSeeded(); } catch (e) { console.warn('plans seed warn:', e); }

  // Sidebar user avatar → profile
  document.getElementById('sidebar-user')?.addEventListener('click', () => {
    router.navigate('/profile');
  });

  // Auth guard
  router.beforeEach = (path) => {
    if (!isLoggedIn()) { showLoginScreen(); return false; }
    return true;
  };

  // Init router
  router.init('page-content');

  // Init AI Chat (FAB + Drawer)
  initAIChat();

  // Update notification badge periodically
  setInterval(() => {
    updateNotifBadge();
  }, 60000);
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
// Auto-deploy test - Sun May  3 12:14:02     2026
// trigger


