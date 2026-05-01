// ============================================
// Store — Centralized data persistence layer
// ============================================

const STORE_PREFIX = 'finanzapp_';

// Dynamic prefix based on active workspace (set by auth system)
let _activeWorkspaceId = null;

export function setActiveWorkspace(wsId) {
  _activeWorkspaceId = wsId;
}

function getPrefix() {
  return _activeWorkspaceId ? `${STORE_PREFIX}${_activeWorkspaceId}_` : `${STORE_PREFIX}legacy_`;
}

class Store {
  constructor() {
    this._listeners = {};
    this._cache = {};
  }

  // ---------- Core CRUD ----------
  _getKey(collection) {
    return `${getPrefix()}${collection}`;
  }

  getAll(collection) {
    if (this._cache[collection]) return this._cache[collection];
    try {
      const data = localStorage.getItem(this._getKey(collection));
      const parsed = data ? JSON.parse(data) : [];
      // Filtro defensivo: asegurar que todos los elementos sean objetos válidos
      const valid = Array.isArray(parsed) ? parsed.filter(item => item !== null && typeof item === 'object') : [];
      this._cache[collection] = valid;
      return valid;
    } catch {
      return [];
    }
  }

  getById(collection, id) {
    return this.getAll(collection).find(item => item.id === id) || null;
  }

  save(collection, items) {
    this._cache[collection] = items;
    localStorage.setItem(this._getKey(collection), JSON.stringify(items));
    this._notify(collection);
  }

  add(collection, item) {
    const items = this.getAll(collection);
    items.push({ ...item, createdAt: new Date().toISOString() });
    this.save(collection, items);
    return item;
  }

  update(collection, id, updates) {
    const items = this.getAll(collection);
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save(collection, items);
    return items[idx];
  }

  remove(collection, id) {
    const items = this.getAll(collection).filter(item => item.id !== id);
    this.save(collection, items);
  }

  // ---------- Query helpers ----------
  filter(collection, predicate) {
    return this.getAll(collection).filter(predicate);
  }

  find(collection, predicate) {
    return this.getAll(collection).find(predicate) || null;
  }

  count(collection, predicate) {
    if (predicate) return this.filter(collection, predicate).length;
    return this.getAll(collection).length;
  }

  sum(collection, field, predicate) {
    const items = predicate ? this.filter(collection, predicate) : this.getAll(collection);
    return items.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);
  }

  // ---------- Settings (key-value) ----------
  getSetting(key, defaultVal = null) {
    try {
      const wsKey = this._getKey('settings');
      const settings = JSON.parse(localStorage.getItem(wsKey) || '{}');
      
      // Fallback a configuración global solo si el workspace está vacío (primer uso tras migración)
      if (Object.keys(settings).length === 0) {
        const globalSettings = JSON.parse(localStorage.getItem(`${STORE_PREFIX}settings`) || '{}');
        if (globalSettings[key] !== undefined) return globalSettings[key];
      }

      return settings[key] !== undefined ? settings[key] : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  setSetting(key, value) {
    try {
      const wsKey = this._getKey('settings');
      const settings = JSON.parse(localStorage.getItem(wsKey) || '{}');
      settings[key] = value;
      localStorage.setItem(wsKey, JSON.stringify(settings));
      this._notify('settings');
    } catch { /* silent */ }
  }

  getSettings() {
    try {
      const wsKey = this._getKey('settings');
      let settings = JSON.parse(localStorage.getItem(wsKey) || 'null');
      
      // Fallback legacy global
      if (!settings || Object.keys(settings).length === 0) {
        settings = JSON.parse(localStorage.getItem(`${STORE_PREFIX}settings`) || '{}');
      }

      // Aseguramos estructura de Notificaciones Avanzadas
      if (!settings.notifications) {
        settings.notifications = {
          global: true,
          anticipationDays: 3,
          types: {
            cc_payments: true,
            subs: true,
            debts: true,
            receivables: true,
            smart: true
          }
        };
      }
      return settings;
    } catch {
      return {
        notifications: { global: true, anticipationDays: 3, types: {} }
      };
    }
  }

  saveSettings(settings) {
    localStorage.setItem(this._getKey('settings'), JSON.stringify(settings));
    this._notify('settings');
  }

  // ---------- Auth (delegated to auth.js) ----------
  getAuth() {
    try { return JSON.parse(localStorage.getItem(`${STORE_PREFIX}auth`) || '{}'); } catch { return {}; }
  }
  saveAuth(data) {
    localStorage.setItem(`${STORE_PREFIX}auth`, JSON.stringify(data));
  }
  isFirstUse() {
    // Legacy: check old single-user auth
    try {
      const users = JSON.parse(localStorage.getItem('finanzapp_users') || '[]');
      return users.length === 0;
    } catch { return true; }
  }
  isLoggedIn() {
    try {
      const session = JSON.parse(sessionStorage.getItem('finanzapp_session') || 'null');
      return !!(session?.userId && session?.workspaceId);
    } catch { return false; }
  }
  setSession(active) {
    // Legacy compat — use auth.js setSession instead
    if (!active) sessionStorage.removeItem('finanzapp_session');
  }

  // ---------- Pub/Sub ----------
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

  // ---------- Export / Import ----------
  exportData() {
    const data = {};
    const collections = [
      'banks', 'accounts', 'cards', 'transactions', 'categories',
      'subscriptions', 'subscription_charges', 'debts', 'debt_payments', 'debt_templates',
      'loans', 'loan_payments',
      'receivables', 'payables', 'goals', 'goal_contributions',
      'notifications', 'tithe', 'settings'
    ];
    collections.forEach(col => {
      const key = this._getKey(col);
      const val = localStorage.getItem(key);
      if (val) data[col] = JSON.parse(val);
    });
    data._exportDate = new Date().toISOString();
    data._version = '1.0.0';
    return data;
  }

  importData(data) {
    if (!data || typeof data !== 'object') throw new Error('Datos inválidos');
    Object.keys(data).forEach(key => {
      if (key.startsWith('_')) return;
      localStorage.setItem(this._getKey(key), JSON.stringify(data[key]));
    });
    this._cache = {};
    this._notify('*');
  }

  // Clear all data
  clearAll() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
    this._cache = {};
    sessionStorage.removeItem(`${STORE_PREFIX}session`);
  }

  // Invalidate cache
  invalidate(collection) {
    if (collection) {
      delete this._cache[collection];
    } else {
      this._cache = {};
    }
  }
}

// Singleton
export const store = new Store();
export default store;
