// ============================================================
// Trash service — papelera global
// - listGlobalTrash(workspaceId): inventario de items en papelera
//   por entidad para construir la pagina /trash en el frontend.
// - purgeOldTrash(): borra fisicamente lo que lleva > 30 dias en papelera.
//   Lo corre el scheduler diario.
// ============================================================
import { query } from '../config/db.js';

// Tablas con soft-delete. Mismo set que la migration soft_delete.sql.
export const SOFT_DELETE_TABLES = [
  'transactions', 'debts', 'debt_payments', 'debt_templates',
  'loans', 'loan_payments', 'subscriptions', 'subscription_charges',
  'receivables', 'payables', 'goals', 'goal_contributions',
  'notes', 'beneficiaries', 'banks', 'accounts', 'cards',
  'external_cards', 'categories',
];

const PURGE_AFTER_DAYS = 30;

/**
 * Lista TODAS las filas con deleted_at IS NOT NULL del workspace dado,
 * agrupadas por tabla. Limit per-table: 50 (mas que eso, el usuario
 * deberia vaciar papelera).
 */
export async function listGlobalTrash(workspaceId) {
  const out = {};
  for (const tbl of SOFT_DELETE_TABLES) {
    try {
      const r = await query(
        `SELECT * FROM ${tbl}
         WHERE workspace_id = $1 AND deleted_at IS NOT NULL
         ORDER BY deleted_at DESC
         LIMIT 50`,
        [workspaceId]
      );
      if (r.rowCount > 0) out[tbl] = r.rows;
    } catch (e) {
      // Tabla puede no tener deleted_at todavia (migration pendiente). Skip.
      console.debug(`[trash] skip ${tbl}:`, e.message);
    }
  }
  return out;
}

/**
 * Cuenta cuantos items hay en papelera por tabla. Util para el badge.
 */
export async function countGlobalTrash(workspaceId) {
  const out = {};
  let total = 0;
  for (const tbl of SOFT_DELETE_TABLES) {
    try {
      const r = await query(
        `SELECT COUNT(*) as c FROM ${tbl}
         WHERE workspace_id = $1 AND deleted_at IS NOT NULL`,
        [workspaceId]
      );
      const n = parseInt(r.rows[0].c, 10);
      if (n > 0) { out[tbl] = n; total += n; }
    } catch {}
  }
  return { total, byTable: out };
}

/**
 * Vacia COMPLETAMENTE la papelera del workspace dado (DELETE fisico).
 */
export async function emptyTrash(workspaceId) {
  let removed = 0;
  for (const tbl of SOFT_DELETE_TABLES) {
    try {
      const r = await query(
        `DELETE FROM ${tbl} WHERE workspace_id = $1 AND deleted_at IS NOT NULL`,
        [workspaceId]
      );
      removed += r.rowCount;
    } catch (e) {
      console.warn(`[trash-empty] ${tbl}:`, e.message);
    }
  }
  return { removed };
}

/**
 * Cron job: purga items con deleted_at > 30 dias.
 * Borra fisicamente con DELETE. Loguea totales por tabla.
 */
export async function purgeOldTrash() {
  console.log(`[trash-purge] iniciando purga de items con > ${PURGE_AFTER_DAYS} dias en papelera`);
  const summary = {};
  let total = 0;
  for (const tbl of SOFT_DELETE_TABLES) {
    try {
      const r = await query(
        `DELETE FROM ${tbl}
         WHERE deleted_at IS NOT NULL
           AND deleted_at < NOW() - INTERVAL '${PURGE_AFTER_DAYS} days'`,
        []
      );
      if (r.rowCount > 0) { summary[tbl] = r.rowCount; total += r.rowCount; }
    } catch (e) {
      console.warn(`[trash-purge] ${tbl}:`, e.message);
    }
  }
  console.log(`[trash-purge] OK - ${total} filas removidas`, summary);
  return { total, byTable: summary };
}

export default { listGlobalTrash, countGlobalTrash, emptyTrash, purgeOldTrash, SOFT_DELETE_TABLES };
