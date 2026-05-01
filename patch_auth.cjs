const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/auth.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Update getCurrentUser to inject isSuperAdmin flag
content = content.replace(
  /export function getCurrentUser\(\) \{\s+const session = getSession\(\);\s+if \(\!session\) return null;\s+return getUsers\(\)\.find\(u => u\.id === session\.userId\) \|\| null;\s+\}/,
  `export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const user = getUsers().find(u => u.id === session.userId) || null;
  if (user && user.email === 'soyabdielpena@gmail.com') {
    user.isSuperAdmin = true;
  }
  return user;
}`
);

// 2. Update loginUser to handle suspended status, force password update, and lastLogin
content = content.replace(
  /export async function loginUser\(email, password\) \{\s+const users = getUsers\(\);\s+const user  = users\.find\(u => u\.email\.toLowerCase\(\) === email\.trim\(\)\.toLowerCase\(\)\);\s+if \(\!user\) throw new Error\('No existe una cuenta con ese correo\.'\);\s+if \(\!user\.activo\) throw new Error\('Esta cuenta est\u00A1 desactivada\.'\);\s+const hash = await hashPassword\(password, user\.salt\);\s+if \(hash !== user\.passwordHash\) throw new Error\('Contraseña incorrecta\.'\);\s+\/\/ Get workspaces for this user/,
  `export async function loginUser(email, password) {
  const users = getUsers();
  const user  = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user) throw new Error('No existe una cuenta con ese correo.');
  if (user.estado === 'suspendido') throw new Error('Esta cuenta ha sido suspendida por el administrador.');
  if (!user.activo && user.estado !== 'activo') throw new Error('Esta cuenta está desactivada.');

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) throw new Error('Contraseña incorrecta.');

  // Update lastLogin
  user.lastLogin = new Date().toISOString();
  saveUsers(users);

  // Return forcePasswordChange flag if applicable
  if (user.forcePasswordChange) {
    return { user, forcePasswordChange: true };
  }

  // Get workspaces for this user`
);

// 3. Update loginUser return block in case it wasn't intercepted natively
content = content.replace(
  /if \(workspaces\.length === 0\) throw new Error\('No se encontraron tus workspaces\.'\);\s+return \{ user, workspaces \};\s+\}/,
  `if (workspaces.length === 0) throw new Error('No se encontraron tus workspaces.');

  return { user, workspaces };
}`
);

// 4. Append SuperAdmin logic at the very end
content += `

// ─────────────────────────────────────────────
// SuperAdmin Panel & Audit Actions
// ─────────────────────────────────────────────
const ADMIN_AUDIT_KEY = \`\${PREFIX}admin_audit\`;

export function getAdminAuditLogs() {
  try { return JSON.parse(localStorage.getItem(ADMIN_AUDIT_KEY) || '[]'); } catch { return []; }
}

export function logAdminAction(adminId, targetUserId, action, details = '') {
  const logs = getAdminAuditLogs();
  logs.push({
    id: \`log_\${Date.now()}_\${Math.random().toString(36).substr(2, 6)}\`,
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
  logAdminAction(me.id, targetUserId, \`Cambio de estado a: \${nuevoEstado}\`);
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
  logAdminAction(me.id, targetUserId, 'Restablecimiento de contraseña', \`Cambio forzado en login: \${exigirCambio}\`);
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
`;

fs.writeFileSync(file, content, 'utf8');
console.log('auth.js successfully patched with SuperAdmin features! File size:', content.length);
