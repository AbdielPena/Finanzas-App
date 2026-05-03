// ============================================================
// Widget Deep Link Handler
// El widget Android dispara URLs tipo finanzapp://action?type=ingreso
// que abren la app principal. Aqui detectamos el deep link y
// abrimos el modal de Nueva Transaccion pre-rellenado.
// ============================================================

const DEEPLINK_SCHEME = 'finanzapp://';

function parseDeepLink(url) {
  if (!url || !url.startsWith(DEEPLINK_SCHEME)) return null;
  try {
    const u = new URL(url);
    const type = u.searchParams.get('type') || u.host;
    return { action: u.host, type };
  } catch {
    return null;
  }
}

function getInitialUrl() {
  // En Capacitor el url viene en window.location.href cuando se abre la app
  // Tambien guardamos en sessionStorage por si llega despues
  const fromSession = sessionStorage.getItem('finanzapp_pending_deeplink');
  if (fromSession) {
    sessionStorage.removeItem('finanzapp_pending_deeplink');
    return fromSession;
  }
  // Si la URL actual es un deep link
  if (typeof window !== 'undefined' && window.location.href.startsWith(DEEPLINK_SCHEME)) {
    return window.location.href;
  }
  return null;
}

/**
 * Procesa el deep link inicial al cargar la app.
 * Debe llamarse despues de que la UI principal este montada.
 */
export function handleInitialDeepLink() {
  const url = getInitialUrl();
  if (!url) return;
  const parsed = parseDeepLink(url);
  if (!parsed) return;
  routeAction(parsed);
}

/**
 * Setup listener para deep links que llegan mientras la app esta abierta.
 * Capacitor App plugin emite 'appUrlOpen'.
 */
export function setupDeepLinkListener() {
  // Capacitor 6 App plugin
  if (typeof window !== 'undefined' && window.Capacitor) {
    try {
      const App = window.Capacitor?.Plugins?.App;
      if (App && App.addListener) {
        App.addListener('appUrlOpen', (data) => {
          if (data?.url) {
            const parsed = parseDeepLink(data.url);
            if (parsed) routeAction(parsed);
          }
        });
      }
    } catch (e) {
      console.warn('[deeplink] no se pudo conectar listener Capacitor:', e.message);
    }
  }

  // Web fallback: escucha hashchange con prefijo especial
  window.addEventListener('hashchange', () => {
    if (window.location.hash.startsWith('#/widget-action/')) {
      const type = window.location.hash.split('/').pop();
      routeAction({ action: 'action', type });
      // Limpia el hash para no volver a procesar
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  });
}

function routeAction({ action, type }) {
  // Espera 500ms para que la UI principal este lista
  setTimeout(() => {
    switch (type) {
      case 'ingreso':
      case 'gasto':
      case 'transferencia':
        // Navega a la pagina de transacciones y abre modal pre-rellenado
        window.location.hash = `#/transactions?quick=${type}`;
        break;
      case 'dashboard':
      default:
        window.location.hash = '#/dashboard';
        break;
    }
  }, 500);
}

export default { handleInitialDeepLink, setupDeepLinkListener };
