// ============================================================
// Biometric Auth - login con huella/face en Android
// Llama directamente a window.Capacitor.Plugins.NativeBiometric
// (el plugin native de @capgo/capacitor-native-biometric ya esta
//  registrado por cap sync; no necesitamos el wrapper JS)
// ============================================================

const BIO_KEY = 'finanzapp_biometric_enabled';
const PLUGIN_NAME = 'NativeBiometric';

function getPlugin() {
  if (typeof window === 'undefined' || !window.Capacitor) return null;
  return window.Capacitor.Plugins?.[PLUGIN_NAME] || null;
}

/**
 * Verifica si el dispositivo soporta biometria.
 */
export async function isBiometricSupported() {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    const r = await plugin.isAvailable();
    return r.isAvailable === true;
  } catch { return false; }
}

/**
 * Devuelve detalles para diagnostico.
 */
export async function getBiometricStatus() {
  const out = {
    capacitorPresent: typeof window !== 'undefined' && Boolean(window.Capacitor),
    pluginsRegistered: [],
    pluginRegistered: false,
    isAvailable: false,
    biometryType: null,
    errorCode: null,
    errorMessage: null,
    error: null,
  };
  if (!out.capacitorPresent) { out.errorMessage = 'No esta corriendo dentro de una APK'; return out; }
  out.pluginsRegistered = Object.keys(window.Capacitor?.Plugins || {});
  const plugin = getPlugin();
  out.pluginRegistered = Boolean(plugin);
  if (!plugin) { out.errorMessage = `Plugin ${PLUGIN_NAME} no esta en window.Capacitor.Plugins`; return out; }
  try {
    const r = await Promise.race([
      plugin.isAvailable(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('isAvailable timeout 5s')), 5000)),
    ]);
    out.isAvailable = r.isAvailable;
    out.biometryType = r.biometryType;
    out.errorCode = r.errorCode;
    out.errorMessage = r.errorCode ? `errorCode=${r.errorCode}` : (r.isAvailable ? 'OK' : 'No disponible');
  } catch (e) {
    out.error = e?.message || String(e);
  }
  return out;
}

/**
 * Pide autenticacion biometrica al usuario.
 */
export async function authenticateBiometric(reason = 'Inicia sesion en FinanzApp') {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    await plugin.verifyIdentity({
      reason,
      title: 'FinanzApp',
      subtitle: 'Autenticacion biometrica',
      description: reason,
    });
    return true;
  } catch (e) {
    console.warn('[bio] auth fallo:', e?.message || e);
    return false;
  }
}

const BIO_SERVER = 'finanzapp';

/**
 * Guarda email + password protegidos con biometria. Despues de esto el
 * login screen puede ofrecer "Iniciar con huella" sin que el usuario
 * vuelva a escribir su contrasena.
 */
export async function saveCredentialsForBiometric(email, password) {
  const plugin = getPlugin();
  if (!plugin || !email || !password) return false;
  try {
    await plugin.setCredentials({ server: BIO_SERVER, username: email, password });
    return true;
  } catch (e) {
    console.warn('[bio] no se pudo guardar credenciales:', e?.message || e);
    return false;
  }
}

/**
 * Lee las credenciales guardadas. Pide biometria implicitamente.
 * Devuelve {username, password} si exitoso, null si falla.
 */
export async function getStoredCredentials() {
  const plugin = getPlugin();
  if (!plugin) return null;
  try {
    const r = await plugin.getCredentials({ server: BIO_SERVER });
    return { email: r.username, password: r.password };
  } catch (e) {
    console.warn('[bio] no se pudo leer credenciales:', e?.message || e);
    return null;
  }
}

export async function clearStoredCredentials() {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    await plugin.deleteCredentials({ server: BIO_SERVER });
    return true;
  } catch { return false; }
}

export function isBiometricEnabled() {
  return localStorage.getItem(BIO_KEY) === '1';
}

export function setBiometricEnabled(enabled) {
  if (enabled) localStorage.setItem(BIO_KEY, '1');
  else localStorage.removeItem(BIO_KEY);
}

export default {
  isBiometricSupported,
  getBiometricStatus,
  authenticateBiometric,
  isBiometricEnabled,
  setBiometricEnabled,
};
