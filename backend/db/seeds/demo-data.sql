-- ============================================================
-- Seed de datos demo para desarrollo
-- Crea: 1 usuario demo + workspace + 2 bancos + 3 cuentas + 1 tarjeta
--       + categorías sistema + algunas transacciones
-- Password del usuario demo: "demo1234" (hash argon2id pre-generado)
-- ============================================================

-- Solo correr en development. En prod, no.
DO $$
BEGIN
  IF current_setting('server_version_num')::int < 130000 THEN
    RAISE EXCEPTION 'Postgres 13+ requerido';
  END IF;
END$$;

-- ---------- Usuario demo ----------
INSERT INTO users (id, email, password_hash, nombre, is_super_admin, email_verified)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'demo@finanzapp.local',
  -- argon2id hash de "demo1234" - SOLO USAR EN DEV
  '$argon2id$v=19$m=65536,t=3,p=4$YWJjZGVmZ2hpamtsbW5vcA$1kCTkkqNqdeOlqyFcbBLp8MzAjkhFaXMsHUOQA1tTw0',
  'Usuario Demo',
  true,
  true
)
ON CONFLICT (email) DO NOTHING;

-- ---------- Workspace ----------
INSERT INTO workspaces (id, nombre, owner_id, plan_id)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Workspace Demo',
  '11111111-1111-1111-1111-111111111111',
  (SELECT id FROM plans WHERE codigo = 'free')
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO workspace_members (workspace_id, user_id, rol)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'owner'
)
ON CONFLICT DO NOTHING;

-- ---------- Categorías de sistema ----------
INSERT INTO categories (workspace_id, nombre, tipo, emoji, es_sistema) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Salario', 'ingreso', '💼', true),
  ('22222222-2222-2222-2222-222222222222', 'Freelance', 'ingreso', '💻', true),
  ('22222222-2222-2222-2222-222222222222', 'Ventas', 'ingreso', '🛒', true),
  ('22222222-2222-2222-2222-222222222222', 'Comida', 'gasto', '🍽️', true),
  ('22222222-2222-2222-2222-222222222222', 'Transporte', 'gasto', '🚗', true),
  ('22222222-2222-2222-2222-222222222222', 'Entretenimiento', 'gasto', '🎮', true),
  ('22222222-2222-2222-2222-222222222222', 'Servicios', 'gasto', '⚡', true),
  ('22222222-2222-2222-2222-222222222222', 'Salud', 'gasto', '🏥', true)
ON CONFLICT DO NOTHING;

-- ---------- Bancos ----------
INSERT INTO banks (id, workspace_id, nombre, color) VALUES
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222', 'Banreservas', '#1a4d8f'),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'Popular', '#003c71')
ON CONFLICT (id) DO NOTHING;

-- ---------- Cuentas ----------
INSERT INTO accounts (id, workspace_id, banco_id, nombre, tipo, saldo_inicial) VALUES
  ('44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333331', 'Nómina BR', 'nómina', 25000.00),
  ('44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333331', 'Ahorro BR',  'ahorro', 80000.00),
  ('44444444-4444-4444-4444-444444444443', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333332', 'Cuenta Popular', 'corriente', 12000.00)
ON CONFLICT (id) DO NOTHING;

-- ---------- Tarjeta ----------
INSERT INTO cards (id, workspace_id, banco_id, nombre, limite_credito, saldo_usado, tasa_interes, dia_corte, dia_pago) VALUES
  ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333331', 'Visa Gold', 100000.00, 15000.00, 3.50, 15, 5)
ON CONFLICT (id) DO NOTHING;

-- ---------- Transacciones de ejemplo ----------
INSERT INTO transactions (workspace_id, tipo, monto, descripcion, fecha, categoria_id, cuenta_id, aplica_diezmo) VALUES
  ('22222222-2222-2222-2222-222222222222', 'ingreso', 35000.00, 'Salario mensual',
    CURRENT_DATE - INTERVAL '15 days',
    (SELECT id FROM categories WHERE nombre='Salario' AND workspace_id='22222222-2222-2222-2222-222222222222'),
    '44444444-4444-4444-4444-444444444441', true),
  ('22222222-2222-2222-2222-222222222222', 'gasto', 1500.00, 'Supermercado',
    CURRENT_DATE - INTERVAL '10 days',
    (SELECT id FROM categories WHERE nombre='Comida' AND workspace_id='22222222-2222-2222-2222-222222222222'),
    '44444444-4444-4444-4444-444444444441', false),
  ('22222222-2222-2222-2222-222222222222', 'gasto', 2500.00, 'Gasolina mes',
    CURRENT_DATE - INTERVAL '5 days',
    (SELECT id FROM categories WHERE nombre='Transporte' AND workspace_id='22222222-2222-2222-2222-222222222222'),
    '44444444-4444-4444-4444-444444444443', false);
