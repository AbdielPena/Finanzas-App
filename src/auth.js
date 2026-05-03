// ============================================
// Auth — Multi-user + Workspace system
// MODO HIBRIDO: usa API (backend) + cachea en localStorage
// para mantener compatibilidad con los getters sincronos.
// ============================================
import api, { tokens, workspace as wsCtx } from './api-client.js';

const PREFIX = 'finanzapp_';
const USERS_KEY  = `${PREFIX}users`;
const WS_KEY     = `${PREFIX}workspaces`;
const SESSION_KEY = `${PREFIX}session`;

// ─────────────────────────────────────────────
// Permissions map by role
// ─────────────────────────────────────────────
export const ROLES = {
  admin:      'Admin',
  editor:     'Editor',
  supervisor: 'Supervisor',
  viewer:     'Viewer',
};

const ROLE_PERMISSIONS = {
  admin: [
    'viewDashboard','viewTransactions','viewAccounts','viewCards',
    'viewDebts','viewSubscriptions','viewGoals','viewSettings',
    'viewUsers','viewAI','viewReports',
    'editTransactions','editAccounts','editCards','editDebts',
    'editSubscriptions','editGoals','editSettings','manageUsers',
    'confirmPayments','deleteTransactions',
  ],
  editor: [
    'viewDashboard','viewTransactions','viewAccounts','viewCards',
    'viewDebts','viewSubscriptions','viewGoals','viewAI','viewReports',
    'editTransactions','editDebts','editSubscriptions','editGoals',
    'confirmPayments','deleteTransactions',
  ],
  supervisor: [
    'viewDashboard','viewTransactions','viewAccounts','viewCards',
    'viewDebts','viewSubscriptions','viewGoals','viewReports',
  ],
  viewer: [
    'viewDashboard','viewTransactions','viewReports',
  ],
};

// ─────────────────────────────────────────────
// Password hashing (Web Crypto API — SHA-256 + salt)
// ─────────────────────────────────────────────
async function generateSalt() {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────
function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getWorkspaces() {
  try { return JSON.parse(localStorage.getItem(WS_KEY) || '[]'); } catch { return []; }
}
function saveWorkspaces(ws) {
  localStorage.setItem(WS_KEY, JSON.stringify(ws));
}

// ─────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────
export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

export function setSession(data) {
  if (data) sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  else sessionStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const user = getUsers().find(u => u.id === session.userId) || null;
  if (user && user.email === 'soyabdielpena@gmail.com') {
    user.isSuperAdmin = true;
  }
  return user;
}

export function getCurrentWorkspace() {
  const session = getSession();
  if (!session) return null;
  return getWorkspaces().find(w => w.id === session.workspaceId) || null;
}

export function getCurrentRole() {
  const session = getSession();
  return session?.role || null;
}

export function getWorkspaceId() {
  const session = getSession();
  return session?.workspaceId || null;
}

export function isLoggedIn() {
  return !!getSession();
}

export function logout() {
  // Llama API logout en background (no bloqueamos UI)
  api.auth.logout().catch(() => {});
  setSession(null);
}

// ─────────────────────────────────────────────
// Permissions
// ─────────────────────────────────────────────
export function can(permission) {
  const role = getCurrentRole();
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

// Block: throw if no permission (use in action handlers)
export function requirePerm(permission, label = '') {
  if (!can(permission)) {
    throw new Error(`Sin permisos${label ? ' para ' + label : ''}. Contacta al administrador.`);
  }
}

// ─────────────────────────────────────────────
// Registration — Create user + workspace
// ─────────────────────────────────────────────
export async function registerUser({ nombre, email, password, workspaceName }) {
  // ── Modo API (preferido) ──
  if (canUseApi()) {
    try {
      const res = await api.auth.register({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password,
        workspaceName: workspaceName?.trim() || `${nombre.trim()}'s Finanzas`,
      });
      const apiUser = res.user;
      const apiWs = res.workspace;

      // Cachea en localStorage
      const localUser = {
        id: apiUser.id,
        nombre: apiUser.nombre,
        email: apiUser.email,
        avatar: apiUser.nombre.trim().charAt(0).toUpperCase(),
        workspaces: [{ workspaceId: apiWs.id, role: 'admin' }],
        activo: true,
        estado: 'activo',
        isSuperAdmin: false,
        createdAt: new Date().toISOString(),
      };
      const allUsers = getUsers().filter(u => u.id !== localUser.id);
      saveUsers([...allUsers, localUser]);

      const localWs = {
        id: apiWs.id,
        nombre: apiWs.nombre,
        ownerUserId: apiUser.id,
        members: [{ userId: apiUser.id, role: 'admin' }],
        createdAt: new Date().toISOString(),
      };
      const allWs = getWorkspaces().filter(w => w.id !== apiWs.id);
      saveWorkspaces([...allWs, localWs]);

      return { user: localUser, workspace: localWs, migrated: 0 };
    } catch (err) {
      if (err?.status === 409) throw new Error('Ya existe una cuenta con ese correo.');
      console.warn('[auth] API register fallo, usando local:', err.message);
    }
  }

  // ── Modo legado (localStorage) ──
  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Ya existe una cuenta con ese correo.');
  }
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const wsId   = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const salt   = await generateSalt();
  const hash   = await hashPassword(password, salt);

  const user = {
    id: userId, nombre: nombre.trim(), email: email.trim().toLowerCase(),
    passwordHash: hash, salt, avatar: nombre.trim().charAt(0).toUpperCase(),
    workspaces: [{ workspaceId: wsId, role: 'admin' }],
    activo: true, createdAt: new Date().toISOString(),
  };
  const workspace = {
    id: wsId, nombre: workspaceName?.trim() || `${nombre.trim()}'s Finanzas`,
    ownerUserId: userId, members: [{ userId, role: 'admin' }],
    createdAt: new Date().toISOString(),
  };
  users.push(user); saveUsers(users);
  const workspaces = getWorkspaces();
  workspaces.push(workspace); saveWorkspaces(workspaces);

  const isFirstUser = users.length === 1;
  let migrated = 0;
  if (isFirstUser && hasLegacyData()) migrated = migrateLegacyData(wsId);

  return { user, workspace, migrated };
}

// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────
export async function loginUser(email, password) {
  // ── Modo API (preferido) ──
  if (canUseApi()) {
    try {
      const res = await api.auth.login(email.trim(), password);
      const apiUser = res.user;
      const apiWs = res.workspace;

      // Cachea user en localStorage para que getters sincronos funcionen
      const localUser = {
        id: apiUser.id,
        email: apiUser.email,
        nombre: apiUser.nombre,
        isSuperAdmin: !!apiUser.isSuperAdmin,
        activo: true,
        estado: 'activo',
        workspaces: apiWs ? [{ workspaceId: apiWs.id, role: apiWs.rol || 'admin' }] : [],
        createdAt: new Date().toISOString(),
      };
      const allUsers = getUsers().filter(u => u.id !== localUser.id);
      saveUsers([...allUsers, localUser]);

      const workspaces = [];
      if (apiWs) {
        const localWs = {
          id: apiWs.id,
          nombre: apiWs.nombre,
          ownerId: apiUser.id,
          members: [{ userId: apiUser.id, role: apiWs.rol || 'admin' }],
          createdAt: new Date().toISOString(),
          role: apiWs.rol || 'admin',
        };
        const allWs = getWorkspaces().filter(w => w.id !== apiWs.id);
        saveWorkspaces([...allWs, localWs]);
        workspaces.push(localWs);
      }

      return { user: localUser, workspaces };
    } catch (err) {
      // Si la API rechaza con 401, propaga error claro
      if (err?.status === 401) throw new Error('Credenciales invalidas.');
      if (err?.status === 403) throw new Error('Cuenta suspendida o inactiva.');
      // Otro error: cae a modo local solo si NO esta autenticado en absoluto
      console.warn('[auth] API login fallo, intentando local:', err.message);
    }
  }

  // ── Modo legado (localStorage solamente) ──
  const users = getUsers();
  const user  = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) throw new Error('No existe una cuenta con ese correo.');
  if (!user.activo) throw new Error('Esta cuenta esta desactivada.');

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) throw new Error('Contrasena incorrecta.');

  const allWs = getWorkspaces();
  const userWs = user.workspaces || [];
  if (userWs.length === 0) throw new Error('No tienes acceso a ningun workspace.');

  const workspaces = userWs.map(uw => {
    const ws = allWs.find(w => w.id === uw.workspaceId);
    return ws ? { ...ws, role: uw.role } : null;
  }).filter(Boolean);

  if (workspaces.length === 0) throw new Error('No se encontraron tus workspaces.');

  if (hasLegacyData()) {
    migrateLegacyData(workspaces[0].id);
  }
  return { user, workspaces };
}

// Helper: detecta si la API esta disponible (configurada)
function canUseApi() {
  // Si fetch existe y la URL base no es vacia
  return typeof fetch === 'function';
}

// ─────────────────────────────────────────────
// Select workspace (set session)
// ─────────────────────────────────────────────
export function selectWorkspace(userId, workspaceId) {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error('Usuario no encontrado.');

  const ws = user.workspaces?.find(w => w.workspaceId === workspaceId);
  if (!ws) throw new Error('Sin acceso a este workspace.');

  // Sincroniza el workspace activo en api-client (header X-Workspace-Id)
  wsCtx.set(workspaceId);

  setSession({ userId, workspaceId, role: ws.role, nombre: user.nombre, avatar: user.avatar });
}

// ─────────────────────────────────────────────
// User management (admin only)
// ─────────────────────────────────────────────
export async function addMember({ workspaceId, nombre, email, password, role }) {
  const allUsers = getUsers();
  const allWs = getWorkspaces();
  const ws = allWs.find(w => w.id === workspaceId);
  if (!ws) throw new Error('Workspace no encontrado.');

  let userId;
  let existingUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    // User already exists — just add them to this workspace
    if (existingUser.workspaces?.find(w => w.workspaceId === workspaceId)) {
      throw new Error('Este usuario ya es miembro del workspace.');
    }
    existingUser.workspaces = [...(existingUser.workspaces || []), { workspaceId, role }];
    userId = existingUser.id;
    saveUsers(allUsers);
  } else {
    // Create new user
    userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const salt = await generateSalt();
    const hash = await hashPassword(password, salt);
    const newUser = {
      id: userId,
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hash,
      salt,
      avatar: nombre.trim().charAt(0).toUpperCase(),
      workspaces: [{ workspaceId, role }],
      activo: true,
      createdAt: new Date().toISOString(),
    };
    allUsers.push(newUser);
    saveUsers(allUsers);
  }

  // Update workspace members
  ws.members = [...(ws.members || []), { userId, role }];
  saveWorkspaces(allWs);

  return userId;
}

export function updateMemberRole(workspaceId, userId, newRole) {
  const allUsers = getUsers();
  const allWs = getWorkspaces();
  const ws = allWs.find(w => w.id === workspaceId);
  if (!ws) throw new Error('Workspace no encontrado.');

  // Must keep at least one admin
  if (newRole !== 'admin') {
    const adminCount = (ws.members || []).filter(m => m.role === 'admin').length;
    const isTargetAdmin = ws.members.find(m => m.userId === userId)?.role === 'admin';
    if (isTargetAdmin && adminCount <= 1) throw new Error('Debe quedar al menos un administrador.');
  }

  ws.members = ws.members.map(m => m.userId === userId ? { ...m, role: newRole } : m);
  saveWorkspaces(allWs);

  const user = allUsers.find(u => u.id === userId);
  if (user) {
    user.workspaces = user.workspaces.map(w =>
      w.workspaceId === workspaceId ? { ...w, role: newRole } : w
    );
    saveUsers(allUsers);
  }
}

export function removeMember(workspaceId, userId) {
  const allUsers = getUsers();
  const allWs = getWorkspaces();
  const ws = allWs.find(w => w.id === workspaceId);
  if (!ws) throw new Error('Workspace no encontrado.');

  // Can't remove the owner
  if (ws.ownerUserId === userId) throw new Error('No puedes eliminar al propietario del workspace.');

  ws.members = ws.members.filter(m => m.userId !== userId);
  saveWorkspaces(allWs);

  const user = allUsers.find(u => u.id === userId);
  if (user) {
    user.workspaces = user.workspaces.filter(w => w.workspaceId !== workspaceId);
    saveUsers(allUsers);
  }
}

export function getWorkspaceMembers(workspaceId) {
  const allUsers = getUsers();
  const ws = getWorkspaces().find(w => w.id === workspaceId);
  if (!ws) return [];
  return (ws.members || []).map(m => {
    const user = allUsers.find(u => u.id === m.userId);
    return user ? { ...user, role: m.role } : null;
  }).filter(Boolean);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
export function hasAnyUsers() {
  return getUsers().length > 0;
}

// ─────────────────────────────────────────────
// Legacy data migration
// Detects data from the old single-user system (finanzapp_*)
// and copies it into the new workspace namespace.
// ─────────────────────────────────────────────
const LEGACY_COLLECTIONS = [
  'banks','accounts','cards','transactions','categories',
  'subscriptions','subscription_charges','debts','debt_payments',
  'receivables','payables','goals','goal_contributions',
  'notifications','tithe','settings','external_cards','notes',
];

export function hasLegacyData() {
  // Check if any old-format key has actual data
  return LEGACY_COLLECTIONS.some(col => {
    const raw1 = localStorage.getItem(`finanzapp_${col}`);
    const raw2 = localStorage.getItem(`finanzapp_legacy_${col}`);
    
    if (!raw1 && !raw2) return false;
    try {
      const parsed = JSON.parse(raw1 || raw2);
      return Array.isArray(parsed) ? parsed.length > 0 : Object.keys(parsed).length > 0;
    } catch { return false; }
  });
}

export function migrateLegacyData(workspaceId) {
  let migratedCount = 0;
  LEGACY_COLLECTIONS.forEach(col => {
    const oldKey1 = `finanzapp_${col}`;
    const oldKey2 = `finanzapp_legacy_${col}`;
    const newKey = `finanzapp_${workspaceId}_${col}`;
    
    const raw = localStorage.getItem(oldKey2) || localStorage.getItem(oldKey1);
    if (!raw) return;
    
    // Only migrate if destination doesn't safely hold our exact data
    const existingRaw = localStorage.getItem(newKey);
    let legacyParsed = [];
    let existingParsed = [];
    
    try { legacyParsed = JSON.parse(raw) } catch(e) {}
    try { existingParsed = existingRaw ? JSON.parse(existingRaw) : [] } catch(e) {}
    
    // Si la coleccion es Array, mergeamos
    if (Array.isArray(legacyParsed)) {
      if (!Array.isArray(existingParsed)) existingParsed = [];
      const newItems = legacyParsed.filter(oldItem => !existingParsed.find(e => e.id === oldItem.id));
      if (newItems.length > 0) {
        localStorage.setItem(newKey, JSON.stringify([...existingParsed, ...newItems]));
        migratedCount++;
      }
    } else {
      // Configuraciones (objetos) - preferimos legacy data si la nueva está vacía
      if (!existingRaw || Object.keys(existingParsed).length === 0) {
        localStorage.setItem(newKey, raw);
        migratedCount++;
      }
    }
  });
  return migratedCount;
}


// ─────────────────────────────────────────────
// SuperAdmin Panel & Audit Actions
// ─────────────────────────────────────────────
const ADMIN_AUDIT_KEY = `${PREFIX}admin_audit`;

export function getAdminAuditLogs() {
  try { return JSON.parse(localStorage.getItem(ADMIN_AUDIT_KEY) || '[]'); } catch { return []; }
}

export function logAdminAction(adminId, targetUserId, action, details = '') {
  const logs = getAdminAuditLogs();
  logs.push({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    adminId,
    targetUserId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(ADMIN_AUDIT_KEY, JSON.stringify(logs));
}

// Ensure the caller is a superadmin
export function _requireSuperAdmin() {
  const me = getCurrentUser();
  if (!me || !me.isSuperAdmin) throw new Error('Acceso denegado: Se requiere rol de SuperAdministrador.');
  return me;
}

export function getAllUsersAdmin() {
  _requireSuperAdmin();
  return getUsers().map(u => ({ ...u, passwordHash: undefined, salt: undefined }));
}

export function updateUserAdminStatus(targetUserId, nuevoEstado) {
  const me = _requireSuperAdmin();
  const users = getUsers();
  const idx = users.findIndex(u => u.id === targetUserId);
  if (idx === -1) throw new Error('Usuario no encontrado');
  
  users[idx].estado = nuevoEstado;
  if(nuevoEstado === 'activo') users[idx].activo = true;
  if(nuevoEstado === 'suspendido' || nuevoEstado === 'inactivo') users[idx].activo = false;

  saveUsers(users);
  logAdminAction(me.id, targetUserId, `Cambio de estado a: ${nuevoEstado}`);
}

export async function forcePasswordResetAdmin(targetUserId, nuevaContrasena, exigirCambio) {
  const me = _requireSuperAdmin();
  const users = getUsers();
  const idx = users.findIndex(u => u.id === targetUserId);
  if (idx === -1) throw new Error('Usuario no encontrado');

  const salt = await generateSalt();
  const hash = await hashPassword(nuevaContrasena, salt);
  
  users[idx].salt = salt;
  users[idx].passwordHash = hash;
  users[idx].forcePasswordChange = !!exigirCambio;

  saveUsers(users);
  logAdminAction(me.id, targetUserId, 'Restablecimiento de contraseña', `Cambio forzado en login: ${exigirCambio}`);
}

export async function finishForcedPasswordChange(userId, newPassword) {
  // Not strictly superadmin, called by the user themselves
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) throw new Error('Usuario no encontrado');

  const salt = await generateSalt();
  const hash = await hashPassword(newPassword, salt);
  
  users[idx].salt = salt;
  users[idx].passwordHash = hash;
  users[idx].forcePasswordChange = false; // Resolved

  saveUsers(users);
  logAdminAction(userId, userId, 'Cambio de contraseña forzado completado');
}

export function terminateUserSessions(targetUserId) {
  const me = _requireSuperAdmin();
  logAdminAction(me.id, targetUserId, 'Cierre de sesión forzado (simulado)', 'Se requiere invalidar tokens en Backend para completitud real.');
  // Since we rely on sessionStorage locally, we can't clear other browsers directly via JS localStorage without a polling mechanism.
}
