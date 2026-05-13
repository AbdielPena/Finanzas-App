-- Migrations corren contra el pooler de Supabase donde el schema 'finanzapp'
-- requiere ser explicito en el search_path.
SET search_path TO finanzapp, public, extensions;

-- Soft delete + papelera (idempotente, autoaplicada al boot via auto-migrate.js)
--
-- Al borrar una entidad de negocio NO la eliminamos fisicamente; le
-- ponemos `deleted_at = now()` y la ocultamos del listado normal.
-- Una pagina /trash la muestra con opcion de restaurar.
--
-- Tras 30 dias en la papelera, un job cron (scheduler.service.js) la borra
-- definitivamente con DELETE WHERE deleted_at < NOW() - INTERVAL '30 days'.

-- Tablas que soportan soft-delete
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'transactions',
    'debts',
    'debt_payments',
    'debt_templates',
    'loans',
    'loan_payments',
    'subscriptions',
    'subscription_charges',
    'receivables',
    'payables',
    'goals',
    'goal_contributions',
    'notes',
    'beneficiaries',
    'banks',
    'accounts',
    'cards',
    'external_cards',
    'categories'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Solo si la tabla existe (algunos esquemas legacy pueden no tenerlas todas)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      -- ADD COLUMN IF NOT EXISTS es soportado en PG 9.6+
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', tbl);
      -- Indice parcial: las queries normales filtran WHERE deleted_at IS NULL,
      -- y la papelera lista lo que tiene deleted_at IS NOT NULL.
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_deleted_at ON %I(workspace_id, deleted_at) WHERE deleted_at IS NOT NULL',
        tbl, tbl
      );
    END IF;
  END LOOP;
END $$;
