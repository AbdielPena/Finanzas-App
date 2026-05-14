// ============================================================
// studio-app-switcher.js — versión vanilla, sin frameworks.
//
// Componente cross-system del Studio Suite. Mismo look que la versión
// React (studio-hub/src/components/layout/app-switcher.tsx) pero
// embebible en SPAs vanilla (finanzapp, inventario).
//
// Uso:
//   import { mountAppSwitcher } from './studio-app-switcher.js';
//   mountAppSwitcher({ container: document.getElementById('switcher'),
//                      currentSystem: 'finance' });  // 'hub'|'crm'|'billing'|'finance'|'inventory'
//
// Requiere que tokens-shared.css esté cargado (provee --studio-* vars).
// ============================================================

const HUB_URL = 'https://hub.abbypixel.com';

const SYSTEMS = [
  {
    id: 'hub',
    name: 'Studio · Hub',
    description: 'Dashboard central, métricas, actividad',
    href: `${HUB_URL}/`,
    icon: '⊞',
    accent: 'var(--studio-hub)',
  },
  {
    id: 'crm',
    name: 'Studio · CRM',
    description: 'Clientes, bookings, galerías',
    href: `${HUB_URL}/launch/studioflow`,
    icon: '📷',
    accent: 'var(--studio-crm)',
  },
  {
    id: 'billing',
    name: 'Studio · Facturación',
    description: 'Facturas, NCF, ITBIS',
    href: `${HUB_URL}/launch/studioflow_platform`,
    icon: '🧾',
    accent: 'var(--studio-billing)',
  },
  {
    id: 'finance',
    name: 'Studio · Finanzas',
    description: 'CxC, CxP, deudas, metas',
    href: `${HUB_URL}/launch/finanzapp`,
    icon: '💰',
    accent: 'var(--studio-finance)',
  },
  {
    id: 'inventory',
    name: 'Studio · Inventario',
    description: 'Equipos, préstamos, rentas',
    href: `${HUB_URL}/launch/inventario`,
    icon: '📦',
    accent: 'var(--studio-inventory)',
  },
];

// Una sola inyección de styles en el head (idempotente)
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.setAttribute('data-studio-app-switcher', 'true');
  style.textContent = `
    .studio-switcher { position: relative; display: block; }
    .studio-switcher__btn {
      display: flex; align-items: center; gap: 12px; width: 100%;
      padding: 8px 12px; border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.08);
      background: rgba(255,255,255,0.5);
      cursor: pointer; text-align: left;
      transition: background 200ms var(--studio-ease-out, ease);
      color: inherit;
      font-family: var(--studio-font-sans, 'Inter', system-ui, sans-serif);
      font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
    }
    [data-theme='dark'] .studio-switcher__btn { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
    .studio-switcher__btn:hover { background: rgba(0,0,0,0.05); }
    [data-theme='dark'] .studio-switcher__btn:hover { background: rgba(255,255,255,0.06); }
    .studio-switcher__icon {
      width: 36px; height: 36px; flex-shrink: 0;
      border-radius: 10px; font-size: 18px;
      display: inline-flex; align-items: center; justify-content: center;
      color: white; box-shadow: var(--studio-shadow-sm);
    }
    .studio-switcher__text { min-width: 0; flex: 1; }
    .studio-switcher__title { display: block; font-weight: 600; font-size: 13px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .studio-switcher__subtitle { display: block; font-size: 11px; opacity: 0.6; line-height: 1.3; margin-top: 2px; }
    .studio-switcher__chevron { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.5; transition: transform 200ms var(--studio-ease-out, ease); }
    .studio-switcher.is-open .studio-switcher__chevron { transform: rotate(180deg); }
    .studio-switcher__menu {
      position: absolute; left: 0; right: 0; top: calc(100% + 8px);
      min-width: 280px; padding: 8px;
      background: white; border: 1px solid rgba(0,0,0,0.08);
      border-radius: 20px; box-shadow: var(--studio-shadow-xl);
      opacity: 0; transform: translateY(-6px) scale(0.98);
      transition: opacity 180ms var(--studio-ease-out, ease), transform 180ms var(--studio-ease-out, ease);
      pointer-events: none; z-index: 100;
      max-height: 75vh; overflow-y: auto;
      font-family: var(--studio-font-sans, 'Inter', system-ui, sans-serif);
    }
    [data-theme='dark'] .studio-switcher__menu { background: hsl(240 8% 7%); border-color: rgba(255,255,255,0.1); }
    .studio-switcher.is-open .studio-switcher__menu { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .studio-switcher__label {
      padding: 8px 12px; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.55;
    }
    .studio-switcher__item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 8px 10px; border-radius: 12px;
      text-decoration: none; color: inherit;
      transition: background 150ms var(--studio-ease-out, ease);
    }
    .studio-switcher__item:hover { background: rgba(0,0,0,0.05); }
    [data-theme='dark'] .studio-switcher__item:hover { background: rgba(255,255,255,0.06); }
    .studio-switcher__item--current { background: rgba(0,0,0,0.04); }
    [data-theme='dark'] .studio-switcher__item--current { background: rgba(255,255,255,0.05); }
    .studio-switcher__item-name { font-size: 13px; font-weight: 600; line-height: 1.2; display: flex; align-items: center; gap: 6px; }
    .studio-switcher__item-desc { font-size: 11px; opacity: 0.6; margin-top: 2px; }
    .studio-switcher__badge {
      padding: 2px 6px;
      background: rgba(16,185,129,0.15); color: rgb(4,120,87);
      font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      border-radius: 9999px;
    }
    [data-theme='dark'] .studio-switcher__badge { color: rgb(110, 231, 183); }
  `;
  document.head.appendChild(style);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function mountAppSwitcher({ container, currentSystem = 'hub', collapsed = false }) {
  if (!container) {
    console.warn('[studio-app-switcher] container required');
    return;
  }
  injectStyles();

  const current = SYSTEMS.find((s) => s.id === currentSystem) || SYSTEMS[0];

  const itemsHtml = SYSTEMS.map((sys) => {
    const isCurrent = sys.id === currentSystem;
    return `
      <a class="studio-switcher__item ${isCurrent ? 'studio-switcher__item--current' : ''}"
         href="${sys.href}"
         ${sys.id === 'hub' ? '' : 'target="_blank" rel="noopener noreferrer"'}
         role="menuitem">
        <span class="studio-switcher__icon" style="background: hsl(${sys.accent} / 0.12); color: hsl(${sys.accent});">${sys.icon}</span>
        <span class="studio-switcher__text">
          <span class="studio-switcher__item-name">
            ${escapeHtml(sys.name)}
            ${isCurrent ? '<span class="studio-switcher__badge">actual</span>' : ''}
          </span>
          <span class="studio-switcher__item-desc">${escapeHtml(sys.description)}</span>
        </span>
      </a>
    `;
  }).join('');

  container.innerHTML = `
    <div class="studio-switcher" data-current="${currentSystem}">
      <button type="button" class="studio-switcher__btn" aria-expanded="false" aria-haspopup="menu">
        <span class="studio-switcher__icon" style="background: hsl(${current.accent});">${current.icon}</span>
        ${collapsed ? '' : `
          <span class="studio-switcher__text">
            <span class="studio-switcher__title">${escapeHtml(current.name)}</span>
            <span class="studio-switcher__subtitle">Studio Suite</span>
          </span>
          <svg class="studio-switcher__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        `}
      </button>
      <div class="studio-switcher__menu" role="menu">
        <div class="studio-switcher__label">Studio Suite</div>
        ${itemsHtml}
      </div>
    </div>
  `;

  const root = container.querySelector('.studio-switcher');
  const btn = container.querySelector('.studio-switcher__btn');

  const close = () => {
    root.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  };
  const toggle = (e) => {
    e.stopPropagation();
    const open = root.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  };

  btn.addEventListener('click', toggle);
  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}
