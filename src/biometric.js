// ============================================================
// Biometric Auth - login con huella/face en Android
// Usa @aparajita/capacitor-biometric-auth v9 (oficial Capacitor 6+)
// Solo se activa en Capacitor (APK Android). En web/Tauri es noop.
// ============================================================

const BIO_KEY = 'finanzapp_biometric_enabled';
const PLUGIN_NAME = 'BiometricAuthNative';

function isAvailable() {
  return typeof window !== 'undefined' && window.Capacitor?.isPluginAvailable?.(PLUGIN_NAME);
}

async function getPlugin() {
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
    pluginRegisteredNames: [],
    pluginLoaded: false,
    isAvailable: false,
    biometryType: null,
    biometryTypes: null,
    reason: null,
    code: null,
    error: null,
  };
  if (!out.capacitorPresent) { out.reason = 'No esta corriendo dentro de una APK'; return out; }
  // Lista los plugins registrados para debug
  const plugins = window.Capacitor?.Plugins || {};
  out.pluginRegisteredNames = Object.keys(plugins);
  out.pluginRegistered = Boolean(window.Capacitor.isPluginAvailable?.(PLUGIN_NAME));
  if (!out.pluginRegistered) { out.reason = `Plugin ${PLUGIN_NAME} no registrado en Capacitor`; }
  // Intenta cargarlo y llamarlo igual (a veces isPluginAvailable miente)
  const plugin = await Promise.race([
    getPlugin(),
    new Promise((res) => setTimeout(() => res(null), 3000)),
  ]);
  out.pluginLoaded = Boolean(plugin);
  if (!plugin) { out.reason = out.reason || 'Plugin no se pudo cargar (timeout o error)'; return out; }
  try {
    const r = await Promise.race([
      plugin.checkBiometry(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('checkBiometry timeout 5s')), 5000)),
    ]);
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
  getBiometricStatus,
  authenticateBiometric,
  isBiometricEnabled,
  setBiometricEnabled,
};
