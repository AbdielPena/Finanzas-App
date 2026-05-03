// ============================================
// FinanzApp API — Servidor Express principal
// ============================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import workspacesRoutes from './routes/workspaces.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import { mountEntities } from './routes/entities.routes.js';
import { startScheduler } from './services/scheduler.service.js';

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
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limit_exceeded' },
}));

// ---------- Rutas ----------
app.use('/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspacesRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationsRoutes);

// CRUD generico para 21 entidades de negocio
mountEntities(app);

// Inicia cron jobs (alertas + resumen diario)
startScheduler();

// ---------- 404 + error handler ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Bootstrap ----------
const port = config.port;
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

export default app;
