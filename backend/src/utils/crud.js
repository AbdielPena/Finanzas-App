// ============================================================
// Generic CRUD factory
// Genera endpoints REST estándar para una entidad multi-tenant
// Uso:
//   const router = makeCrud({
//     table: 'banks',
//     allowedFields: ['nombre','color','icono'],
//     listOrderBy: 'created_at DESC',
//   });
//   app.use('/api/v1/banks', authRequired, requireWorkspace, router);
// ============================================================
import { Router } from 'express';
import { query } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Whitelist defensiva para listOrderBy. Aunque el valor viene de config interna
// (no de req.body), sanitizamos por seguridad: solo permite "<col> ASC|DESC"
// separados por coma.
const ORDER_BY_RE = /^[a-z_]+\s+(ASC|DESC)(\s*,\s*[a-z_]+\s+(ASC|DESC))*$/i;

export function makeCrud({
  table,
  allowedFields,
  listOrderBy = 'created_at DESC',
  beforeCreate,    // async (data, req) => data
  beforeUpdate,    // async (data, existing, req) => data
  afterCreate,     // async (row, req) => void
  afterUpdate,     // async (row, prev, req) => void
  afterRemove,     // async (row, req) => void
  scopeColumn = 'workspace_id',
  scopeFromReq = (req) => req.workspaceId,
  extraListFilters,// async (req, where, params) => { where, params }
}) {
  // Falla rapido si la config trae un orderBy raro — evita ejecutar SQL
  // arbitrario si alguien futuro pone una entidad con orderBy mal copiado.
  if (!ORDER_BY_RE.test(listOrderBy)) {
    throw new Error(`makeCrud: listOrderBy invalido para tabla ${table}: "${listOrderBy}"`);
  }
  const router = Router();

  // ---------- GET / (list, paginated) ----------
  router.get('/', async (req, res, next) => {
    try {
      const wsId = scopeFromReq(req);
      if (!wsId) throw new HttpError(400, 'Falta workspace');

      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
      const offset = (page - 1) * limit;

      let where = `WHERE ${scopeColumn} = $1`;
      let params = [wsId];

      if (extraListFilters) {
        const r = await extraListFilters(req, where, params);
        where = r.where;
        params = r.params;
      }

      const totalR = await query(`SELECT COUNT(*) as c FROM ${table} ${where}`, params);
      const total = parseInt(totalR.rows[0].c, 10);

      const rowsR = await query(
        `SELECT * FROM ${table} ${where} ORDER BY ${listOrderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      res.json({ data: rowsR.rows, total, page, limit });
    } catch (e) { next(e); }
  });

  // ---------- GET /:id ----------
  router.get('/:id', async (req, res, next) => {
    try {
      const wsId = scopeFromReq(req);
      if (!UUID_RE.test(req.params.id)) throw new HttpError(400, 'ID invalido');

      const r = await query(
        `SELECT * FROM ${table} WHERE id = $1 AND ${scopeColumn} = $2`,
        [req.params.id, wsId]
      );
      if (r.rowCount === 0) throw new HttpError(404, `${table} no encontrado`);
      res.json({ data: r.rows[0] });
    } catch (e) { next(e); }
  });

  // ---------- POST / ----------
  router.post('/', async (req, res, next) => {
    try {
      const wsId = scopeFromReq(req);
      if (!wsId) throw new HttpError(400, 'Falta workspace');

      let data = pickFields(req.body, allowedFields);
      if (beforeCreate) data = await beforeCreate(data, req);

      const fields = Object.keys(data);
      if (fields.length === 0) throw new HttpError(400, 'Sin datos para crear');

      const placeholders = fields.map((_, i) => `$${i + 1}`);
      const values = fields.map(f => data[f]);

      const r = await query(
        `INSERT INTO ${table} (${scopeColumn}, ${fields.join(', ')})
         VALUES ($${fields.length + 1}, ${placeholders.join(', ')})
         RETURNING *`,
        [...values, wsId]
      );
      const row = r.rows[0];
      if (afterCreate) await afterCreate(row, req);
      res.status(201).json({ data: row });
    } catch (e) { next(e); }
  });

  // ---------- PATCH /:id ----------
  router.patch('/:id', async (req, res, next) => {
    try {
      const wsId = scopeFromReq(req);
      if (!UUID_RE.test(req.params.id)) throw new HttpError(400, 'ID invalido');

      const existingR = await query(
        `SELECT * FROM ${table} WHERE id = $1 AND ${scopeColumn} = $2`,
        [req.params.id, wsId]
      );
      if (existingR.rowCount === 0) throw new HttpError(404, `${table} no encontrado`);

      let data = pickFields(req.body, allowedFields);
      if (beforeUpdate) data = await beforeUpdate(data, existingR.rows[0], req);

      const fields = Object.keys(data);
      if (fields.length === 0) {
        return res.json({ data: existingR.rows[0], unchanged: true });
      }

      const sets = fields.map((f, i) => `${f} = $${i + 1}`);
      const values = fields.map(f => data[f]);

      const r = await query(
        `UPDATE ${table} SET ${sets.join(', ')}
         WHERE id = $${fields.length + 1} AND ${scopeColumn} = $${fields.length + 2}
         RETURNING *`,
        [...values, req.params.id, wsId]
      );
      if (afterUpdate) await afterUpdate(r.rows[0], existingR.rows[0], req);
      res.json({ data: r.rows[0] });
    } catch (e) { next(e); }
  });

  // ---------- DELETE /:id ----------
  router.delete('/:id', async (req, res, next) => {
    try {
      const wsId = scopeFromReq(req);
      if (!UUID_RE.test(req.params.id)) throw new HttpError(400, 'ID invalido');

      const r = await query(
        `DELETE FROM ${table} WHERE id = $1 AND ${scopeColumn} = $2 RETURNING *`,
        [req.params.id, wsId]
      );
      if (r.rowCount === 0) throw new HttpError(404, `${table} no encontrado`);
      if (afterRemove) await afterRemove(r.rows[0], req);
      res.json({ ok: true, deleted: r.rows[0].id });
    } catch (e) { next(e); }
  });

  return router;
}

function pickFields(body, allowed) {
  if (!body || typeof body !== 'object') return {};
  const out = {};
  for (const f of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      out[f] = body[f];
    }
  }
  return out;
}
