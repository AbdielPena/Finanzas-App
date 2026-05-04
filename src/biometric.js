// ============================================================
// Biometric Auth - login con huella/face en Android
// Usa @aparajita/capacitor-biometric-auth (compatible Capacitor 6)
// Solo se activa en Capacitor (APK Android). En web/Tauri es noop.
// ============================================================

const BIO_KEY = 'finanzapp_biometric_enabled';

function isAvailable() {
  return typeof window !== 'undefined' && window.Capacitor?.isPluginAvailable?.('BiometricAuth');
}

async function getPlugin() {
  if (!isAvailable()) return null;
  try {
    const mod = await import('@aparajita/capacitor-biometric-auth');
    return mod.BiometricAuth;
  } catch { return null; }
}

/**
 * Verifica si el dispositivo soporta biometria (huella, face, etc).
 */
export async function isBiometricSupported() {
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    const r = await plugin.checkBiometry();
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
    biometryTypes: null,
    reason: null,
    code: null,
    error: null,
  };
  if (!out.capacitorPresent) { out.reason = 'No esta corriendo dentro de una APK'; return out; }
  out.pluginRegistered = Boolean(window.Capacitor.isPluginAvailable?.('BiometricAuth'));
  if (!out.pluginRegistered) { out.reason = 'Plugin BiometricAuth no registrado en Capacitor'; return out; }
  const plugin = await getPlugin();
  out.pluginLoaded = Boolean(plugin);
  if (!plugin) { out.reason = 'Plugin no se pudo cargar dinamicamente'; return out; }
  try {
    const r = await plugin.checkBiometry();
    out.isAvailable = r.isAvailable;
    out.biometryType = r.biometryType;
    out.biometryTypes = r.biometryTypes;
    out.reason = r.reason || (r.isAvailable ? 'OK' : 'No disponible (sin razon)');
    out.code = r.code;
  } catch (e) {
    out.error = e?.message || String(e);
  }
  return out;
}

/**
 * Pide autenticacion biometrica al usuario.
 * @returns {Promise<boolean>} true si se autentico, false si cancelo o fallo
 */
export async function authenticateBiometric(reason = 'Inicia sesion en FinanzApp') {
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    await plugin.authenticate({
      reason,
      cancelTitle: 'Cancelar',
      androidTitle: 'FinanzApp',
      androidSubtitle: 'Autenticacion biometrica',
      androidConfirmationRequired: false,
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
  authenticateBiometric,
  isBiometricEnabled,
  setBiometricEnabled,
};
