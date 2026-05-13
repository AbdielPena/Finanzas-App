-- ============================================================
-- FinanzApp — Integración con Studio Business Hub
-- Migration idempotente (auto-migrate la corre en boot)
-- ============================================================

-- 1. Modo del workspace: personal / business / hybrid
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'PERSONAL'
  CHECK (mode IN ('PERSONAL','BUSINESS','HYBRID'));

-- 2. Referencia externa para deduplicar ingresos venidos del hub
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS external_reference TEXT;

-- Unique parcial: dos transacciones distintas no pueden compartir la misma referencia externa
-- (ej: 'studioflow:invoice_123' solo puede entrar una vez aunque el webhook se repita).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'ux_transactions_external_reference'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX ux_transactions_external_reference
             ON transactions(external_reference)
             WHERE external_reference IS NOT NULL';
  END IF;
END$$;

-- 3. Marca transacciones de negocio (visible en modo HYBRID)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_business BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Marca categorías como business para sugerencia automática
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS is_business BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Tabla de mapeo hub_user → finanzapp_user (SSO)
CREATE TABLE IF NOT EXISTS hub_user_links (
  hub_user_id    UUID NOT NULL,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email          CITEXT NOT NULL,
  last_sso_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (hub_user_id)
);
CREATE INDEX IF NOT EXISTS ix_hub_user_links_user_id ON hub_user_links(user_id);
CREATE INDEX IF NOT EXISTS ix_hub_user_links_email ON hub_user_links(email);

-- 6. Seed de categorías business sugeridas (idempotente)
-- No-op si ya existe una categoria con el mismo nombre en system rows.
-- (omitido: cada workspace crea sus categorías; estas sugerencias se ofrecen en UI)
