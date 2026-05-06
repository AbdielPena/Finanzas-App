// ============================================
// Store — Capa de datos hibrida
// - Mantiene API SINCRONO (cero cambios en las 23 paginas)
// - Backend = API REST (cuando esta autenticado)
// - Cache en memoria precargada via bootstrap()
// - Mutaciones optimistas: actualizan cache YA, sincronizan en background
// - Fallback a localStorage si la API no esta disponible
// ============================================

import api, { tokens, workspace as wsCtx } from './api-client.js';

// ---------- Constantes ----------
const STORE_PREFIX = 'finanzapp_';
let _activeWorkspaceId = null;

export function setActiveWorkspace(wsId) {
  _activeWorkspaceId = wsId;
  if (wsId) wsCtx.set(wsId);
  else wsCtx.clear();
}

function getPrefix() {
  const wsId = _activeWorkspaceId || wsCtx.getId();
  return wsId ? `${STORE_PREFIX}${wsId}_` : `${STORE_PREFIX}legacy_`;
}

// ---------- Mapeo coleccion -> resource del API ----------
const RESOURCES = {
  banks: 'banks',
  accounts: 'accounts',
  cards: 'cards',
  external_cards: 'externalCards',
  categories: 'categories',
  beneficiaries: 'beneficiaries',
  transactions: 'transactions',
  subscriptions: 'subscriptions',
  subscription_charges: 'subscriptionCharges',
  debts: 'debts',
  debt_payments: 'debtPayments',
  debt_templates: 'debtTemplates',
  loans: 'loans',
  loan_payments: 'loanPayments',
  receivables: 'receivables',
  payables: 'payables',
  goals: 'goals',
  goal_contributions: 'goalContributions',
  tithe: 'tithe',
  notes: 'notes',
  notifications: 'notifications',
};

// ---------- Modo de operacion ----------
function isOnline() {
  return !!tokens.getAccess();
}

// ---------- Store ----------
class Store {
  constructor() {
    this._listeners = {};
    this._cache = {};
    this._writeQueue = [];
    this._writing = false;
    this._bootstrapped = false;
  }

  // ============================================
  //  Bootstrap — precarga todas las colecciones
  //  Se llama una vez despues de login
  // ============================================
  async bootstrap() {
    if (!isOnline()) {
      // Modo offline / sin login: usa localStorage como antes
      this._bootstrapped = true;
      return;
    }

    const collections = Object.keys(RESOURCES);
    const results = await Promise.allSettled(
      collections.map(col => api[RESOURCES[col]].list({ limit: 200 }))
    );

    collections.forEach((col, i) => {
      const r = results[i];
      if (r.status === 'fulfilled') {
        this._cache[col] = r.value.data || [];
      } else {
        console.warn(`[store] Falla cargando ${col}:`, r.reason?.message);
        this._cache[col] = [];
      }
    });

    this._bootstrapped = true;
    this._notify('*');
  }

  // ============================================
  //  Read — siempre sincrono, sirve desde cache
  // ============================================
  getAll(collection) {
    if (this._cache[collection]) return this._cache[collection];
    // Fallback localStorage (modo legado o no bootstrap aun)
    try {
      const data = localStorage.getItem(`${getPrefix()}${collection}`);
      const parsed = data ? JSON.parse(data) : [];
      const valid = Array.isArray(parsed) ? parsed.filter(it => it !== null && typeof it === 'object') : [];
      this._cache[collection] = valid;
      return valid;
    } catch { return []; }
  }

  getById(collection, id) {
    return this.getAll(collection).find(item => item.id === id) || null;
  }

  filter(collection, predicate)     { return this.getAll(collection).filter(predicate); }
  find(collection, predicate)       { return this.getAll(collection).find(predicate) || null; }
  count(collection, predicate)      { return predicate ? this.filter(collection, predicate).length : this.getAll(collection).length; }
  sum(collection, field, predicate) {
    const items = predicate ? this.filter(collection, predicate) : this.getAll(collection);
    return items.reduce((acc, it) => acc + (parseFloat(it[field]) || 0), 0);
  }

  // ============================================
  //  Write — optimista: cache YA, API en background
  // ============================================
  add(collection, item) {
    const enriched = { ...item, createdAt: new Date().toISOString() };
    const items = [...(this._cache[collection] || []), enriched];
    this._cache[collection] = items;
    this._persistLocal(collection, items);
    this._notify(collection);

    if (isOnline() && RESOURCES[collection]) {
      this._enqueueWrite('create', collection, enriched);
    }
    return enriched;
  }

  update(collection, id, updates) {
    const items = this.getAll(collection);
    const idx = items.findIndex(it => it.id === id);
    if (idx === -1) return null;
    const updated = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    items[idx] = updated;
    this._cache[collection] = [...items];
    this._persistLocal(collection, items);
    this._notify(collection);

    if (isOnline() && RESOURCES[collection]) {
      this._enqueueWrite('update', collection, { id, ...updates });
    }
    return updated;
  }

  remove(collection, id) {
    const items = this.getAll(collection).filter(it => it.id !== id);
    this._cache[collection] = items;
    this._persistLocal(collection, items);
    this._notify(collection);

    if (isOnline() && RESOURCES[collection]) {
      this._enqueueWrite('remove', collection, { id });
    }
  }

  save(collection, items) {
    this._cache[collection] = items;
    this._persistLocal(collection, items);
    this._notify(collection);
  }

  // ============================================
  //  Write queue (background API sync)
  // ============================================
  _enqueueWrite(op, collection, data) {
    this._writeQueue.push({ op, collection, data });
    this._processQueue();
  }

  async _processQueue() {
    if (this._writing) return;
    this._writing = true;
    try {
      while (this._writeQueue.length > 0) {
        const { op, collection, data } = this._writeQueue.shift();
        const resource = api[RESOURCES[collection]];
        if (!resource) continue;
        try {
          let result;
          if (op === 'create')      result = await resource.create(data);
          else if (op === 'update') result = await resource.update(data.id, data);
          else if (op === 'remove') result = await resource.remove(data.id);

          // Si el backend asignó su propio id en un create, reemplazamos el id
          // local (que puede haber sido generado client-side) por el real.
          // Así el siguiente bootstrap no genera un duplicado.
          if (op === 'create' && result?.data?.id && result.data.id !== data.id) {
            const items = this._cache[collection] || [];
            const idx = items.findIndex(it => it.id === data.id);
            if (idx !== -1) {
              items[idx] = { ...items[idx], ...result.data };
              this._cache[collection] = [...items];
              this._persistLocal(collection, items);
              this._notify(collection);
            }
          }
        } catch (err) {
          // Antes era un console.warn silencioso. Ahora avisamos al usuario
          // para que sepa que sus cambios no llegaron al servidor.
          console.error(`[store] write fallido ${op} ${collection}:`, err);
          try {
            const { showToast } = await import('./components.js');
            showToast(
              'error',
              'No se pudo guardar en el servidor',
              `${op} ${collection}: ${err?.message || 'error desconocido'}. Recarga la pagina para sincronizar.`
            );
          } catch {}
        }
      }
    } finally {
      this._writing = false;
    }
  }

  _persistLocal(collection, items) {
    // Mantiene una copia local como respaldo (offline-first)
    try {
      localStorage.setItem(`${getPrefix()}${collection}`, JSON.stringify(items));
    } catch { /* quota exceeded */ }
  }

  // ============================================
  //  Settings — siempre localStorage por simplicidad
  //  (TODO: mover a /workspaces/:id/settings en futuro)
  // ============================================
  getSetting(key, defaultVal = null) {
    try {
      const wsKey = `${getPrefix()}settings`;
      const settings = JSON.parse(localStorage.getItem(wsKey) || '{}');
      if (Object.keys(settings).length === 0) {
        const globalSettings = JSON.parse(localStorage.getItem(`${STORE_PREFIX}settings`) || '{}');
        if (globalSettings[key] !== undefined) return globalSettings[key];
      }
      return settings[key] !== undefined ? settings[key] : defaultVal;
    } catch { return defaultVal; }
  }

  setSetting(key, value) {
    try {
      const wsKey = `${getPrefix()}settings`;
      const settings = JSON.parse(localStorage.getItem(wsKey) || '{}');
      settings[key] = value;
      localStorage.setItem(wsKey, JSON.stringify(settings));
      this._notify('settings');
    } catch { /* silent */ }
  }

  getSettings() {
    try {
      const wsKey = `${getPrefix()}settings`;
      let settings = JSON.parse(localStorage.getItem(wsKey) || 'null');
      if (!settings || Object.keys(settings).length === 0) {
        settings = JSON.parse(localStorage.getItem(`${STORE_PREFIX}settings`) || '{}');
      }
      if (!settings.notifications) {
        settings.notifications = {
          global: true,
          anticipationDays: 3,
          types: { cc_payments: true, subs: true, debts: true, receivables: true, smart: true }
        };
      }
      return settings;
    } catch {
      return { notifications: { global: true, anticipationDays: 3, types: {} } };
    }
  }

  saveSettings(settings) {
    localStorage.setItem(`${getPrefix()}settings`, JSON.stringify(settings));
    this._notify('settings');
  }

  // ============================================
  //  Auth (legacy compat)
  // ============================================
  getAuth() {
    try { return JSON.parse(localStorage.getItem(`${STORE_PREFIX}auth`) || '{}'); } catch { return {}; }
  }
  saveAuth(data) { localStorage.setItem(`${STORE_PREFIX}auth`, JSON.stringify(data)); }
  isFirstUse() {
    try {
      const users = JSON.parse(localStorage.getItem('finanzapp_users') || '[]');
      return users.length === 0 && !tokens.getAccess();
    } catch { return true; }
  }
  isLoggedIn() { return !!tokens.getAccess(); }
  setSession(active) {
    if (!active) { tokens.clear(); wsCtx.clear(); }
  }

  // ============================================
  //  Pub/Sub
  // ============================================
  on(collection, callback) {
    if (!this._listeners[collection]) this._listeners[collection] = [];
    this._listeners[collection].push(callback);
    return () => {
      this._listeners[collection] = this._listeners[collection].filter(cb => cb !== callback);
    };
  }
  _notify(collection) {
    (this._listeners[collection] || []).forEach(cb => cb());
    (this._listeners['*'] || []).forEach(cb => cb(collection));
  }

  // ============================================
  //  Export / Import (backup)
  // ============================================
  exportData() {
    const data = {};
    Object.keys(RESOURCES).forEach(col => {
      const items = this.getAll(col);
      if (items.length > 0) data[col] = items;
    });
    data.settings = this.getSettings();
    data._exportDate = new Date().toISOString();
    data._version = '2.0.0';
    return data;
  }

  async importData(data) {
    if (!data || typeof data !== 'object') throw new Error('Datos invalidos');
    for (const key of Object.keys(data)) {
      if (key.startsWith('_')) continue;
      if (key === 'settings') { this.saveSettings(data[key]); continue; }
      if (!Array.isArray(data[key])) continue;
      this._cache[key] = data[key];
      this._persistLocal(key, data[key]);
      // Re-crea en API
      if (isOnline() && RESOURCES[key]) {
        for (const item of data[key]) this._enqueueWrite('create', key, item);
      }
    }
    this._notify('*');
  }

  clearAll() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
    this._cache = {};
    tokens.clear();
    wsCtx.clear();
  }

  invalidate(collection) {
    if (collection) {
      delete this._cache[collection];
      // Re-fetch en background
      if (isOnline() && RESOURCES[collection]) {
        api[RESOURCES[collection]].list({ limit: 200 }).then(r => {
          this._cache[collection] = r.data || [];
          this._notify(collection);
        }).catch(() => {});
      }
    } else {
      this._cache = {};
    }
  }
}

export const store = new Store();
export default store;
