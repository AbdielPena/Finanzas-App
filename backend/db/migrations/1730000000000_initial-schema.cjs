/* eslint-disable camelcase */
// ============================================================
// Migration: initial schema
// Equivalente a db/schema.sql pero versionado y reversible
// ============================================================
const fs = require('fs');
const path = require('path');

exports.up = (pgm) => {
  // Carga el schema completo desde schema.sql
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  // Drop en orden inverso de FKs
  pgm.sql(`
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS notes CASCADE;
    DROP TABLE IF EXISTS tithe CASCADE;
    DROP TABLE IF EXISTS goal_contributions CASCADE;
    DROP TABLE IF EXISTS goals CASCADE;
    DROP TABLE IF EXISTS payables CASCADE;
    DROP TABLE IF EXISTS receivables CASCADE;
    DROP TABLE IF EXISTS loan_payments CASCADE;
    DROP TABLE IF EXISTS loans CASCADE;
    DROP TABLE IF EXISTS debt_templates CASCADE;
    DROP TABLE IF EXISTS debt_payments CASCADE;
    DROP TABLE IF EXISTS debts CASCADE;
    DROP TABLE IF EXISTS subscription_charges CASCADE;
    DROP TABLE IF EXISTS subscriptions CASCADE;
    DROP TABLE IF EXISTS transactions CASCADE;
    DROP TABLE IF EXISTS beneficiaries CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS external_cards CASCADE;
    DROP TABLE IF EXISTS cards CASCADE;
    DROP TABLE IF EXISTS accounts CASCADE;
    DROP TABLE IF EXISTS banks CASCADE;
    DROP TABLE IF EXISTS workspace_settings CASCADE;
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS refresh_tokens CASCADE;
    DROP TABLE IF EXISTS workspace_members CASCADE;
    DROP TABLE IF EXISTS workspaces CASCADE;
    DROP TABLE IF EXISTS plans CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP FUNCTION IF EXISTS trigger_set_updated_at() CASCADE;
  `);
};
