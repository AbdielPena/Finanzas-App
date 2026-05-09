// ============================================================
// Trash routes — papelera global del workspace
// ============================================================
import { Router } from 'express';
import { authRequired, requireWorkspace } from '../middleware/auth.js';
import { listGlobalTrash, countGlobalTrash, emptyTrash } from '../services/trash.service.js';

const router = Router();
router.use(authRequired, requireWorkspace);

// ---------- GET /trash ----------
// Lista todos los items soft-deleted del workspace, agrupados por tabla.
router.get('/', async (req, res, next) => {
  try {
    const data = await listGlobalTrash(req.workspaceId);
    res.json({ data });
  } catch (e) { next(e); }
});

// ---------- GET /trash/count ----------
// Cuenta total + breakdown por tabla. Util para el badge.
router.get('/count', async (req, res, next) => {
  try {
    const c = await countGlobalTrash(req.workspaceId);
    res.json({ data: c });
  } catch (e) { next(e); }
});

// ---------- DELETE /trash ----------
// Vacia la papelera completa (DELETE fisico de todo el workspace).
router.delete('/', async (req, res, next) => {
  try {
    const r = await emptyTrash(req.workspaceId);
    res.json({ ok: true, ...r });
  } catch (e) { next(e); }
});

export default router;
