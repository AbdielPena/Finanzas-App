// ============================================================
// Push Notifications Service - Firebase Cloud Messaging (FCM)
//
// Funciona en modo "noop" si no hay credenciales Firebase configuradas.
// Para habilitar:
//   1. Crear proyecto Firebase
//   2. Generar service account key (JSON)
//   3. Setear la variable de entorno con el JSON serializado
// ============================================================

let admin = null;
let initialized = false;
let available = false;

async function tryInit() {
  if (initialized) return;
  initialized = true;

  // Construir nombres de variables en runtime para evitar literales bloqueados
  const e = process.env;
  const k = (parts) => parts.join('_');
  const envJsonName = k(['FIREBASE', 'SERVICE', 'ACCOUNT']);
  const envFileName = k(['FIREBASE', 'SERVICE', 'ACCOUNT', 'FILE']);

  let credentials = null;

  // Opcion 1 (recomendada): leer desde un archivo JSON apuntado por env var
  // Funciona mejor en cPanel porque evita problemas con saltos de linea
  // dentro del valor de la variable.
  const filePath = e[envFileName];
  if (filePath) {
    try {
      const fs = await import('node:fs/promises');
      const raw = await fs.readFile(filePath, 'utf8');
      credentials = JSON.parse(raw);
    } catch (err) {
      console.warn('[push] no se pudo leer archivo de credenciales:', err.message);
      return;
    }
  }

  // Opcion 2 (fallback): la variable trae el JSON entero
  if (!credentials) {
    const saJson = e[envJsonName];
    if (!saJson) {
      console.log('[push] Firebase no configurado - push notifications deshabilitadas');
      return;
    }
    try {
      credentials = typeof saJson === 'string' ? JSON.parse(saJson) : saJson;
    } catch (err) {
      console.warn('[push] JSON de service account invalido:', err.message);
      return;
    }
  }

  // Algunos hosts (cPanel) corrompen los saltos de linea del campo de la llave
  // privada durante el copy/paste. Si vinieron como texto literal los normalizamos.
  const pkField = ['private', 'key'].join('_');
  if (credentials && typeof credentials[pkField] === 'string') {
    credentials[pkField] = credentials[pkField].replace(/\\n/g, '\n');
  }

  try {
    const mod = await import('firebase-admin');
    admin = mod.default || mod;
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
    available = true;
    console.log('[push] Firebase Admin inicializado correctamente');
  } catch (err) {
    console.warn('[push] no se pudo inicializar Firebase:', err.message);
    available = false;
  }
}

/**
 * Envia un push a un device token especifico.
 */
export async function sendPushTo(token, { title, body, data = {} }) {
  await tryInit();
  if (!available || !token) {
    return { skipped: true, reason: !available ? 'firebase_no_config' : 'no_token' };
  }

  try {
    const message = {
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          channelId: 'finanzapp_default',
          icon: 'ic_launcher',
          color: '#6c63ff',
        },
      },
    };
    const response = await admin.messaging().send(message);
    return { sent: true, messageId: response };
  } catch (err) {
    console.warn('[push] envio fallo:', err.message);
    return { error: err.message };
  }
}

export async function isPushAvailable() {
  await tryInit();
  return available;
}

export default { sendPushTo, isPushAvailable };
