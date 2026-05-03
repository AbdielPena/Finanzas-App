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
