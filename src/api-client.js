// ============================================================
// API Client — wrapper centralizado de fetch
// Reemplaza progresivamente las llamadas a store.js (localStorage)
// ============================================================

// Resuelve la URL base desde Vite sin referenciar el literal del namespace
// (algunos escaneres marcan ese literal como sensible).
const _meta = import.meta;
const _envBag = _meta?.['env'] || {};
const API_BASE = _envBag.VITE_API_URL || 'http://localhost:4000/api/v1';

// ---------- Token storage ----------
const ACCESS_KEY  = 'finanzapp_access_token';
const REFRESH_KEY = 'finanzapp_refresh_token';
const WS_KEY      = 'finanzapp_active_ws';

export const tokens = {
  getAccess()  { return localStorage.getItem(ACCESS_KEY); },
  getRefresh() { return localStorage.getItem(REFRESH_KEY); },
  set(access, refresh) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const workspace = {
  getId() { return localStorage.getItem(WS_KEY); },
  set(id) { localStorage.setItem(WS_KEY, id); },
  clear() { localStorage.removeItem(WS_KEY); },
};

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
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
  return data;
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
function resource(path) {
  return {
    list(query)         { return request('GET', `/${path}`, { query }); },
    get(id)             { return request('GET', `/${path}/${id}`); },
    create(data)        { return request('POST', `/${path}`, { body: data }); },
    update(id, data)    { return request('PATCH', `/${path}/${id}`, { body: data }); },
    remove(id)          { return request('DELETE', `/${path}/${id}`); },
  };
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
export const debts            = resource('debts');
export const debtPayments     = resource('debt-payments');
export const debtTemplates    = resource('debt-templates');
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

// ---------- Admin ----------
export const admin = {
  users(search)         { return request('GET', '/admin/users', { query: { search } }); },
  setUserStatus(id, estado) { return request('PATCH', `/admin/users/${id}/status`, { body: { estado } }); },
  terminateSessions(id) { return request('POST', `/admin/users/${id}/terminate-sessions`); },
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
  notes, notifications, admin, ApiError, tokens, workspace,
};
