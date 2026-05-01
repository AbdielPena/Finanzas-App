// ============================================
// Backup & Migration Engine
// ============================================
import store from './store.js';

// Keys that are not prefixed by workspaceId but should be migrated/backed up per user
const GLOBAL_KEYS_TO_BACKUP = ['finanzapp_settings'];

/**
 * Recolecta todos los datos del workspace actual y genera un archivo JSON.
 */
export function exportWorkspaceBackup(workspaceId) {
  const backupData = {
    metadata: {
      version: '1.0',
      timestamp: new Date().toISOString(),
      workspaceId: workspaceId,
      model: 'FinanzApp_Premium_Backup'
    },
    data: {}
  };

  const wsPrefix = `finanzapp_${workspaceId}_`;

  // 1. Recolectar datos del workspace (finanzapp_wsId_xxx)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // Evitamos exportar usuarios y sesiones globales enteramente por seguridad, solo lo pertinente al workspace
    if (key.startsWith(wsPrefix)) {
      const shortKey = key.replace(wsPrefix, ''); // e.g. "transactions"
      try {
        backupData.data[shortKey] = JSON.parse(localStorage.getItem(key));
      } catch {
        backupData.data[shortKey] = localStorage.getItem(key);
      }
    }
  }

  // 2. Recolectar datos globales deseados
  GLOBAL_KEYS_TO_BACKUP.forEach(gKey => {
    const raw = localStorage.getItem(gKey);
    if (raw) {
      try {
        backupData.data[gKey] = JSON.parse(raw);
      } catch {
        backupData.data[gKey] = raw;
      }
    }
  });

  // Generar blob y forzar descarga
  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const dateStr = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `finanzapp_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return true;
}

/**
 * Lee un archivo .json subido y genera un resumen antes de inyectarlo.
 */
export async function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const payload = JSON.parse(e.target.result);
        
        // Validación básica
        if (!payload.metadata || payload.metadata.model !== 'FinanzApp_Premium_Backup') {
          return reject(new Error('El archivo no es un formato válido de FinanzApp Backup v1.0'));
        }

        if (!payload.data) {
          return reject(new Error('El archivo parece estar vacío o corrupto.'));
        }

        // Generar resumen estadístico de la data
        const summary = {};
        let totalItems = 0;

        for (const [key, value] of Object.entries(payload.data)) {
          if (Array.isArray(value)) {
            summary[key] = value.length;
            totalItems += value.length;
          } else if (typeof value === 'object' && value !== null) {
            summary[key] = Object.keys(value).length;
          } else {
            summary[key] = 1;
          }
        }

        resolve({ payload, summary, totalItems });
      } catch (err) {
        reject(new Error('Fallo al interpretar el archivo. Asegúrate de que no esté corrupto.'));
      }
    };
    reader.onerror = () => reject(new Error('Problema de lectura en el navegador.'));
    reader.readAsText(file);
  });
}

/**
 * Restaura destruyendo el contenido actual del workspace y reemplazándolo por el del backup.
 * @param {string} targetWorkspaceId - Donde inyectaremos la data.
 * @param {object} payload - La data cruda del backup.
 */
export function restoreWorkspaceBackup(targetWorkspaceId, payload) {
  if (!payload || !payload.data) throw new Error("Payload inválido");

  const wsPrefix = `finanzapp_${targetWorkspaceId}_`;

  // 1. PURGADO TOTAL: Eliminar todas las llaves PREVIAS del workspace objetivo
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(wsPrefix)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  // 2. INYECCIÓN: Reemplazar al 100% con los datos del backup
  for (const [key, value] of Object.entries(payload.data)) {
    // Si la llave proviene del grupo global especial
    if (GLOBAL_KEYS_TO_BACKUP.includes(key)) {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      continue;
    }

    // Por seguridad, bloqueamos que el objeto trate de inyectar variables de ususarios o admin
    if (key.includes('users') || key.includes('session') || key.includes('workspaces')) {
      continue; // Skips sensitive master data logic
    }

    // Resto de colecciones financieras (ej. "transactions" -> "finanzapp_wsId_transactions")
    const fullKey = `${wsPrefix}${key}`;
    localStorage.setItem(fullKey, typeof value === 'string' ? value : JSON.stringify(value));
  }

  // Notificar al Store que repintó toda la base (podemos simplemente forzar recarga usando cache break)
  // Como estamos reconstruyendo, forzar recarga de página es lo más seguro en apps tipo SPA pequeñas.
  window.location.reload();
}
