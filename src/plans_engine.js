// ============================================
// Plans Engine — Núcleo SaaS de FinanzApp
// ============================================
// Funciones:
//   · Gestión del catálogo de planes (CRUD admin)
//   · Asignación de plan por usuario
//   · Verificación de límites y feature flags
//   · Mensajes de upgrade elegantes
//
// Principios de diseño (NO NEGOCIABLES):
//   1. Backward-compat total: usuarios sin plan asignado reciben LEGACY_UNLIMITED_PLAN
//      (permisivo) para NO romper nada existente. Los límites solo aplican cuando el admin
//      asigna un plan explícito al usuario.
//   2. Enforcement aditivo: no se elimina data histórica. Los límites aplican hacia adelante.
//   3. Persistencia en localStorage (store.setSetting) — no toca Supabase schema.
//   4. Autoseed idempotente: el catálogo default se instala solo si no existe.
// ============================================

import { store } from './store.js';
import { getCurrentUser, getCurrentWorkspace } from './auth.js';
import {
  DEFAULT_PLANS,
  LEGACY_UNLIMITED_PLAN,
  FEATURE_CATEGORIES,
  ALL_FEATURES,
} from './plans_data.js';

const SETTING_CATALOG = 'plans_catalog';
const SETTING_ASSIGNMENTS = 'plans_userAssignments';
const SETTING_USAGE = 'plans_usageCounters';

// ---------- Helpers de persistencia ----------
function readCatalog() {
  const stored = store.getSetting(SETTING_CATALOG, null);
  if (Array.isArray(stored) && stored.length > 0) return stored;
  return DEFAULT_PLANS;
}

function writeCatalog(plans) {
  store.setSetting(SETTING_CATALOG, plans);
}

function readAssignments() {
  return store.getSetting(SETTING_ASSIGNMENTS, {}) || {};
}

function writeAssignments(map) {
  store.setSetting(SETTING_ASSIGNMENTS, map);
}

function readUsage() {
  return store.getSetting(SETTING_USAGE, {}) || {};
}

function writeUsage(u) {
  store.setSetting(SETTING_USAGE, u);
}

// ---------- Autoseed ----------
// Si el admin nunca ha creado planes, sembramos el catálogo default una vez.
// Idempotente: si ya existe, no hace nada.
export function ensureSeeded() {
  const stored = store.getSetting(SETTING_CATALOG, null);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    writeCatalog(DEFAULT_PLANS);
    return true;
  }
  return false;
}

// ---------- Catálogo ----------
export function getAllPlans(includeHidden = false) {
  const catalog = readCatalog();
  return catalog
    .filter(p => includeHidden || !p.hidden)
    .sort((a, b) => (a.order || 99) - (b.order || 99));
}

export function getActivePlans() {
  return getAllPlans().filter(p => p.status === 'active');
}

export function getPlanById(id) {
  if (!id) return null;
  if (id === LEGACY_UNLIMITED_PLAN.id) return LEGACY_UNLIMITED_PLAN;
  return readCatalog().find(p => p.id === id) || null;
}

export function createPlan(plan) {
  const catalog = readCatalog();
  const id = plan.id || `plan_${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const newPlan = {
    id,
    name: plan.name || 'Plan sin nombre',
    description: plan.description || '',
    price: Number(plan.price) || 0,
    currency: plan.currency || 'USD',
    billing: plan.billing || 'monthly',
    status: plan.status || 'active',
    featured: !!plan.featured,
    order: plan.order || catalog.length + 1,
    color: plan.color || '#8B5CF6',
    tagline: plan.tagline || '',
    cta: plan.cta || `Actualizar a ${plan.name || 'este plan'}`,
    limits: plan.limits || buildDefaultLimits(),
    features: plan.features || buildDefaultFeatures(),
    createdAt: now,
    updatedAt: now,
  };
  catalog.push(newPlan);
  writeCatalog(catalog);
  return newPlan;
}

export function updatePlan(id, updates) {
  const catalog = readCatalog();
  const idx = catalog.findIndex(p => p.id === id);
  if (idx === -1) return null;
  catalog[idx] = { ...catalog[idx], ...updates, updatedAt: new Date().toISOString() };
  writeCatalog(catalog);
  return catalog[idx];
}

export function deletePlan(id) {
  // Safety: no permitir borrar si hay usuarios asignados. Desactivar en lugar de borrar.
  const assignments = readAssignments();
  const usersOnPlan = Object.values(assignments).filter(a => a.planId === id).length;
  if (usersOnPlan > 0) {
    // Soft delete: desactivar
    updatePlan(id, { status: 'inactive' });
    return { deleted: false, deactivated: true, affectedUsers: usersOnPlan };
  }
  const catalog = readCatalog();
  const filtered = catalog.filter(p => p.id !== id);
  writeCatalog(filtered);
  return { deleted: true };
}

export function togglePlanStatus(id) {
  const plan = getPlanById(id);
  if (!plan) return null;
  const next = plan.status === 'active' ? 'inactive' : 'active';
  return updatePlan(id, { status: next });
}

// ---------- Asignaciones usuario ↔ plan ----------
// Cada usuario puede tener un plan con su estado. Si no tiene, usa LEGACY permisivo.
export function getUserPlanAssignment(userId) {
  if (!userId) return null;
  const assignments = readAssignments();
  return assignments[userId] || null;
}

export function assignPlanToUser(userId, planId, opts = {}) {
  if (!userId || !planId) return null;
  const plan = getPlanById(planId);
  if (!plan) return null;
  const assignments = readAssignments();
  const now = new Date();
  const duration = opts.durationDays || (plan.billing === 'annual' ? 365 : plan.billing === 'monthly' ? 30 : 36500);
  const endDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
  assignments[userId] = {
    userId,
    planId,
    status: opts.status || 'active', // active | trial | expired | cancelled
    startDate: opts.startDate || now.toISOString(),
    endDate: opts.endDate || endDate.toISOString(),
    assignedAt: now.toISOString(),
    note: opts.note || '',
  };
  writeAssignments(assignments);
  return assignments[userId];
}

export function removeUserAssignment(userId) {
  const assignments = readAssignments();
  delete assignments[userId];
  writeAssignments(assignments);
}

// Exposed for admin UI — returns all assignments map
export function getAllAssignments() {
  return readAssignments();
}

// ---------- Plan activo del usuario actual ----------
// Si el usuario no tiene plan, devuelve LEGACY (permisivo) para NO romper nada.
export function getCurrentPlan() {
  const user = getCurrentUser();
  if (!user) return LEGACY_UNLIMITED_PLAN;
  // SuperAdmin siempre tiene acceso Business-level
  if (user.isSuperAdmin) return LEGACY_UNLIMITED_PLAN;
  const assignment = getUserPlanAssignment(user.id);
  if (!assignment) return LEGACY_UNLIMITED_PLAN;
  // Verificar expiración
  if (assignment.endDate && new Date(assignment.endDate) < new Date()) {
    // Plan expirado — cae a LEGACY por ahora (no bloqueamos). El admin puede cambiar esto.
    return LEGACY_UNLIMITED_PLAN;
  }
  const plan = getPlanById(assignment.planId);
  return plan || LEGACY_UNLIMITED_PLAN;
}

export function getCurrentAssignment() {
  const user = getCurrentUser();
  if (!user) return null;
  return getUserPlanAssignment(user.id);
}

// ---------- Feature flags ----------
export function hasFeature(featureKey) {
  const plan = getCurrentPlan();
  if (!plan || !plan.features) return false;
  return plan.features[featureKey] === true;
}

// ---------- Límites ----------
export function getLimit(limitKey) {
  const plan = getCurrentPlan();
  if (!plan || !plan.limits) return -1;
  const val = plan.limits[limitKey];
  if (val === undefined || val === null) return -1;
  return val;
}

export function isUnlimited(limitKey) {
  return getLimit(limitKey) === -1;
}

// Verifica si un recurso puede crearse. Recibe el count actual y retorna
// un objeto descriptivo para facilitar mensajes elegantes.
export function canCreate(limitKey, currentCount) {
  const limit = getLimit(limitKey);
  if (limit === -1) return { allowed: true, limit: -1, current: currentCount, remaining: Infinity };
  const remaining = Math.max(0, limit - currentCount);
  return {
    allowed: currentCount < limit,
    limit,
    current: currentCount,
    remaining,
    percent: limit > 0 ? Math.round((currentCount / limit) * 100) : 100,
  };
}

// Auto-count: determina el count actual leyendo del store sin necesidad de pasarlo.
export function canCreateAuto(limitKey) {
  const map = LIMIT_KEY_TO_COLLECTION;
  const collection = map[limitKey];
  if (!collection) return canCreate(limitKey, 0);
  let count;
  if (typeof collection === 'function') {
    count = collection();
  } else {
    count = store.count(collection);
  }
  return canCreate(limitKey, count);
}

// Mapa limit_key → colección/función del store
const LIMIT_KEY_TO_COLLECTION = {
  max_accounts: 'accounts',
  max_cards: 'cards',
  max_external_cards: 'external_cards',
  max_debts: () => store.count('debts', d => d.status !== 'paid'),
  max_loans: () => store.count('loans', l => l.status !== 'paid'),
  max_receivables: () => store.count('receivables', r => r.status !== 'received'),
  max_payables: () => store.count('payables', p => p.status !== 'paid'),
  max_clients: 'clients',
  max_goals: () => store.count('goals', g => g.status !== 'completed'),
  max_subscriptions: 'subscriptions',
  max_templates: 'templates',
  max_users: 'users',
  max_workspaces: 'workspaces',
  max_transactions_month: () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return store.count('transactions', t => (t.date || '').startsWith(month));
  },
  max_exports_month: () => getMonthUsage('exports'),
  max_ai_queries_month: () => getMonthUsage('ai_queries'),
};

// ---------- Usage counters (para recursos efímeros como exports / ai queries) ----------
export function incrementUsage(counterKey, amount = 1) {
  const usage = readUsage();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!usage[month]) usage[month] = {};
  usage[month][counterKey] = (usage[month][counterKey] || 0) + amount;
  writeUsage(usage);
  return usage[month][counterKey];
}

export function getMonthUsage(counterKey) {
  const usage = readUsage();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return (usage[month] && usage[month][counterKey]) || 0;
}

// ---------- Labels, mensajes, upgrade suggestions ----------
export function getLimitLabel(limitKey) {
  for (const cat of Object.values(FEATURE_CATEGORIES)) {
    for (const lim of cat.limits || []) {
      if (lim.key === limitKey) return lim;
    }
  }
  return { key: limitKey, label: limitKey, unit: 'items' };
}

export function getLimitMessage(limitKey, currentCount) {
  const check = currentCount !== undefined ? canCreate(limitKey, currentCount) : canCreateAuto(limitKey);
  const label = getLimitLabel(limitKey);
  const plan = getCurrentPlan();
  if (check.allowed) {
    if (check.limit === -1) return { type: 'ok', text: `Ilimitado en tu plan ${plan.name}` };
    return {
      type: 'ok',
      text: `${check.current} de ${check.limit} ${label.unit} usadas (${check.percent}%)`,
      percent: check.percent,
    };
  }
  // Sugerir plan superior
  const upgrade = suggestUpgradePlan(limitKey);
  return {
    type: 'blocked',
    text: `Alcanzaste el límite de ${label.label} en el plan ${plan.name} (${check.current}/${check.limit}).`,
    suggestion: upgrade ? `Actualiza a ${upgrade.name} para ${upgrade.limits[limitKey] === -1 ? 'ilimitado' : upgrade.limits[limitKey]} ${label.unit}.` : 'Actualiza tu plan para desbloquear más.',
    suggestedPlan: upgrade,
    limit: check.limit,
    current: check.current,
  };
}

// Sugiere el plan activo más barato que tenga más límite que el actual en `limitKey`.
export function suggestUpgradePlan(limitKey) {
  const current = getCurrentPlan();
  const currentLimit = current.limits?.[limitKey] ?? 0;
  const candidates = getActivePlans()
    .filter(p => p.id !== current.id)
    .filter(p => {
      const lim = p.limits?.[limitKey] ?? 0;
      return lim === -1 || lim > currentLimit;
    })
    .sort((a, b) => (a.price || 0) - (b.price || 0));
  return candidates[0] || null;
}

export function suggestUpgradeFeature(featureKey) {
  if (hasFeature(featureKey)) return null;
  const candidates = getActivePlans()
    .filter(p => p.features?.[featureKey] === true)
    .sort((a, b) => (a.price || 0) - (b.price || 0));
  return candidates[0] || null;
}

// ---------- Helpers de construcción ----------
function buildDefaultLimits() {
  const limits = {};
  for (const cat of Object.values(FEATURE_CATEGORIES)) {
    for (const lim of cat.limits || []) {
      limits[lim.key] = -1;
    }
  }
  return limits;
}

function buildDefaultFeatures() {
  const f = {};
  for (const key of ALL_FEATURES) f[key] = true;
  return f;
}

// ---------- Summary para dashboards ----------
export function getPlanSummary() {
  const plan = getCurrentPlan();
  const assignment = getCurrentAssignment();
  const usageLines = [];
  for (const cat of Object.values(FEATURE_CATEGORIES)) {
    for (const lim of cat.limits || []) {
      const info = canCreateAuto(lim.key);
      usageLines.push({
        key: lim.key,
        label: lim.label,
        unit: lim.unit,
        category: cat.name,
        limit: info.limit,
        current: info.current,
        percent: info.percent || 0,
        unlimited: info.limit === -1,
        critical: info.limit !== -1 && info.percent >= 80,
      });
    }
  }
  return {
    plan,
    assignment,
    usage: usageLines,
    nearCriticalCount: usageLines.filter(l => l.critical).length,
  };
}

// ---------- UI helper: modal de upgrade ----------
// Devuelve HTML para un modal reutilizable cuando se bloquea una acción por límite.
export function buildUpgradeModalHTML({ title, message, suggestion, suggestedPlan }) {
  const planName = suggestedPlan?.name || 'un plan superior';
  const planPrice = suggestedPlan ? `${suggestedPlan.currency} ${suggestedPlan.price}/${suggestedPlan.billing === 'annual' ? 'año' : 'mes'}` : '';
  return `
    <div class="upgrade-modal-overlay" id="upgrade-modal-overlay">
      <div class="upgrade-modal">
        <div class="upgrade-modal-close" id="upgrade-modal-close">✕</div>
        <div class="upgrade-modal-icon">🚀</div>
        <h2 class="upgrade-modal-title">${title || 'Límite alcanzado'}</h2>
        <p class="upgrade-modal-message">${message || ''}</p>
        ${suggestion ? `<p class="upgrade-modal-suggestion">${suggestion}</p>` : ''}
        ${suggestedPlan ? `
          <div class="upgrade-modal-plan">
            <div class="upgrade-modal-plan-name">${suggestedPlan.name}</div>
            <div class="upgrade-modal-plan-price">${planPrice}</div>
          </div>
        ` : ''}
        <div class="upgrade-modal-actions">
          <button class="btn btn-ghost" id="upgrade-modal-cancel">Más tarde</button>
          <a class="btn btn-primary" href="#/pricing" id="upgrade-modal-cta">Ver planes</a>
        </div>
      </div>
    </div>
  `;
}

export function showUpgradeModal(opts) {
  // Remove any existing modal
  document.getElementById('upgrade-modal-overlay')?.remove();
  const wrap = document.createElement('div');
  wrap.innerHTML = buildUpgradeModalHTML(opts);
  document.body.appendChild(wrap.firstElementChild);
  const overlay = document.getElementById('upgrade-modal-overlay');
  const close = () => overlay?.remove();
  document.getElementById('upgrade-modal-close')?.addEventListener('click', close);
  document.getElementById('upgrade-modal-cancel')?.addEventListener('click', close);
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('upgrade-modal-cta')?.addEventListener('click', () => {
    close();
    if (window.router) window.router.navigate('/pricing');
    else window.location.hash = '#/pricing';
  });
}

// ---------- Guard: shortcut para usar antes de crear un recurso ----------
// Retorna true si puede proceder, false si se bloqueó (y ya mostró modal).
export function enforceLimit(limitKey, opts = {}) {
  const info = canCreateAuto(limitKey);
  if (info.allowed) return true;
  const label = getLimitLabel(limitKey);
  const plan = getCurrentPlan();
  const suggested = suggestUpgradePlan(limitKey);
  showUpgradeModal({
    title: opts.title || `Alcanzaste el límite de ${label.label}`,
    message: opts.message || `Tu plan ${plan.name} permite hasta ${info.limit} ${label.unit}. Actualmente tienes ${info.current}.`,
    suggestion: suggested ? `Actualiza a ${suggested.name} para ${suggested.limits[limitKey] === -1 ? 'disponer de ilimitadas' : `hasta ${suggested.limits[limitKey]}`} ${label.unit}.` : 'Considera actualizar tu plan.',
    suggestedPlan: suggested,
  });
  return false;
}

export function enforceFeature(featureKey, opts = {}) {
  if (hasFeature(featureKey)) return true;
  const suggested = suggestUpgradeFeature(featureKey);
  const plan = getCurrentPlan();
  showUpgradeModal({
    title: opts.title || 'Función no disponible en tu plan',
    message: opts.message || `Esta acción requiere una función que no está incluida en tu plan ${plan.name}.`,
    suggestion: suggested ? `${suggested.name} incluye esta función.` : 'Actualiza tu plan para desbloquearla.',
    suggestedPlan: suggested,
  });
  return false;
}

// ---------- Export categorías y features para el admin UI ----------
export { FEATURE_CATEGORIES, ALL_FEATURES };
