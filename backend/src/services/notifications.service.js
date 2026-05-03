// ============================================================
// Notifications Service
// - Genera notificaciones in-app a partir del estado de los datos
// - Despacha emails y push (cuando esten configurados) segun prefs
// - Loguea todo en notification_log para auditoria
// ============================================================
import { query } from '../config/db.js';
import { sendNotificationEmail, sendDailySummaryEmail } from './email.service.js';

// ---------- Helpers ----------
function daysBetween(target) {
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  return Math.floor((t - today) / 86400000);
}

async function logDispatch({ user_id, workspace_id, channel, tipo, titulo, body, status = 'sent', error = null, metadata = null }) {
  try {
    await query(
      `INSERT INTO notification_log (user_id, workspace_id, channel, tipo, titulo, body, status, error, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [user_id, workspace_id, channel, tipo, titulo, body || null, status, error, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (e) {
    console.warn('[notif-log] error guardando log:', e.message);
  }
}

async function getUserPreferences(userId) {
  const r = await query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
  if (r.rowCount > 0) return r.rows[0];
  // crea defaults
  const ins = await query(
    `INSERT INTO notification_preferences (user_id) VALUES ($1) RETURNING *`,
    [userId]
  );
  return ins.rows[0];
}

// ---------- Crea notificacion in-app ----------
export async function createInAppNotification({ workspace_id, user_id, tipo, titulo, mensaje, metadata = null }) {
  // Evita duplicados (misma referencia activa sin leer)
  if (metadata?.referencia_id) {
    const existing = await query(
      `SELECT id FROM notifications WHERE workspace_id = $1 AND tipo = $2 AND leida = FALSE
       AND metadata->>'referencia_id' = $3`,
      [workspace_id, tipo, metadata.referencia_id]
    );
    if (existing.rowCount > 0) return null;
  }

  const r = await query(
    `INSERT INTO notifications (workspace_id, user_id, tipo, titulo, mensaje, metadata)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [workspace_id, user_id, tipo, titulo, mensaje, metadata ? JSON.stringify(metadata) : null]
  );
  if (user_id) {
    await logDispatch({ user_id, workspace_id, channel: 'in_app', tipo, titulo, body: mensaje });
  }
  return r.rows[0];
}

// ---------- Notificacion completa: in-app + email + push (segun prefs) ----------
export async function notify({ workspace_id, user_id, tipo, titulo, mensaje, level = 'info', metadata = null }) {
  // 1) in-app siempre
  const created = await createInAppNotification({ workspace_id, user_id, tipo, titulo, mensaje, metadata });

  if (!user_id) return created;

  // 2) email + push segun preferencias del usuario
  try {
    const prefs = await getUserPreferences(user_id);

    // filtros por tipo
    const tipoMap = {
      payment: prefs.alert_payments,
      subscription: prefs.alert_subscriptions,
      debt: prefs.alert_debts,
      card: prefs.alert_card_usage,
    };
    if (tipo in tipoMap && !tipoMap[tipo]) return created;

    // Email
    if (prefs.email_enabled && (level === 'critical' || level === 'warning')) {
      const userR = await query('SELECT email, nombre FROM users WHERE id = $1', [user_id]);
      if (userR.rowCount > 0) {
        try {
          await sendNotificationEmail(userR.rows[0].email, { titulo, mensaje });
          await logDispatch({ user_id, workspace_id, channel: 'email', tipo, titulo, body: mensaje });
        } catch (e) {
          await logDispatch({ user_id, workspace_id, channel: 'email', tipo, titulo, body: mensaje, status: 'failed', error: e.message });
        }
      }
    }

    // Push (placeholder - requiere FCM setup en Fase B)
    if (prefs.push_enabled && prefs.push_token) {
      // TODO: integrar FCM (firebase admin)
    }
  } catch (e) {
    console.warn('[notify] error procesando preferencias:', e.message);
  }

  return created;
}

// ---------- Generador: escanea entidades y crea notificaciones donde toca ----------
export async function generateAlertsForWorkspace(workspace_id) {
  // Determinar el owner del workspace para enviarle email/push
  const ownerR = await query(
    `SELECT u.id as user_id, u.email, u.nombre
     FROM workspaces w JOIN users u ON u.id = w.owner_id WHERE w.id = $1`,
    [workspace_id]
  );
  const owner = ownerR.rows[0];
  if (!owner) return;

  let prefs;
  try {
    prefs = await getUserPreferences(owner.user_id);
  } catch {
    prefs = { card_usage_threshold: 80, anticipation_days: 3 };
  }

  // 1. Tarjetas con uso alto
  const cards = await query(
    `SELECT id, nombre, limite_credito, saldo_usado, dia_pago, dia_corte
     FROM cards WHERE workspace_id = $1 AND activa = TRUE`,
    [workspace_id]
  );
  for (const c of cards.rows) {
    const limite = parseFloat(c.limite_credito) || 0;
    const usado = parseFloat(c.saldo_usado) || 0;
    if (limite > 0) {
      const pct = (usado / limite) * 100;
      if (pct >= prefs.card_usage_threshold) {
        await notify({
          workspace_id,
          user_id: owner.user_id,
          tipo: 'card',
          titulo: `Tarjeta al ${Math.round(pct)}%: ${c.nombre}`,
          mensaje: `Has usado ${Math.round(pct)}% del límite. Considera bajar el saldo.`,
          level: pct >= 90 ? 'critical' : 'warning',
          metadata: { referencia_id: c.id + '_usage' },
        });
      }
    }
  }

  // 2. Cuentas por pagar próximas a vencer
  const payables = await query(
    `SELECT id, acreedor, monto, fecha_venc FROM payables
     WHERE workspace_id = $1 AND estado = 'pendiente'`,
    [workspace_id]
  );
  for (const p of payables.rows) {
    const days = daysBetween(p.fecha_venc);
    if (days !== null && days >= 0 && days <= prefs.anticipation_days) {
      await notify({
        workspace_id,
        user_id: owner.user_id,
        tipo: 'payment',
        titulo: `Pago próximo: ${p.acreedor}`,
        mensaje: `Vence en ${days === 0 ? 'hoy' : days + ' días'} — RD$${p.monto}`,
        level: days <= 1 ? 'critical' : 'warning',
        metadata: { referencia_id: p.id + '_venc' },
      });
    }
  }

  // 3. Cuentas por cobrar vencidas
  const recvs = await query(
    `SELECT id, cliente, monto, fecha_venc FROM receivables
     WHERE workspace_id = $1 AND estado = 'pendiente' AND fecha_venc < CURRENT_DATE`,
    [workspace_id]
  );
  for (const r of recvs.rows) {
    await notify({
      workspace_id,
      user_id: owner.user_id,
      tipo: 'receivable',
      titulo: `Vencida: ${r.cliente}`,
      mensaje: `La cuenta por cobrar venció el ${r.fecha_venc}`,
      level: 'warning',
      metadata: { referencia_id: r.id + '_overdue' },
    });
  }

  // 4. Suscripciones próximas a cobrar
  const subs = await query(
    `SELECT s.id, s.nombre, s.monto, s.dia_cobro
     FROM subscriptions s
     WHERE s.workspace_id = $1 AND s.activa = TRUE AND s.dia_cobro IS NOT NULL`,
    [workspace_id]
  );
  const now = new Date();
  const currDay = now.getDate();
  for (const s of subs.rows) {
    const remaining = s.dia_cobro >= currDay ? s.dia_cobro - currDay : null;
    if (remaining !== null && remaining <= prefs.anticipation_days) {
      await notify({
        workspace_id,
        user_id: owner.user_id,
        tipo: 'subscription',
        titulo: `Cobro próximo: ${s.nombre}`,
        mensaje: `Se cobrará en ${remaining === 0 ? 'hoy' : remaining + ' días'} — RD$${s.monto}`,
        level: 'info',
        metadata: { referencia_id: s.id + '_due' },
      });
    }
  }
}

// ---------- Resumen diario por email ----------
export async function sendDailySummaryFor(user_id) {
  try {
    const userR = await query('SELECT email, nombre FROM users WHERE id = $1 AND estado = $2', [user_id, 'activo']);
    if (userR.rowCount === 0) return;
    const user = userR.rows[0];

    const prefs = await getUserPreferences(user_id);
    if (!prefs.daily_summary || !prefs.email_enabled) return;

    // Workspace principal del usuario
    const wsR = await query(
      `SELECT w.id FROM workspace_members wm JOIN workspaces w ON w.id = wm.workspace_id
       WHERE wm.user_id = $1 AND w.deleted_at IS NULL ORDER BY wm.created_at LIMIT 1`,
      [user_id]
    );
    if (wsR.rowCount === 0) return;
    const wsId = wsR.rows[0].id;

    // Saldos
    const saldoR = await query(
      `SELECT COALESCE(SUM(saldo_inicial), 0) as total FROM accounts WHERE workspace_id = $1 AND activa = TRUE`,
      [wsId]
    );
    const ingR = await query(
      `SELECT COALESCE(SUM(monto), 0) as total FROM transactions
       WHERE workspace_id = $1 AND tipo = 'ingreso'
       AND fecha >= date_trunc('month', CURRENT_DATE)`,
      [wsId]
    );
    const gasR = await query(
      `SELECT COALESCE(SUM(monto), 0) as total FROM transactions
       WHERE workspace_id = $1 AND tipo = 'gasto'
       AND fecha >= date_trunc('month', CURRENT_DATE)`,
      [wsId]
    );
    const proxR = await query(
      `SELECT acreedor as descripcion, monto, fecha_venc as fecha FROM payables
       WHERE workspace_id = $1 AND estado = 'pendiente'
         AND fecha_venc BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       ORDER BY fecha_venc LIMIT 5`,
      [wsId]
    );
    const alertasR = await query(
      `SELECT titulo FROM notifications WHERE workspace_id = $1 AND leida = FALSE
       ORDER BY created_at DESC LIMIT 5`,
      [wsId]
    );

    await sendDailySummaryEmail(user.email, {
      nombre: user.nombre,
      summary: {
        saldo_total: saldoR.rows[0].total,
        ingresos_mes: ingR.rows[0].total,
        gastos_mes: gasR.rows[0].total,
        proximos_pagos: proxR.rows,
        alertas: alertasR.rows.map(a => a.titulo),
      },
    });
    await logDispatch({ user_id, workspace_id: wsId, channel: 'email', tipo: 'daily_summary', titulo: 'Resumen diario' });
  } catch (e) {
    console.warn('[daily-summary] error para usuario', user_id, e.message);
  }
}

// ---------- Job: corre todos los workspaces y todos los usuarios ----------
export async function runScheduledAlertsJob() {
  console.log('[scheduler] generando alertas para todos los workspaces...');
  const wsR = await query('SELECT id FROM workspaces WHERE deleted_at IS NULL');
  for (const ws of wsR.rows) {
    try {
      await generateAlertsForWorkspace(ws.id);
    } catch (e) {
      console.warn('[scheduler] error workspace', ws.id, e.message);
    }
  }
  console.log(`[scheduler] alertas generadas para ${wsR.rowCount} workspaces`);
}

export async function runDailySummaryJob() {
  console.log('[scheduler] enviando resumenes diarios...');
  const usersR = await query('SELECT id FROM users WHERE estado = $1', ['activo']);
  for (const u of usersR.rows) {
    await sendDailySummaryFor(u.id);
  }
  console.log(`[scheduler] resumenes procesados: ${usersR.rowCount} usuarios`);
}

export default {
  notify,
  createInAppNotification,
  generateAlertsForWorkspace,
  sendDailySummaryFor,
  runScheduledAlertsJob,
  runDailySummaryJob,
};
