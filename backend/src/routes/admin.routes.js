// ============================================================
// Admin endpoints — solo para is_super_admin
// ============================================================
import { Router } from 'express';
import { query } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { authRequired, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authRequired, requireSuperAdmin);

// ---------- GET /admin/users ----------
router.get('/users', async (req, res, next) => {
  try {
    const search = (req.query.search || '').toLowerCase().trim();
    let where = '';
    let params = [];
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE LOWER(email) LIKE $1 OR LOWER(nombre) LIKE $1`;
    }
    const r = await query(
      `SELECT id, email, nombre, is_super_admin, estado, ultimo_acceso, email_verified, created_at,
              (SELECT COUNT(*) FROM workspace_members WHERE user_id = users.id) as workspaces_count
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT 200`,
      params
    );
    res.json({ data: r.rows });
  } catch (e) { next(e); }
});

// ---------- PATCH /admin/users/:id/status ----------
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { estado } = req.body || {};
    if (!['activo', 'suspendido', 'inactivo'].includes(estado)) {
      throw new HttpError(400, 'Estado invalido');
    }
    const r = await query(
      `UPDATE users SET estado = $1 WHERE id = $2 RETURNING id, email, estado`,
      [estado, req.params.id]
    );
    if (r.rowCount === 0) throw new HttpError(404, 'Usuario no encontrado');

    await query(
      `INSERT INTO audit_logs (actor_user_id, accion, target_type, target_id, metadata, ip)
       VALUES ($1, 'user_status_changed', 'user', $2, $3, $4)`,
      [req.user.id, req.params.id, JSON.stringify({ estado }), req.ip]
    );

    // Si suspendido, revocar todas sus sesiones
    if (estado !== 'activo') {
      await query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
        [req.params.id]
      );
    }

    res.json({ data: r.rows[0] });
  } catch (e) { next(e); }
});

// ---------- POST /admin/users/:id/force-reset-password ----------
router.post('/users/:id/force-reset-password', async (req, res, next) => {
  try {
    const { newPassword, requireChange } = req.body || {};
    // Coincide con el minimo del registro normal (auth.routes.js usa 8).
    // Antes admite 6 lo cual rompia la regla de robustez.
    if (!newPassword || newPassword.length < 8) {
      throw new HttpError(400, 'La contrasena debe tener al menos 8 caracteres');
    }
    const argonMod = await import('argon2');
    const argon2 = argonMod.default || argonMod;
    const hash = await argon2.hash(newPassword, { type: argon2.argon2id });

    const r = await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, nombre`,
      [hash, req.params.id]
    );
    if (r.rowCount === 0) throw new HttpError(404, 'Usuario no encontrado');

    // Si requireChange fue solicitado, revoca todas las sesiones del usuario.
    // (esto lo fuerza a hacer login con la nueva contrasena de inmediato)
    if (requireChange !== false) {
      await query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
        [req.params.id]
      );
    }

    await query(
      `INSERT INTO audit_logs (actor_user_id, accion, target_type, target_id, metadata, ip)
       VALUES ($1, 'force_reset_password', 'user', $2, $3, $4)`,
      [req.user.id, req.params.id, JSON.stringify({ requireChange: requireChange !== false }), req.ip]
    );

    res.json({ ok: true, data: r.rows[0] });
  } catch (e) { next(e); }
});

// ---------- POST /admin/users/:id/terminate-sessions ----------
router.post('/users/:id/terminate-sessions', async (req, res, next) => {
  try {
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.params.id]
    );
    await query(
      `INSERT INTO audit_logs (actor_user_id, accion, target_type, target_id, ip)
       VALUES ($1, 'sessions_terminated', 'user', $2, $3)`,
      [req.user.id, req.params.id, req.ip]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- GET /admin/audit-logs ----------
router.get('/audit-logs', async (req, res, next) => {
  try {
    const limit = Math.min(500, parseInt(req.query.limit, 10) || 100);
    const r = await query(
      `SELECT al.*, u.email as actor_email, u.nombre as actor_nombre
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ data: r.rows });
  } catch (e) { next(e); }
});

// ---------- GET /admin/plans ----------
router.get('/plans', async (req, res, next) => {
  try {
    const r = await query(`SELECT * FROM plans ORDER BY precio_mensual ASC`);
    res.json({ data: r.rows });
  } catch (e) { next(e); }
});

// ---------- POST /admin/plans ----------
router.post('/plans', async (req, res, next) => {
  try {
    const { codigo, nombre, precio_mensual, limites, features, activo } = req.body || {};
    if (!codigo || !nombre) throw new HttpError(400, 'Faltan campos');

    const r = await query(
      `INSERT INTO plans (codigo, nombre, precio_mensual, limites, features, activo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [codigo, nombre, precio_mensual || 0, JSON.stringify(limites || {}), JSON.stringify(features || {}), activo !== false]
    );
    res.status(201).json({ data: r.rows[0] });
  } catch (e) { next(e); }
});

// ---------- PATCH /admin/plans/:id ----------
router.patch('/plans/:id', async (req, res, next) => {
  try {
    const updates = [];
    const params = [];
    const map = { nombre: 'nombre', precio_mensual: 'precio_mensual', activo: 'activo' };
    for (const [k, col] of Object.entries(map)) {
      if (req.body[k] !== undefined) {
        params.push(req.body[k]);
        updates.push(`${col} = $${params.length}`);
      }
    }
    if (req.body.limites !== undefined) {
      params.push(JSON.stringify(req.body.limites));
      updates.push(`limites = $${params.length}`);
    }
    if (req.body.features !== undefined) {
      params.push(JSON.stringify(req.body.features));
      updates.push(`features = $${params.length}`);
    }
    if (updates.length === 0) throw new HttpError(400, 'Sin cambios');
    params.push(req.params.id);
    const r = await query(
      `UPDATE plans SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (r.rowCount === 0) throw new HttpError(404, 'Plan no encontrado');
    res.json({ data: r.rows[0] });
  } catch (e) { next(e); }
});

// ---------- GET /admin/stats ----------
router.get('/stats', async (req, res, next) => {
  try {
    const [users, workspaces, txCount] = await Promise.all([
      query(`SELECT estado, COUNT(*)::int as c FROM users GROUP BY estado`),
      query(`SELECT COUNT(*)::int as c FROM workspaces WHERE deleted_at IS NULL`),
      query(`SELECT COUNT(*)::int as c FROM transactions`),
    ]);
    res.json({
      users: users.rows,
      workspaces_total: workspaces.rows[0].c,
      transactions_total: txCount.rows[0].c,
    });
  } catch (e) { next(e); }
});

export default router;
