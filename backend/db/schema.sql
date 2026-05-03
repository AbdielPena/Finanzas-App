-- ============================================================
-- FinanzApp — PostgreSQL Schema v1
-- ============================================================
-- Convenciones:
--   - PK = uuid v4 generada en server o `gen_random_uuid()`
--   - Multi-tenant: toda tabla de negocio tiene workspace_id
--   - Soft delete: deleted_at TIMESTAMPTZ NULL en tablas relevantes
--   - Timestamps: created_at, updated_at en TODAS las tablas
--   - Dinero: NUMERIC(14,2) — NUNCA float
--   - JSONB para metadata flexible y settings
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ============================================================
-- 1. TENANCY & AUTH
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  nombre          TEXT NOT NULL,
  is_super_admin  BOOLEAN NOT NULL DEFAULT FALSE,
  estado          TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','suspendido','inactivo')),
  ultimo_acceso   TIMESTAMPTZ,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_estado ON users(estado);

CREATE TABLE workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  plan_id         UUID,  -- FK a plans, agregada después
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);

CREATE TABLE workspace_members (
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rol             TEXT NOT NULL CHECK (rol IN ('owner','admin','editor','viewer')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX idx_ws_members_user ON workspace_members(user_id);

CREATE TABLE refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,  -- SHA-256 del refresh token
  user_agent      TEXT,
  ip              INET,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  accion          TEXT NOT NULL,
  target_type     TEXT,
  target_id       UUID,
  metadata        JSONB,
  ip              INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- 2. BILLING / PLANS
-- ============================================================

CREATE TABLE plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          TEXT NOT NULL UNIQUE,           -- 'free', 'pro', 'enterprise'
  nombre          TEXT NOT NULL,
  precio_mensual  NUMERIC(10,2) NOT NULL DEFAULT 0,
  limites         JSONB NOT NULL DEFAULT '{}',    -- max_accounts, max_cards, etc.
  features        JSONB NOT NULL DEFAULT '{}',
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE workspaces
  ADD CONSTRAINT fk_workspace_plan FOREIGN KEY (plan_id) REFERENCES plans(id);

-- ============================================================
-- 3. CORE FINANCIAL ENTITIES
-- ============================================================

CREATE TABLE banks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  color           TEXT,
  icono           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_banks_ws ON banks(workspace_id);

CREATE TABLE accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  banco_id        UUID NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,
  nombre          TEXT NOT NULL,
  tipo            TEXT,                           -- 'ahorro' | 'corriente' | 'nomina'
  saldo_inicial   NUMERIC(14,2) NOT NULL DEFAULT 0,
  activa          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_accounts_ws ON accounts(workspace_id);
CREATE INDEX idx_accounts_bank ON accounts(banco_id);

CREATE TABLE cards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  banco_id          UUID REFERENCES banks(id) ON DELETE SET NULL,
  nombre            TEXT NOT NULL,
  limite_credito    NUMERIC(14,2) NOT NULL DEFAULT 0,
  limite_sobregiro  NUMERIC(14,2),
  saldo_usado       NUMERIC(14,2) NOT NULL DEFAULT 0,
  tasa_interes      NUMERIC(5,2),
  dia_corte         SMALLINT CHECK (dia_corte BETWEEN 1 AND 31),
  dia_pago          SMALLINT CHECK (dia_pago BETWEEN 1 AND 31),
  activa            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cards_ws ON cards(workspace_id);

CREATE TABLE external_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  titular         TEXT NOT NULL,
  banco           TEXT,
  nombre          TEXT NOT NULL,
  limite          NUMERIC(14,2),
  saldo_usado     NUMERIC(14,2) NOT NULL DEFAULT 0,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_extcards_ws ON external_cards(workspace_id);

CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('ingreso','gasto','ambos')),
  emoji           TEXT,
  color           TEXT,
  es_sistema      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, nombre)
);
CREATE INDEX idx_categories_ws ON categories(workspace_id);

CREATE TABLE beneficiaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, nombre)
);
CREATE INDEX idx_beneficiaries_ws ON beneficiaries(workspace_id);

-- ============================================================
-- 4. TRANSACTIONS (the heart of the app)
-- ============================================================

CREATE TABLE transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tipo                TEXT NOT NULL CHECK (tipo IN ('ingreso','gasto','transferencia')),
  monto               NUMERIC(14,2) NOT NULL,
  descripcion         TEXT,
  fecha               DATE NOT NULL,
  categoria_id        UUID REFERENCES categories(id) ON DELETE SET NULL,
  cuenta_id           UUID REFERENCES accounts(id) ON DELETE SET NULL,
  cuenta_destino_id   UUID REFERENCES accounts(id) ON DELETE SET NULL, -- transferencias
  tarjeta_id          UUID REFERENCES cards(id) ON DELETE SET NULL,
  tipo_ingreso        TEXT,                       -- 'personal'|'cliente'|'salario'|'prestamo'|'otro'
  cliente_asociado    TEXT,
  aplica_diezmo       BOOLEAN NOT NULL DEFAULT FALSE,
  estado              TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','hold')),
  notas               TEXT,
  beneficiarios       JSONB,                      -- array of {beneficiary_id, nombre, monto}
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tx_ws_fecha ON transactions(workspace_id, fecha DESC);
CREATE INDEX idx_tx_cuenta ON transactions(cuenta_id) WHERE cuenta_id IS NOT NULL;
CREATE INDEX idx_tx_tarjeta ON transactions(tarjeta_id) WHERE tarjeta_id IS NOT NULL;
CREATE INDEX idx_tx_categoria ON transactions(categoria_id) WHERE categoria_id IS NOT NULL;

-- ============================================================
-- 5. RECURRING / SUBSCRIPTIONS
-- ============================================================

CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  monto           NUMERIC(14,2) NOT NULL,
  frecuencia      TEXT NOT NULL,                  -- 'mensual'|'anual'|'semanal'
  dia_cobro       SMALLINT,
  cuenta_id       UUID REFERENCES accounts(id) ON DELETE SET NULL,
  tarjeta_id      UUID REFERENCES cards(id) ON DELETE SET NULL,
  categoria_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  activa          BOOLEAN NOT NULL DEFAULT TRUE,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subs_ws ON subscriptions(workspace_id);

CREATE TABLE subscription_charges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  monto           NUMERIC(14,2) NOT NULL,
  pagado          BOOLEAN NOT NULL DEFAULT FALSE,
  transaction_id  UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sub_charges_sub ON subscription_charges(subscription_id);

-- ============================================================
-- 6. DEBTS, LOANS, RECEIVABLES, PAYABLES
-- ============================================================

CREATE TABLE debts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  acreedor        TEXT NOT NULL,
  monto_original  NUMERIC(14,2) NOT NULL,
  saldo_pendiente NUMERIC(14,2) NOT NULL,
  cuotas_total    INT,
  cuotas_pagadas  INT NOT NULL DEFAULT 0,
  monto_cuota     NUMERIC(14,2),
  tasa_interes    NUMERIC(5,2),
  fecha_inicio    DATE,
  fecha_proximo_pago DATE,
  estado          TEXT NOT NULL DEFAULT 'activa',
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_debts_ws ON debts(workspace_id);

CREATE TABLE debt_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  debt_id         UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  monto           NUMERIC(14,2) NOT NULL,
  fecha           DATE NOT NULL,
  cuenta_id       UUID REFERENCES accounts(id) ON DELETE SET NULL,
  transaction_id  UUID REFERENCES transactions(id) ON DELETE SET NULL,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_debt_pay_debt ON debt_payments(debt_id);

CREATE TABLE debt_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  configuracion   JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE loans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  deudor          TEXT NOT NULL,                  -- a quien le prestaste
  monto_original  NUMERIC(14,2) NOT NULL,
  saldo_pendiente NUMERIC(14,2) NOT NULL,
  fecha_inicio    DATE,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_loans_ws ON loans(workspace_id);

CREATE TABLE loan_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  loan_id         UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  monto           NUMERIC(14,2) NOT NULL,
  fecha           DATE NOT NULL,
  cuenta_id       UUID REFERENCES accounts(id) ON DELETE SET NULL,
  transaction_id  UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE receivables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  cliente         TEXT NOT NULL,
  monto           NUMERIC(14,2) NOT NULL,
  fecha_emision   DATE,
  fecha_venc      DATE,
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','cobrada','cancelada')),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_recv_ws ON receivables(workspace_id);

CREATE TABLE payables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  acreedor        TEXT NOT NULL,
  monto           NUMERIC(14,2) NOT NULL,
  fecha_emision   DATE,
  fecha_venc      DATE,
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagada','cancelada')),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pay_ws ON payables(workspace_id);

-- ============================================================
-- 7. GOALS, TITHE, NOTES, NOTIFICATIONS, SETTINGS
-- ============================================================

CREATE TABLE goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  monto_objetivo  NUMERIC(14,2) NOT NULL,
  monto_actual    NUMERIC(14,2) NOT NULL DEFAULT 0,
  fecha_objetivo  DATE,
  cuenta_id       UUID REFERENCES accounts(id) ON DELETE SET NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_goals_ws ON goals(workspace_id);

CREATE TABLE goal_contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  goal_id         UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  monto           NUMERIC(14,2) NOT NULL,
  fecha           DATE NOT NULL,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_goal_contrib_goal ON goal_contributions(goal_id);

CREATE TABLE tithe (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  base_calculo    NUMERIC(14,2) NOT NULL,
  monto_diezmo    NUMERIC(14,2) NOT NULL,
  pagado          BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_pago      DATE,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tithe_ws ON tithe(workspace_id);

CREATE TABLE notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  titulo          TEXT,
  contenido       TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notes_ws ON notes(workspace_id);

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,                  -- 'cc_payment'|'subs'|'debt'|'recv'|'smart'
  titulo          TEXT NOT NULL,
  mensaje         TEXT,
  leida           BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_user ON notifications(user_id, leida);
CREATE INDEX idx_notif_ws ON notifications(workspace_id);

CREATE TABLE workspace_settings (
  workspace_id    UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  data            JSONB NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. TRIGGERS — auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    ', t);
  END LOOP;
END$$;

-- ============================================================
-- 9. SEED MÍNIMO — plan free por defecto
-- ============================================================

INSERT INTO plans (codigo, nombre, precio_mensual, limites, features) VALUES
  ('free', 'Gratis', 0, '{"max_accounts":3,"max_cards":2,"max_workspaces":1}'::jsonb, '{"ai_chat":false,"backups":false}'::jsonb),
  ('pro',  'Pro',    9.99, '{"max_accounts":50,"max_cards":50,"max_workspaces":5}'::jsonb, '{"ai_chat":true,"backups":true}'::jsonb),
  ('enterprise', 'Enterprise', 49.99, '{"max_accounts":-1,"max_cards":-1,"max_workspaces":-1}'::jsonb, '{"ai_chat":true,"backups":true,"sso":true}'::jsonb)
ON CONFLICT (codigo) DO NOTHING;
