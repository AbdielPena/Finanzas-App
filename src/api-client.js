// ============================================================
// API Client — wrapper centralizado de fetch
// Reemplaza progresivamente las llamadas a store.js (localStorage)
// ============================================================

// La URL base se inyecta en build-time por Vite via `define` en vite.config.js.
// Se declara la global con un fallback para que ESLint/runtime no se queje en dev.
/* global __API_BASE__ */
const API_BASE = (typeof __API_BASE__ !== 'undefined')
  ? __API_BASE__
  : 'http://localhost:4000/api/v1';

// ---------- Token storage ----------
const ACCESS_KEY  = 'finanzapp_access_token';
const REFRESH_KEY = 'finanzapp_refresh_token';
const WS_KEY      = 'finanzapp_active_ws';

// Mirror al storage nativo de Android (SharedPreferences) para que el Widget
// pueda leer el JWT y workspace_id desde codigo Java.
async function mirrorToNative(key, value) {
  try {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.Preferences) {
      if (value === null || value === undefined) {
        await window.Capacitor.Plugins.Preferences.remove({ key });
      } else {
        await window.Capacitor.Plugins.Preferences.set({ key, value });
      }
    }
  } catch { /* silent */ }
}

export const tokens = {
  getAccess()  { return localStorage.getItem(ACCESS_KEY); },
  getRefresh() { return localStorage.getItem(REFRESH_KEY); },
  set(access, refresh) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    mirrorToNative('jwt_access', access);
    if (refresh) mirrorToNative('jwt_refresh', refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    mirrorToNative('jwt_access', null);
    mirrorToNative('jwt_refresh', null);
  },
};

export const workspace = {
  getId() { return localStorage.getItem(WS_KEY); },
  set(id)  { localStorage.setItem(WS_KEY, id); mirrorToNative('workspace_id', id); },
  clear()  { localStorage.removeItem(WS_KEY); mirrorToNative('workspace_id', null); },
};

// ---------- Field name transformation: snake_case <-> camelCase ----------
// Backend usa snake_case (banco_id), frontend usa camelCase (bancoId)
function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function camelToSnake(s) {
  return s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}
function deepCamelize(obj) {
  if (Array.isArray(obj)) return obj.map(deepCamelize);
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[snakeToCamel(k)] = deepCamelize(v);
    }
    return out;
  }
  return obj;
}
function deepSnakeize(obj) {
  if (Array.isArray(obj)) return obj.map(deepSnakeize);
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const snakeKey = camelToSnake(k);
      let value = deepSnakeize(v);
      // Postgres UUID columns NO aceptan "" como valor — solo UUID o NULL.
      // Cualquier *_id que llegue como string vacío lo convertimos a null
      // para evitar el error 22P02 que silenciosamente rompía los INSERT.
      if (value === '' && /(^|_)id$/i.test(snakeKey)) {
        value = null;
      }
      out[snakeKey] = value;
    }
    return out;
  }
  return obj;
}

// ---------- Refresh queue (evita multiples refrescos en paralelo) ----------
let refreshing = null;

async function tryRefresh() {
  if (refreshing) return refreshing;
  const refreshToken = tokens.getRefresh();
  if (!refreshToken) throw new ApiError(401, 'no_refresh_token');

  refreshing = (async () => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      tokens.clear();
      throw new ApiError(res.status, 'refresh_failed');
    }
    const data = await res.json();
    tokens.set(data.accessToken, data.refreshToken);
    return data.accessToken;
  })();

  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}

// ---------- Core request ----------
export class ApiError extends Error {
  constructor(status, code, details) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(method, path, opts = {}) {
  const { body, query, retry = true, skipAuth = false } = opts;
  let url = `${API_BASE}${path}`;
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (!skipAuth) {
    const token = tokens.getAccess();
    if (token) headers.Authorization = `Bearer ${token}`;
    const wsId = workspace.getId();
    if (wsId) headers['X-Workspace-Id'] = wsId;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(deepSnakeize(body)) : undefined,
  });

  // Token expirado, intenta refresh y reintenta una vez
  if (res.status === 401 && retry && !skipAuth && tokens.getRefresh()) {
    try {
      await tryRefresh();
      return request(method, path, { body, query, retry: false, skipAuth });
    } catch {
      throw new ApiError(401, 'unauthorized');
    }
  }

  let data;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    throw new ApiError(res.status, data?.error || 'request_failed', data?.details);
  }
  // Transform snake_case responses to camelCase
  return deepCamelize(data);
}

// ---------- Auth ----------
export const auth = {
  async register(data) {
    const r = await request('POST', '/auth/register', { body: data, skipAuth: true });
    tokens.set(r.accessToken, r.refreshToken);
    if (r.workspace) workspace.set(r.workspace.id);
    return r;
  },
  async login(email, password) {
    const r = await request('POST', '/auth/login', { body: { email, password }, skipAuth: true });
    tokens.set(r.accessToken, r.refreshToken);
    if (r.workspace) workspace.set(r.workspace.id);
    return r;
  },
  async logout() {
    try {
      await request('POST', '/auth/logout', { body: { refreshToken: tokens.getRefresh() } });
    } finally {
      tokens.clear();
      workspace.clear();
    }
  },
  me() { return request('GET', '/auth/me'); },
  forgotPassword(email) {
    return request('POST', '/auth/forgot-password', { body: { email }, skipAuth: true });
  },
  resetPassword(token, password) {
    return request('POST', '/auth/reset-password', { body: { token, password }, skipAuth: true });
  },
  verifyEmail(token) {
    return request('POST', '/auth/verify-email', { body: { token }, skipAuth: true });
  },
};

// ---------- Workspaces ----------
export const workspaces = {
  list()             { return request('GET', '/workspaces'); },
  create(nombre)     { return request('POST', '/workspaces', { body: { nombre } }); },
  update(id, nombre) { return request('PATCH', `/workspaces/${id}`, { body: { nombre } }); },
  members(id)        { return request('GET', `/workspaces/${id}/members`); },
  getSettings(id)    { return request('GET', `/workspaces/${id}/settings`); },
  saveSettings(id, data) { return request('PUT', `/workspaces/${id}/settings`, { body: data }); },
};

// ---------- Resource factory ----------
// Algunas tablas (debts, debt_templates) tienen un esquema mas estrecho
// que lo que la app necesita. Usamos columnas JSONB como "bolsa" para
// los campos extra y aplicamos un mapeo automatico in/out aqui para que
// el resto del codigo trabaje con la forma extendida.
function resource(path, opts = {}) {
  const { transformIn, transformOut } = opts;
  const tIn = (data) => {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(tIn);
    return transformIn ? transformIn(data) : data;
  };
  const tOut = (data) => {
    if (!data) return data;
    return transformOut ? transformOut(data) : data;
  };
  const wrap = (p) => p.then(r => {
    if (r?.data) {
      r.data = tIn(r.data);
    }
    return r;
  });
  return {
    list(query)         { return wrap(request('GET', `/${path}`, { query })); },
    get(id)             { return wrap(request('GET', `/${path}/${id}`)); },
    create(data)        { return wrap(request('POST', `/${path}`, { body: tOut(data) })); },
    update(id, data)    { return wrap(request('PATCH', `/${path}/${id}`, { body: tOut(data) })); },
    remove(id)          { return request('DELETE', `/${path}/${id}`); },
  };
}

// ---------- Transformers para tablas con esquema "bolsa" ----------
// debts: el backend solo guarda acreedor / monto_original / saldo_pendiente /
// fecha_proximo_pago / etc. + metadata JSONB. La app usa descripcion,
// montoTotal, fechaVencimiento, cuentaId, tarjetaId, etc. Empacamos los
// extras en metadata al escribir y los desempacamos al leer.
const DEBT_NATIVE = new Set([
  'id', 'workspaceId', 'acreedor', 'montoOriginal', 'saldoPendiente',
  'cuotasTotal', 'cuotasPagadas', 'montoCuota', 'tasaInteres',
  'fechaInicio', 'fechaProximoPago', 'estado', 'metadata',
  'createdAt', 'updatedAt',
]);

function debtTransformOut(d) {
  if (!d) return d;
  const out = {};
  const meta = { ...(d.metadata || {}) };
  for (const [k, v] of Object.entries(d)) {
    if (DEBT_NATIVE.has(k)) {
      out[k] = v;
    } else {
      meta[k] = v;
    }
  }
  // Aliases comunes -> nombre canonico
  if (out.montoOriginal == null && d.montoTotal != null) out.montoOriginal = d.montoTotal;
  if (out.fechaProximoPago == null && d.fechaVencimiento != null) out.fechaProximoPago = d.fechaVencimiento;
  if (out.saldoPendiente == null && d.saldoPendiente != null) out.saldoPendiente = d.saldoPendiente;
  out.metadata = meta;
  return out;
}

function debtTransformIn(d) {
  if (!d) return d;
  const meta = d.metadata || {};
  // Re-exponer metadata como propiedades de primer nivel para que las
  // 30+ referencias del display sigan funcionando (debt.descripcion,
  // debt.montoTotal, debt.fechaVencimiento, etc.)
  return {
    ...meta,
    ...d,
    montoTotal: d.montoTotal ?? d.montoOriginal ?? meta.montoTotal,
    fechaVencimiento: d.fechaVencimiento ?? meta.fechaVencimiento ?? d.fechaProximoPago,
    descripcion: d.descripcion ?? meta.descripcion ?? d.acreedor,
    notas: d.notas ?? meta.notas,
    cuentaId: d.cuentaId ?? meta.cuentaId,
    tarjetaId: d.tarjetaId ?? meta.tarjetaId,
    montoPagado: d.montoPagado ?? meta.montoPagado ?? 0,
    templateId: d.templateId ?? meta.templateId,
  };
}

// debt_templates: backend guarda nombre + configuracion JSONB. La app usa
// nombre, acreedor, monto, cantidadVeces, frecuencia, etc.
function tplTransformOut(d) {
  if (!d) return d;
  const { id, nombre, configuracion, ...rest } = d;
  return {
    id, nombre,
    configuracion: { ...(configuracion || {}), ...rest },
  };
}
function tplTransformIn(d) {
  if (!d) return d;
  const cfg = d.configuracion || {};
  return { ...cfg, ...d };
}

// ---------- Entidades de negocio ----------
export const banks            = resource('banks');
export const accounts         = resource('accounts');
export const cards            = resource('cards');
export const externalCards    = resource('external-cards');
export const categories       = resource('categories');
export const beneficiaries    = resource('beneficiaries');
export const transactions     = resource('transactions');
export const subscriptions    = resource('subscriptions');
export const subscriptionCharges = resource('subscription-charges');
export const debts            = resource('debts', { transformIn: debtTransformIn, transformOut: debtTransformOut });
export const debtPayments     = resource('debt-payments');
export const debtTemplates    = resource('debt-templates', { transformIn: tplTransformIn, transformOut: tplTransformOut });
export const loans            = resource('loans');
export const loanPayments     = resource('loan-payments');
export const receivables      = resource('receivables');
export const payables         = resource('payables');
export const goals            = resource('goals');
export const goalContributions = resource('goal-contributions');
export const tithe            = resource('tithe');
export const notes            = resource('notes');
export const notifications    = {
  ...resource('notifications'),
  markRead(id) { return request('PATCH', `/notifications/${id}/read`); },
};

// ---------- Notification preferences & dispatch ----------
export const notificationPrefs = {
  get()           { return request('GET', '/notifications/preferences'); },
  update(data)    { return request('PATCH', '/notifications/preferences', { body: data }); },
  triggerAlerts() { return request('POST', '/notifications/trigger-alerts'); },
  sendSummary()   { return request('POST', '/notifications/send-summary'); },
  testPush()      { return request('POST', '/notifications/test-push'); },
  log(limit = 50) { return request('GET', '/notifications/log', { query: { limit } }); },
};

// ---------- Admin ----------
export const admin = {
  users(search)         { return request('GET', '/admin/users', { query: { search } }); },
  setUserStatus(id, estado) { return request('PATCH', `/admin/users/${id}/status`, { body: { estado } }); },
  terminateSessions(id) { return request('POST', `/admin/users/${id}/terminate-sessions`); },
  forceResetPassword(id, newPassword, requireChange = true) {
    return request('POST', `/admin/users/${id}/force-reset-password`, { body: { newPassword, requireChange } });
  },
  auditLogs(limit)      { return request('GET', '/admin/audit-logs', { query: { limit } }); },
  plans()               { return request('GET', '/admin/plans'); },
  createPlan(data)      { return request('POST', '/admin/plans', { body: data }); },
  updatePlan(id, data)  { return request('PATCH', `/admin/plans/${id}`, { body: data }); },
  stats()               { return request('GET', '/admin/stats'); },
};

export default {
  auth, workspaces, banks, accounts, cards, externalCards, categories,
  beneficiaries, transactions, subscriptions, subscriptionCharges,
  debts, debtPayments, debtTemplates, loans, loanPayments,
  receivables, payables, goals, goalContributions, tithe,
  notes, notifications, notificationPrefs, admin, ApiError, tokens, workspace,
};
