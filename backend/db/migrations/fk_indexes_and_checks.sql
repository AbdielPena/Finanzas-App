-- Migration idempotente — se aplica automaticamente al arranque del backend
-- (auto-migrate.js corre todos los .sql de este directorio).
--
-- Cubre dos clases de problema detectadas en la auditoria:
--   1. Foreign keys sin indice -> queries WHERE workspace_id = ? hacian
--      full table scans sobre tablas que crecen rapido.
--   2. Columnas TEXT con valores enumerables sin CHECK constraint ->
--      el frontend podia escribir strings invalidos y dejar la BD inconsistente.

-- ---------- Indices en FK que faltaban ----------
CREATE INDEX IF NOT EXISTS idx_sub_charges_ws         ON subscription_charges(workspace_id);
CREATE INDEX IF NOT EXISTS idx_goal_contrib_ws        ON goal_contributions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_loan_pay_ws            ON loan_payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_loan_pay_loan          ON loan_payments(loan_id);

-- Indices auxiliares para queries comunes
CREATE INDEX IF NOT EXISTS idx_transactions_ws_fecha  ON transactions(workspace_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_debts_ws_estado        ON debts(workspace_id, estado);
CREATE INDEX IF NOT EXISTS idx_payables_ws_venc       ON payables(workspace_id, fecha_venc);
CREATE INDEX IF NOT EXISTS idx_receivables_ws_venc    ON receivables(workspace_id, fecha_venc);

-- ---------- CHECK constraints de integridad ----------
-- DO $$ ... $$ permite agregar constraints idempotentemente sin error si ya existen.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_debts_estado'
  ) THEN
    ALTER TABLE debts ADD CONSTRAINT check_debts_estado
      CHECK (estado IN ('activa','pagada','cancelada','suspendida'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_subs_frecuencia'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT check_subs_frecuencia
      CHECK (frecuencia IN ('mensual','anual','semanal','quincenal','diaria'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_tx_tipo_ingreso'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT check_tx_tipo_ingreso
      CHECK (tipo_ingreso IS NULL OR tipo_ingreso IN ('personal','cliente','salario','prestamo','otro'));
  END IF;
END $$;
