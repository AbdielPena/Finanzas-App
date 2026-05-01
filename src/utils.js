// ============================================
// Utilities — ID generation, formatting, dates
// ============================================

// ---------- ID Generation ----------
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ---------- Currency Formatting ----------
const CURRENCIES = {
  DOP: { symbol: 'RD$', code: 'DOP', name: 'Peso Dominicano', locale: 'es-DO' },
  USD: { symbol: '$', code: 'USD', name: 'Dólar Estadounidense', locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro', locale: 'de-DE' },
  MXN: { symbol: 'MX$', code: 'MXN', name: 'Peso Mexicano', locale: 'es-MX' },
  COP: { symbol: 'COL$', code: 'COP', name: 'Peso Colombiano', locale: 'es-CO' },
  ARS: { symbol: 'AR$', code: 'ARS', name: 'Peso Argentino', locale: 'es-AR' },
  BRL: { symbol: 'R$', code: 'BRL', name: 'Real Brasileño', locale: 'pt-BR' },
  CLP: { symbol: 'CL$', code: 'CLP', name: 'Peso Chileno', locale: 'es-CL' },
  PEN: { symbol: 'S/', code: 'PEN', name: 'Sol Peruano', locale: 'es-PE' },
  GTQ: { symbol: 'Q', code: 'GTQ', name: 'Quetzal', locale: 'es-GT' },
};

export function getCurrencies() {
  return CURRENCIES;
}

export function getCurrencySymbol(code) {
  return CURRENCIES[code]?.symbol || '$';
}

export function formatMoney(amount, currencyCode = null) {
  const code = currencyCode || getSettings().currency || 'DOP';
  const curr = CURRENCIES[code] || CURRENCIES.DOP;
  try {
    return new Intl.NumberFormat(curr.locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${curr.symbol} ${Number(amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
  }
}

export function formatMoneyShort(amount) {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const symbol = getCurrencySymbol(getSettings().currency);
  if (abs >= 1e6) return `${sign}${symbol}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${symbol}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${symbol}${abs.toFixed(2)}`;
}

// ---------- Date Formatting ----------
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateShort(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-DO', { month: 'short', day: 'numeric' });
}

export function formatDateInput(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export function formatRelativeDate(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return formatDate(date);
}

export function getToday() {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthName(period) {
  if (!period) return '';
  const [y, m] = period.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1);
  return d.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
}

export function getDaysUntil(date) {
  if (!date) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

export function isOverdue(date) {
  return getDaysUntil(date) < 0;
}

// ---------- Number helpers ----------
export function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function percentage(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

// ---------- Settings shortcut ----------
function getSettings() {
  try {
    return JSON.parse(localStorage.getItem('finanzapp_settings') || '{}');
  } catch {
    return {};
  }
}

// ---------- Validators ----------
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isPositiveNumber(val) {
  return typeof val === 'number' && val > 0 && isFinite(val);
}

export function isNotEmpty(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

// ---------- Animation Engine ----------
export function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    
    // Ease-out cubic: rapidly shoots up and slowly lands
    const easeOutCubic = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.floor(easeOutCubic * (end - start) + start);
    
    obj.innerHTML = formatMoney(currentVal);
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerHTML = formatMoney(end);
    }
  }; // <- CIERRE DE ARROW FUNCTION
  window.requestAnimationFrame(step);
}

// ---------- Live Theming Engine ----------
// Las paletas controlan el color de acento primario. Cada una incluye:
//  · primary   → valor principal (solid)
//  · hover     → para estados hover y variaciones claras
//  · soft      → fondo suave para badges/iconos
//  · glow      → halo para sombras y efectos
//  · gradient  → gradiente oficial del acento (usado en buttons primary, KPIs hero)
//  · name      → label visible en el picker
export const THEME_PALETTES = {
  'violeta': {
    primary: '#8B5CF6',
    hover:   '#A78BFA',
    soft:    'rgba(139, 92, 246, 0.14)',
    glow:    'rgba(139, 92, 246, 0.28)',
    gradient:'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    name:    'Violeta cinemático'
  },
  'coral': {
    primary: '#FD7E14',
    hover:   '#FF8C2B',
    soft:    'rgba(253, 126, 20, 0.14)',
    glow:    'rgba(253, 126, 20, 0.25)',
    gradient:'linear-gradient(135deg, #FD7E14 0%, #FF6B00 100%)',
    name:    'Coral cálido'
  },
  'rosa': {
    primary: '#EC4899',
    hover:   '#F472B6',
    soft:    'rgba(236, 72, 153, 0.14)',
    glow:    'rgba(236, 72, 153, 0.25)',
    gradient:'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
    name:    'Rosa neón'
  },
  'azul-fintech': {
    primary: '#4F46E5',
    hover:   '#6366F1',
    soft:    'rgba(79, 70, 229, 0.14)',
    glow:    'rgba(79, 70, 229, 0.25)',
    gradient:'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
    name:    'Azul fintech'
  },
  'verde-inversion': {
    primary: '#10B981',
    hover:   '#34D399',
    soft:    'rgba(16, 185, 129, 0.14)',
    glow:    'rgba(16, 185, 129, 0.25)',
    gradient:'linear-gradient(135deg, #10B981 0%, #2DD4BF 100%)',
    name:    'Verde inversión'
  },
  'oscuro-minimalista': {
    primary: '#A1A1AA',
    hover:   '#D4D4D8',
    soft:    'rgba(161, 161, 170, 0.14)',
    glow:    'rgba(161, 161, 170, 0.18)',
    gradient:'linear-gradient(135deg, #52525B 0%, #A1A1AA 100%)',
    name:    'Minimalista'
  },
  // Legacy alias por compatibilidad con data guardada
  'morado-premium': {
    primary: '#8B5CF6',
    hover:   '#A78BFA',
    soft:    'rgba(139, 92, 246, 0.14)',
    glow:    'rgba(139, 92, 246, 0.28)',
    gradient:'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    name:    'Violeta cinemático'
  }
};

export function applyUserPalette(themeKey) {
  const root = document.documentElement;
  
  // Si nos pasan un objeto de configuración completa (Tema Creado por Usuario)
  if (typeof themeKey === 'object' && themeKey !== null && themeKey.isCustom) {
    if(themeKey.bgPrimary) root.style.setProperty('--bg-primary', themeKey.bgPrimary);
    if(themeKey.bgCard) root.style.setProperty('--bg-card', themeKey.bgCard);
    if(themeKey.textPrimary) root.style.setProperty('--text-primary', themeKey.textPrimary);
    if(themeKey.colorIncome) root.style.setProperty('--color-income', themeKey.colorIncome);
    if(themeKey.colorExpense) root.style.setProperty('--color-expense', themeKey.colorExpense);
    
    if(themeKey.accentPrimary) {
      root.style.setProperty('--accent-primary', themeKey.accentPrimary);
      root.style.setProperty('--accent-primary-hover', `color-mix(in srgb, ${themeKey.accentPrimary} 85%, white)`);
      root.style.setProperty('--accent-primary-glow', `color-mix(in srgb, ${themeKey.accentPrimary} 25%, transparent)`);
    }
    return;
  }

  // Fallback de limpieza si venimos del modo personalizado a un predeterminado
  root.style.removeProperty('--bg-primary');
  root.style.removeProperty('--bg-card');
  root.style.removeProperty('--text-primary');
  root.style.removeProperty('--color-income');
  root.style.removeProperty('--color-expense');

  // Si nos pasan un código de color Hex personalizado simplificado
  if (typeof themeKey === 'string' && themeKey.startsWith('#')) {
    root.style.setProperty('--accent-primary', themeKey);
    root.style.setProperty('--accent-primary-hover', `color-mix(in srgb, ${themeKey} 85%, white)`);
    root.style.setProperty('--accent-primary-glow', `color-mix(in srgb, ${themeKey} 25%, transparent)`);
    return;
  }

  const palette = THEME_PALETTES[themeKey] || THEME_PALETTES['violeta'];
  // Legacy
  root.style.setProperty('--accent-primary', palette.primary);
  root.style.setProperty('--accent-primary-hover', palette.hover);
  root.style.setProperty('--accent-primary-glow', palette.glow);
  // Nuevo design system
  root.style.setProperty('--accent', palette.primary);
  root.style.setProperty('--accent-hover', palette.hover);
  root.style.setProperty('--accent-soft', palette.soft);
  root.style.setProperty('--accent-glow', palette.glow);
  if (palette.gradient) root.style.setProperty('--accent-gradient', palette.gradient);
}

// ---------- AI Tools ----------
export function aiBadge(item) {
  return item?._aiModified ? '<span class="ai-badge" title="Operación ejecutada por IA" style="font-size:0.85em; margin-left:4px">🤖</span>' : '';
}
