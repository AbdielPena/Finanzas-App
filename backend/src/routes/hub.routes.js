// ============================================================
// FinanzApp — Rutas de integración con Studio Business Hub
//
//   GET  /api/v1/hub/sso          → SSO inbound (JWT firmado por el hub)
//   POST /api/v1/hub/incomes      → Webhook: crear income idempotente
//   POST /api/v1/hub/expenses     → Webhook: crear expense idempotente (futuro)
// ============================================================
import { Router, raw as rawBody } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler.js';
import { authRequired } from '../middleware/auth.js';
import {
  verifyHubSignature,
  verifyHubSsoToken,
  findOrCreateUserForHub,
  resolveBusinessWorkspace,
  signFinanzappAccessToken,
  createIncomeFromHub,
} from '../services/hub.service.js';

const router = Router();

// -------------------------------------------------------------
// GET /api/v1/hub/sso — SSO inbound
//
// Flujo:
//   1. Hub redirige a esta URL con ?token=<jwt>&redirect=<path>
//   2. Verificamos el JWT (firmado con HUB_JWT_SECRET, aud=finanzapp)
//   3. Encontramos o creamos el user local
//   4. Emitimos nuestro propio access token JWT
//   5. Devolvemos un HTML mínimo que guarda el token en localStorage y redirige
//      al frontend SPA (FRONTEND_URL configurable).
// -------------------------------------------------------------
router.get('/sso', async (req, res, next) => {
  try {
    const token = String(req.query.token || '');
    const redirect = sanitizeRedirect(String(req.query.redirect || '/'));

    if (!token) throw new HttpError(400, 'missing_token');

    const verification = verifyHubSsoToken(token);
    if (!verification.ok) {
      throw new HttpError(401, `invalid_hub_token:${verification.reason}`);
    }
    const claims = verification.claims;

    const user = await findOrCreateUserForHub({
      hubUserId: String(claims.sub),
      email: String(claims.email),
      name: typeof claims.name === 'string' ? claims.name : undefined,
    });

    const workspace = await resolveBusinessWorkspace(user.id);
    const access = signFinanzappAccessToken(user, workspace?.id || null);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const targetUrl = new URL(redirect, frontendUrl).toString();

    // HTML mínimo que setea localStorage y redirige.
    // JWTs son base64.JSON (sin caracteres especiales), seguros para inline JSON.stringify.
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    res.send(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Iniciando sesión...</title></head>
<body style="font-family:system-ui;display:grid;place-items:center;min-height:100dvh;color:#666">
  <p>Iniciando sesión en FinanzApp…</p>
  <script>
    try {
      var auth = ${JSON.stringify({
        accessToken: access,
        workspaceId: workspace?.id || null,
        user: { id: user.id, email: user.email, nombre: user.nombre },
        via: 'hub-sso',
        at: Date.now(),
      })};
      localStorage.setItem('finanzapp.auth', JSON.stringify(auth));
      localStorage.setItem('finanzapp.access_token', auth.accessToken);
      if (auth.workspaceId) localStorage.setItem('finanzapp.workspace_id', auth.workspaceId);
      window.location.replace(${JSON.stringify(targetUrl)});
    } catch (e) {
      document.body.innerHTML = '<p>Error al guardar sesión: ' + e.message + '</p>';
    }
  </script>
</body></html>`);
  } catch (e) {
    next(e);
  }
});

// -------------------------------------------------------------
// Middleware: capturar rawBody para verificación HMAC en webhooks
// (express.json ya parseó el body global; necesitamos el body crudo aquí)
// -------------------------------------------------------------
function captureRawBody(req, res, next) {
  let raw = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    req.rawBody = raw;
    try {
      req.body = raw ? JSON.parse(raw) : {};
    } catch (e) {
      return next(new HttpError(400, 'invalid_json'));
    }
    next();
  });
  req.on('error', next);
}

function verifyHubWebhookMiddleware(req, res, next) {
  const verification = verifyHubSignature(req.rawBody || '', req.headers['x-hub-signature']);
  if (!verification.ok) {
    return next(new HttpError(401, `signature_${verification.reason}`));
  }
  next();
}

// -------------------------------------------------------------
// POST /api/v1/hub/incomes — webhook idempotente
// Recibe un ingreso desde el hub (ej: factura pagada en otro sistema).
// -------------------------------------------------------------
const IncomeSchema = z.object({
  external_reference: z.string().min(1).max(256),
  workspace_id: z.string().uuid().optional(),
  amount: z.union([z.number().positive(), z.string()]).transform((v) =>
    typeof v === 'number' ? v : Number(v)
  ),
  description: z.string().max(500).optional(),
  occurred_at: z.string().datetime().optional(),
  client_name: z.string().max(200).optional(),
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  source_system: z.string().optional(),
  hub_user_id: z.string().uuid().optional(),
});

router.post('/incomes', captureRawBody, verifyHubWebhookMiddleware, async (req, res, next) => {
  try {
    const data = IncomeSchema.parse(req.body);

    // Resolver workspace destino: si llega explícito, usarlo; si no, resolver via hub_user_id.
    let workspaceId = data.workspace_id || null;
    let userId = null;

    if (!workspaceId && data.hub_user_id) {
      const { rowCount, rows } = await import('../config/db.js').then(({ query }) =>
        query(
          `SELECT u.id as user_id
             FROM hub_user_links hl JOIN users u ON u.id = hl.user_id
            WHERE hl.hub_user_id = $1`,
          [data.hub_user_id]
        )
      );
      if (rowCount > 0) {
        userId = rows[0].user_id;
        const ws = await resolveBusinessWorkspace(userId);
        workspaceId = ws?.id || null;
      }
    }

    if (!workspaceId) {
      throw new HttpError(400, 'no_business_workspace_for_hub_user');
    }

    const result = await createIncomeFromHub({
      workspaceId,
      userId,
      externalReference: data.external_reference,
      amount: Number(data.amount),
      description: data.description,
      occurredAt: data.occurred_at ? new Date(data.occurred_at) : new Date(),
      clientName: data.client_name,
      categoryId: data.category_id,
      accountId: data.account_id,
    });

    res.status(202).json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});

// -------------------------------------------------------------
// GET /api/v1/hub/health (autenticado) — para confirmar config
// -------------------------------------------------------------
router.get('/health', authRequired, (req, res) => {
  res.json({
    ok: true,
    system: 'finanzapp',
    hub_url: process.env.HUB_URL || 'http://localhost:3100',
    hmac_configured: Boolean(process.env.HUB_HMAC_SECRET),
    sso_configured: Boolean(process.env.HUB_JWT_SECRET),
  });
});

function sanitizeRedirect(path) {
  if (!path || !path.startsWith('/')) return '/';
  if (path.startsWith('//')) return '/';
  return path;
}

export default router;
