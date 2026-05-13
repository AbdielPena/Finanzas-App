// ============================================================
// CRUD para todas las entidades de negocio
// Generado a partir de la config en entities.config.js
// Cada entidad expone: GET / GET/:id / POST / PATCH/:id / DELETE/:id
// ============================================================
import { Router } from 'express';
import { makeCrud } from '../utils/crud.js';
import { authRequired, requireWorkspace } from '../middleware/auth.js';

const ENTITIES = [
  // --- core ---
  { path: 'banks',           table: 'banks',
    fields: ['nombre','color','icono'] },

  { path: 'accounts',        table: 'accounts',
    fields: ['banco_id','nombre','tipo','saldo_inicial','activa'] },

  { path: 'cards',           table: 'cards',
    fields: ['banco_id','nombre','limite_credito','limite_sobregiro','saldo_usado','tasa_interes','dia_corte','dia_pago','activa'] },

  { path: 'external-cards',  table: 'external_cards',
    fields: ['titular','banco','nombre','limite','saldo_usado','metadata'] },

  { path: 'categories',      table: 'categories',
    fields: ['nombre','tipo','emoji','color','es_sistema'] },

  { path: 'beneficiaries',   table: 'beneficiaries',
    fields: ['nombre','metadata'] },

  // --- transactions (the heart) ---
  { path: 'transactions',    table: 'transactions', orderBy: 'fecha DESC, created_at DESC',
    fields: ['tipo','monto','descripcion','fecha','categoria_id','cuenta_id','cuenta_destino_id','tarjeta_id','tipo_ingreso','cliente_asociado','aplica_diezmo','estado','notas','beneficiarios','is_business'],
    extraFilters: async (req, where, params) => {
      // Helpers de validacion de input (defensivas; los parametros van por
      // bind, pero un valor mal formado puede igual hacer fallar el query
      // con un mensaje confuso).
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
      const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);
      const isDate = (v) => typeof v === 'string' && DATE_RE.test(v);

      if (req.query.cuentaId && isUuid(req.query.cuentaId)) {
        params.push(req.query.cuentaId);
        where += ` AND (cuenta_id = $${params.length} OR cuenta_destino_id = $${params.length})`;
      }
      if (req.query.tarjetaId && isUuid(req.query.tarjetaId)) {
        params.push(req.query.tarjetaId);
        where += ` AND tarjeta_id = $${params.length}`;
      }
      if (req.query.categoriaId && isUuid(req.query.categoriaId)) {
        params.push(req.query.categoriaId);
        where += ` AND categoria_id = $${params.length}`;
      }
      if (req.query.tipo && ['ingreso','gasto','transferencia'].includes(req.query.tipo)) {
        params.push(req.query.tipo);
        where += ` AND tipo = $${params.length}`;
      }
      if (req.query.fechaDesde && isDate(req.query.fechaDesde)) {
        params.push(req.query.fechaDesde);
        where += ` AND fecha >= $${params.length}`;
      }
      if (req.query.fechaHasta && isDate(req.query.fechaHasta)) {
        params.push(req.query.fechaHasta);
        where += ` AND fecha <= $${params.length}`;
      }
      return { where, params };
    },
  },

  // --- subscriptions ---
  { path: 'subscriptions',   table: 'subscriptions',
    fields: ['nombre','monto','frecuencia','dia_cobro','cuenta_id','tarjeta_id','categoria_id','activa','metadata'] },

  { path: 'subscription-charges', table: 'subscription_charges', orderBy: 'fecha DESC',
    fields: ['subscription_id','fecha','monto','pagado','transaction_id'] },

  // --- debts / loans ---
  { path: 'debts',           table: 'debts',
    fields: ['acreedor','monto_original','saldo_pendiente','cuotas_total','cuotas_pagadas','monto_cuota','tasa_interes','fecha_inicio','fecha_proximo_pago','estado','metadata'] },

  { path: 'debt-payments',   table: 'debt_payments', orderBy: 'fecha DESC',
    fields: ['debt_id','monto','fecha','cuenta_id','transaction_id','notas'] },

  { path: 'debt-templates',  table: 'debt_templates',
    fields: ['nombre','configuracion'] },

  { path: 'loans',           table: 'loans',
    fields: ['deudor','monto_original','saldo_pendiente','fecha_inicio','metadata'] },

  { path: 'loan-payments',   table: 'loan_payments', orderBy: 'fecha DESC',
    fields: ['loan_id','monto','fecha','cuenta_id','transaction_id'] },

  { path: 'receivables',     table: 'receivables', orderBy: 'fecha_venc ASC',
    fields: ['cliente','monto','fecha_emision','fecha_venc','estado','notas'] },

  { path: 'payables',        table: 'payables', orderBy: 'fecha_venc ASC',
    fields: ['acreedor','monto','fecha_emision','fecha_venc','estado','notas'] },

  // --- goals & tithe ---
  { path: 'goals',           table: 'goals',
    fields: ['nombre','monto_objetivo','monto_actual','fecha_objetivo','cuenta_id','metadata'] },

  { path: 'goal-contributions', table: 'goal_contributions', orderBy: 'fecha DESC',
    fields: ['goal_id','monto','fecha','notas'] },

  { path: 'tithe',           table: 'tithe', orderBy: 'fecha DESC',
    fields: ['fecha','base_calculo','monto_diezmo','pagado','fecha_pago','notas'] },

  // --- misc ---
  { path: 'notes',           table: 'notes', orderBy: 'updated_at DESC',
    fields: ['titulo','contenido','metadata'] },

  { path: 'notifications',   table: 'notifications', orderBy: 'created_at DESC',
    fields: ['user_id','tipo','titulo','mensaje','leida','metadata'] },
];

export function mountEntities(app) {
  for (const ent of ENTITIES) {
    const router = makeCrud({
      table: ent.table,
      allowedFields: ent.fields,
      listOrderBy: ent.orderBy || 'created_at DESC',
      extraListFilters: ent.extraFilters,
      afterCreate: ent.path === 'transactions'
        ? async (row, req) => {
            // Studio Business Hub — emit expense.created sólo si es business
            try {
              if (row.tipo === 'gasto' && row.is_business === true && !row.external_reference) {
                const { emitToHub } = await import('../services/hub.service.js');
                void emitToHub('expense.created', {
                  externalReference: `finanzapp:transaction:${row.id}`,
                  payload: {
                    id: row.id,
                    workspace_id: row.workspace_id,
                    user_id: req.user?.id,
                    amount: Number(row.monto),
                    description: row.descripcion,
                    occurred_at: row.fecha,
                    client_name: row.cliente_asociado,
                    category_id: row.categoria_id,
                  },
                });
              }
            } catch (e) {
              console.warn('[entities] hub emit failed (non-fatal):', e?.message);
            }
          }
        : undefined,
    });
    app.use(`/api/v1/${ent.path}`, authRequired, requireWorkspace, router);
  }

  // Endpoint custom para marcar notificación como leída
  app.patch('/api/v1/notifications/:id/read', authRequired, requireWorkspace, async (req, res, next) => {
    try {
      const { query } = await import('../config/db.js');
      const r = await query(
        `UPDATE notifications SET leida = TRUE
         WHERE id = $1 AND workspace_id = $2 RETURNING *`,
        [req.params.id, req.workspaceId]
      );
      if (r.rowCount === 0) return res.status(404).json({ error: 'no encontrada' });
      res.json({ data: r.rows[0] });
    } catch (e) { next(e); }
  });

  console.log(`[api] ${ENTITIES.length} entidades CRUD montadas`);
}

export default mountEntities;
