-- Tabla de log de notificaciones enviadas (audit + cooldown)
-- Idempotente: si ya existe, no hace nada.

CREATE TABLE IF NOT EXISTS notification_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  workspace_id  uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  channel       text NOT NULL,        -- 'in_app' | 'email' | 'push'
  tipo          text NOT NULL,        -- 'card' | 'payment' | 'subscription' | 'debt' | etc.
  titulo        text NOT NULL,
  body          text,
  status        text NOT NULL DEFAULT 'sent', -- 'sent' | 'failed' | 'skipped'
  error         text,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indices para queries de cooldown rapidas
CREATE INDEX IF NOT EXISTS idx_notification_log_dedup
  ON notification_log (user_id, channel, tipo, ((metadata->>'referencia_id')), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_recent
  ON notification_log (user_id, created_at DESC);
