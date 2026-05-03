// ============================================
// Health check — para load balancers y monitoreo
// ============================================
import { Router } from 'express';
import { ping } from '../config/db.js';
import { config } from '../config/env.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    name: 'finanzapp-api',
    version: '0.1.0',
    env: config.nodeEnv,
    uptime: process.uptime(),
  });
});

router.get('/db', async (req, res, next) => {
  try {
    const info = await ping();
    res.json({ status: 'ok', db: info });
  } catch (e) {
    next(e);
  }
});

export default router;
