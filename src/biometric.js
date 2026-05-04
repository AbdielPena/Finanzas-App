// ============================================================
// Biometric Auth - login con huella/face en Android
// Usa capacitor-native-biometric (estable con Capacitor 6)
// Solo se activa en Capacitor (APK Android). En web/Tauri es noop.
// ============================================================

const BIO_KEY = 'finanzapp_biometric_enabled';
const PLUGIN_NAME = 'NativeBiometric';

function isAvailable() {
  return typeof window !== 'undefined' && window.Capacitor?.isPluginAvailable?.(PLUGIN_NAME);
}

async function getPlugin() {
  if (!isAvailable()) return null;
  try {
    const mod = await import('capacitor-native-biometric');
    return mod.NativeBiometric;
  } catch { return null; }
}

/**
 * Verifica si el dispositivo soporta biometria (huella, face, etc).
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
 * Devuelve detalles completos de soporte biometrico para diagnostico.
 */
export async function getBiometricStatus() {
  const out = {
    capacitorPresent: typeof window !== 'undefined' && Boolean(window.Capacitor),
    pluginRegistered: false,
    pluginLoaded: false,
    isAvailable: false,
    biometryType: null,
    errorCode: null,
    errorMessage: null,
    error: null,
  };
  if (!out.capacitorPresent) { out.errorMessage = 'No esta corriendo dentro de una APK'; return out; }
  out.pluginRegistered = Boolean(window.Capacitor.isPluginAvailable?.(PLUGIN_NAME));
  if (!out.pluginRegistered) { out.errorMessage = `Plugin ${PLUGIN_NAME} no registrado en Capacitor`; return out; }
  const plugin = await getPlugin();
  out.pluginLoaded = Boolean(plugin);
  if (!plugin) { out.errorMessage = 'Plugin no se pudo cargar dinamicamente'; return out; }
  try {
    const r = await plugin.isAvailable();
    out.isAvailable = r.isAvailable;
    out.biometryType = r.biometryType;
    out.errorCode = r.errorCode;
    out.errorMessage = r.errorMessage || (r.isAvailable ? 'OK' : 'No disponible (sin razon)');
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
