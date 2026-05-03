// ============================================
// PostgreSQL connection pool
// ============================================
import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

const pool = config.db.url
  ? new Pool({
      connectionString: config.db.url,
      ssl: config.nodeEnv === 'production'
        ? { rejectUnauthorized: false }
        : false,
    })
  : new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      max: 20,
      idleTimeoutMillis: 30000,
    });

pool.on('error', (err) => {
  console.error('[db] error inesperado en cliente idle', err);
});

export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv !== 'production') {
    console.log(`[db] ${duration}ms | ${result.rowCount} rows | ${text.split('\n')[0].slice(0, 80)}`);
  }
  return result;
}

export async function getClient() {
  return pool.connect();
}

export async function ping() {
  const r = await query('SELECT NOW() as now, version() as version');
  return r.rows[0];
}

export default pool;
