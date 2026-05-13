// ============================================
// FinanzApp API — Servidor Express principal
// ============================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import workspacesRoutes from './routes/workspaces.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import trashRoutes from './routes/trash.routes.js';
import hubRoutes from './routes/hub.routes.js';
import { mountEntities } from './routes/entities.routes.js';
import { startScheduler } from './services/scheduler.service.js';
import { runStartupMigrations } from './config/auto-migrate.js';

const app = express();

// ---------- Trust proxy (para hosting detras de reverse proxy) ----------
app.set('trust proxy', 1);

// ---------- Seguridad y parsers ----------
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // mobile apps / curl
    if (config.cors.origins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---------- Logging ----------
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// ---------- Rate limit global ----------
// Aplicado solo a endpoints sensibles. CRUD, notifications, admin no se limitan
// (los limites estrictos por endpoint estan en auth.routes.js).
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limit_exceeded' },
  // No contar requests autenticados (el usuario logueado puede hacer las que quiera).
  skip: (req) => Boolean(req.headers.authorization),
});
app.use(globalLimiter);

// ---------- Rutas ----------
app.use('/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspacesRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/trash', trashRoutes);
app.use('/api/v1/hub', hubRoutes);

// CRUD generico para 21 entidades de negocio
mountEntities(app);

// ---------- Frontend SPA estatico (solo en produccion) ----------
// Sirve el bundle generado por `npm run build` (Vite -> dist/). En el mismo
// proceso/puerto que la API, asi un solo subdomain (fi.abbypixel.com) sirve
// ambos. /api/v1/* siempre matchea primero porque esta montado arriba.
if (config.nodeEnv === 'production') {
  const distPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Inicia cron jobs (alertas + resumen diario)
startScheduler();

// ---------- 404 + error handler ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Bootstrap ----------
const port = config.port;

// Aplica migraciones .sql idempotentes (notification_log, notification_preferences,
// etc.) antes de empezar a escuchar — así no se necesita SSH para parchar el schema.
runStartupMigrations()
  .catch((e) => console.warn('[auto-migrate] fallo en bootstrap:', e?.message))
  .finally(() => {
    app.listen(port, () => {
      console.log(`
  ┌─────────────────────────────────────────────┐
  │  FinanzApp API                              │
  │  Env:    ${config.nodeEnv.padEnd(35)}│
  │  Port:   ${String(port).padEnd(35)}│
  │  Health: http://localhost:${port}/health         │
  └─────────────────────────────────────────────┘
      `);
    });
  });

export default app;
