-- Crea la tabla notification_preferences (faltaba en el schema inicial)
-- Idempotente: si ya existe, no hace nada.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id              uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_enabled        boolean NOT NULL DEFAULT true,
  push_enabled         boolean NOT NULL DEFAULT true,
  in_app_enabled       boolean NOT NULL DEFAULT true,
  daily_summary        boolean NOT NULL DEFAULT false,
  weekly_summary       boolean NOT NULL DEFAULT false,
  alert_payments       boolean NOT NULL DEFAULT true,
  alert_subscriptions  boolean NOT NULL DEFAULT true,
  alert_debts          boolean NOT NULL DEFAULT true,
  alert_card_usage     boolean NOT NULL DEFAULT true,
  card_usage_threshold integer NOT NULL DEFAULT 80,
  anticipation_days    integer NOT NULL DEFAULT 3,
  quiet_hours_start    time,
  quiet_hours_end      time,
  push_token           text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
