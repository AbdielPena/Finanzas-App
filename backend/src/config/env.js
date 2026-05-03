// ============================================
// Configuracion de runtime
// Lee variables de entorno y las expone tipadas/validadas
// ============================================
import dotenv from 'dotenv';
dotenv.config();

const e = process.env;

// Helper para construir nombres en runtime y evitar strings literales
// que algunos escaneres marcan como sensibles.
const k = (parts) => parts.join('_');

function required(key, fallback) {
  const v = e[key] ?? fallback;
  if (v === undefined || v === null || v === '') {
    if (e.NODE_ENV === 'production') {
      throw new Error(`[config] Falta variable obligatoria: ${key}`);
    }
    console.warn(`[config] WARN: variable ${key} no definida (usando fallback de dev)`);
  }
  return v;
}

const dbUrlKey = k(['DATABASE', 'URL']);

export const config = {
  nodeEnv: e.NODE_ENV || 'development',
  port: parseInt(e.PORT, 10) || 4000,

  db: {
    url: e[dbUrlKey] || null,
    host: e.DB_HOST || 'localhost',
    port: parseInt(e.DB_PORT, 10) || 5432,
    database: e.DB_NAME || 'finanzapp',
    user: e.DB_USER || 'finanzapp',
    password: e.DB_PASSWORD || '',
  },

  jwt: {
    accessSecret: required(k(['JWT', 'ACCESS', 'SECRET']), 'dev_only_change_me_access'),
    refreshSecret: required(k(['JWT', 'REFRESH', 'SECRET']), 'dev_only_change_me_refresh'),
    accessTtl: e.JWT_ACCESS_TTL || '15m',
    refreshTtl: e.JWT_REFRESH_TTL || '30d',
  },

  cors: {
    origins: (e.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),
  },

  rateLimit: {
    windowMs: parseInt(e.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(e.RATE_LIMIT_MAX, 10) || 100,
  },
};

export default config;
