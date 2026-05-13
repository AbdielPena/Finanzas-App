// ============================================================
// Workspaces & members
// ============================================================
import { Router } from 'express';
import { query, getClient } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.use(authRequired);

// ---------- GET /workspaces (mios) ----------
router.get('/', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT w.id, w.nombre, w.mode, wm.rol, w.plan_id, p.codigo as plan_codigo, p.nombre as plan_nombre
       FROM workspace_members wm
       JOIN workspaces w ON w.id = wm.workspace_id
       LEFT JOIN plans p ON p.id = w.plan_id
       WHERE wm.user_id = $1 AND w.deleted_at IS NULL
       ORDER BY wm.created_at ASC`,
      [req.user.id]
    );
    res.json({ data: r.rows });
  } catch (e) { next(e); }
});

// ---------- PATCH /workspaces/:id/mode ----------
// Cambiar entre PERSONAL / BUSINESS / HYBRID
router.patch('/:id/mode', async (req, res, next) => {
  try {
    const memR = await query(
      `SELECT rol FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (memR.rowCount === 0 || !['owner', 'admin'].includes(memR.rows[0].rol)) {
      throw new HttpError(403, 'Sin permiso');
    }

    const mode = String(req.body?.mode || '').toUpperCase();
    if (!['PERSONAL', 'BUSINESS', 'HYBRID'].includes(mode)) {
      throw new HttpError(400, 'Modo inválido. Usa PERSONAL, BUSINESS o HYBRID');
    }

    const r = await query(
      `UPDATE workspaces SET mode = $1 WHERE id = $2 RETURNING id, nombre, mode`,
      [mode, req.params.id]
    );
    if (r.rowCount === 0) throw new HttpError(404, 'Workspace no existe');
    res.json({ data: r.rows[0] });
  } catch (e) { next(e); }
});

// ---------- POST /workspaces ----------
router.post('/', async (req, res, next) => {
  try {
    const nombre = (req.body?.nombre || '').trim();
    if (nombre.length < 2) throw new HttpError(400, 'Nombre invalido');

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const wsR = await client.query(
        `INSERT INTO workspaces (nombre, owner_id, plan_id)
         VALUES ($1, $2, (SELECT id FROM plans WHERE codigo = 'free'))
         RETURNING id, nombre`,
        [nombre, req.user.id]
      );
      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, rol)
         VALUES ($1, $2, 'owner')`,
        [wsR.rows[0].id, req.user.id]
      );
      await client.query('COMMIT');
      res.status(201).json({ data: wsR.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) { next(e); }
});

// ---------- PATCH /workspaces/:id ----------
router.patch('/:id', async (req, res, next) => {
  try {
    const memR = await query(
      `SELECT rol FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (memR.rowCount === 0 || !['owner', 'admin'].includes(memR.rows[0].rol)) {
      throw new HttpError(403, 'Sin permiso');
    }

    const nombre = (req.body?.nombre || '').trim();
    if (!nombre) throw new HttpError(400, 'Nombre requerido');

    const r = await query(
      `UPDATE workspaces SET nombre = $1 WHERE id = $2 RETURNING id, nombre`,
      [nombre, req.params.id]
    );
    res.json({ data: r.rows[0] });
  } catch (e) { next(e); }
});

// ---------- GET /workspaces/:id/members ----------
router.get('/:id/members', async (req, res, next) => {
  try {
    const memR = await query(
      `SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (memR.rowCount === 0) throw new HttpError(403, 'No eres miembro');

    const r = await query(
      `SELECT u.id, u.email, u.nombre, wm.rol, wm.created_at
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1
       ORDER BY wm.created_at ASC`,
      [req.params.id]
    );
    res.json({ data: r.rows });
  } catch (e) { next(e); }
});

// Helper: garantiza que el usuario sea miembro del workspace antes de
// leer/escribir cualquier dato. Sin esto cualquier user autenticado podia
// hacer IDOR sobre /workspaces/:id/settings de otro tenant.
async function requireWorkspaceMembership(req) {
  const m = await query(
    `SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 LIMIT 1`,
    [req.params.id, req.user.id]
  );
  if (m.rowCount === 0) throw new HttpError(403, 'No eres miembro de este workspace');
}

// ---------- GET /workspaces/:id/settings ----------
router.get('/:id/settings', async (req, res, next) => {
  try {
    await requireWorkspaceMembership(req);
    const r = await query(`SELECT data FROM workspace_settings WHERE workspace_id = $1`, [req.params.id]);
    res.json({ data: r.rows[0]?.data || {} });
  } catch (e) { next(e); }
});

// ---------- PUT /workspaces/:id/settings ----------
router.put('/:id/settings', async (req, res, next) => {
  try {
    await requireWorkspaceMembership(req);
    const data = req.body || {};
    await query(
      `INSERT INTO workspace_settings (workspace_id, data) VALUES ($1, $2)
       ON CONFLICT (workspace_id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [req.params.id, JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
