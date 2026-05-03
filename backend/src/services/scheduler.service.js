// ============================================================
// Scheduler — cron jobs en background
// ============================================================
import cron from 'node-cron';
import { runScheduledAlertsJob, runDailySummaryJob } from './notifications.service.js';
import { config } from '../config/env.js';

let started = false;

export function startScheduler() {
  if (started) return;
  if (config.nodeEnv === 'test') return;
  started = true;

  // Cada hora: escanear y crear notificaciones in-app + email para alertas criticas
  cron.schedule('0 * * * *', async () => {
    try { await runScheduledAlertsJob(); }
    catch (e) { console.error('[cron-alerts]', e.message); }
  }, { timezone: 'America/Santo_Domingo' });

  // Cada dia a las 7am hora local: enviar resumen por email
  cron.schedule('0 7 * * *', async () => {
    try { await runDailySummaryJob(); }
    catch (e) { console.error('[cron-summary]', e.message); }
  }, { timezone: 'America/Santo_Domingo' });

  console.log('[scheduler] iniciado (alertas cada hora, resumen 7am AST)');

  // Opcional: corre una pasada inicial para popular notificaciones a los 30s del start
  setTimeout(() => {
    runScheduledAlertsJob().catch(e => console.error('[init-alerts]', e.message));
  }, 30000);
}

export default { startScheduler };
