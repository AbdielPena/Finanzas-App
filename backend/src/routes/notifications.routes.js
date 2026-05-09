// ============================================================
// Notifications routes — preferencias y triggers manuales
// ============================================================
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../config/db.js';
import { authRequired } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  generateAlertsForWorkspace,
  sendDailySummaryFor,
} from '../services/notifications.service.js';
import { sendPushTo, isPushAvailable } from '../services/push.service.js';

const router = Router();
router.use(authRequired);

// Rate limit per-user para los endpoints que envian email/push.
// Sin esto un user (o un script malicioso con su token) podia spammear
// a si mismo o saturar SMTP/FCM con miles de requests.
const sendLimiter = rateLimit({
  windowMs: 60_000,            // 1 minuto
  max: 10,                     // hasta 10 envios por minuto por usuario
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limit_exceeded' },
  keyGenerator: (req) => req.user?.id || req.ip,
});

const PREF_FIELDS = [
  'email_enabled', 'push_enabled', 'in_app_enabled',
  'daily_summary', 'weekly_summary',
  'alert_payments', 'alert_subscriptions', 'alert_debts', 'alert_card_usage',
  'card_usage_threshold', 'anticipation_days',
  'quiet_hours_start', 'quiet_hours_end',
  'push_token',
];

// ---------- GET /notification-preferences ----------
router.get('/preferences', async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM notification_preferences WHERE user_id = $1', [req.user.id]);
    if (r.rowCount > 0) return res.json({ data: r.rows[0] });
    // Crea defaults
    const ins = await query(
      `INSERT INTO notification_preferences (user_id) VALUES ($1) RETURNING *`,
      [req.user.id]
    );
    res.json({ data: ins.rows[0] });
  } catch (e) { next(e); }
});

// ---------- PATCH /notification-preferences ----------
router.patch('/preferences', async (req, res, next) => {
  try {
    const updates = [];
    const params = [];
    for (const f of PREF_FIELDS) {
      if (req.body[f] !== undefined) {
        params.push(req.body[f]);
        updates.push(`${f} = $${params.length}`);
      }
    }
    if (updates.length === 0) {
      return res.json({ data: null, unchanged: true });
    }
    params.push(req.user.id);
    const r = await query(
      `INSERT INTO notification_preferences (user_id) VALUES ($${params.length})
       ON CONFLICT (user_id) DO UPDATE SET ${updates.join(', ')}
       RETURNING *`,
      params
    );
    res.json({ data: r.rows[0] });
  } catch (e) { next(e); }
});

// ---------- POST /notification/trigger-alerts (manual scan) ----------
router.post('/trigger-alerts', sendLimiter, async (req, res, next) => {
  try {
    const wsId = req.headers['x-workspace-id'];
    if (!wsId) throw new HttpError(400, 'Falta X-Workspace-Id');
    // Verifica que el usuario pertenezca al workspace antes de disparar
    // alertas para ese tenant. Sin esto cualquier user autenticado podia
    // forzar el envio de notificaciones de cualquier workspace.
    const m = await query(
      `SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 LIMIT 1`,
      [wsId, req.user.id]
    );
    if (m.rowCount === 0) throw new HttpError(403, 'No eres miembro de este workspace');
    await generateAlertsForWorkspace(wsId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- POST /notification/send-summary (manual) ----------
router.post('/send-summary', sendLimiter, async (req, res, next) => {
  try {
    await sendDailySummaryFor(req.user.id);
    res.json({ ok: true, message: 'Resumen enviado a tu email' });
  } catch (e) { next(e); }
});

// ---------- POST /notifications/test-push (envia un push al device del usuario) ----------
router.post('/test-push', sendLimiter, async (req, res, next) => {
  try {
    const available = await isPushAvailable();
    if (!available) {
      return res.json({ ok: false, reason: 'firebase_not_configured', available });
    }
    const r = await query(
      'SELECT push_token FROM notification_preferences WHERE user_id = $1',
      [req.user.id]
    );
    const tk = r.rows[0]?.push_token;
    if (!tk) {
      return res.json({ ok: false, reason: 'no_device_token_registered', hint: 'Abre la APK Android, permite notificaciones, y reintenta.' });
    }
    const result = await sendPushTo(tk, {
      title: 'FinanzApp - Test',
      body: 'Si ves esto, las notificaciones push funcionan',
      data: { route: '/dashboard', tipo: 'test' },
    });
    res.json({ ok: true, result });
  } catch (e) { next(e); }
});

// ---------- GET /notification/log (historial de envios) ----------
router.get('/log', async (req, res, next) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const r = await query(
      `SELECT * FROM notification_log WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [req.user.id, limit]
    );
    res.json({ data: r.rows });
  } catch (e) { next(e); }
});

export default router;
