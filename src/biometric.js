// ============================================================
// Biometric Auth - login con huella/face en Android
// Usa @capgo/capacitor-native-biometric v6 (Capacitor 6 compat)
// Solo se activa en Capacitor (APK Android). En web/Tauri es noop.
// ============================================================

const BIO_KEY = 'finanzapp_biometric_enabled';
const PLUGIN_NAME = 'NativeBiometric';

async function getPlugin() {
  if (typeof window === 'undefined' || !window.Capacitor) return null;
  try {
    const mod = await import('@capgo/capacitor-native-biometric');
    return mod.NativeBiometric;
  } catch { return null; }
}

/**
 * Verifica si el dispositivo soporta biometria.
 */
export async function isBiometricSupported() {
  const plugin = await getPlugin();
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
    pluginLoaded: false,
    isAvailable: false,
    biometryType: null,
    errorCode: null,
    errorMessage: null,
    error: null,
  };
  if (!out.capacitorPresent) { out.errorMessage = 'No esta corriendo dentro de una APK'; return out; }
  out.pluginsRegistered = Object.keys(window.Capacitor?.Plugins || {});
  out.pluginRegistered = Boolean(window.Capacitor.isPluginAvailable?.(PLUGIN_NAME));
  if (!out.pluginRegistered) { out.errorMessage = `Plugin ${PLUGIN_NAME} no registrado en Capacitor`; }
  const plugin = await Promise.race([
    getPlugin(),
    new Promise((res) => setTimeout(() => res(null), 3000)),
  ]);
  out.pluginLoaded = Boolean(plugin);
  if (!plugin) { out.errorMessage = out.errorMessage || 'Plugin no se pudo cargar (timeout)'; return out; }
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
  const plugin = await getPlugin();
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
