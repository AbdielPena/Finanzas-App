// ============================================================
// Studio Business Hub — integración federada
//
// Responsabilidades:
//   1. Verificar HMAC de webhooks entrantes desde el hub
//   2. Verificar JWT del hub (SSO inbound)
//   3. Emitir eventos al hub (outbound) firmados con HMAC
//   4. Idempotencia por external_reference en transacciones
// ============================================================
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { config } from '../config/env.js';

const SYSTEM_ID = 'finanzapp';
const HUB_URL = process.env.HUB_URL || 'http://localhost:3100';

const HMAC_HEADER = 'x-hub-signature';
const MAX_SKEW_MS = 5 * 60 * 1000;

// -------------------------------------------------------------
// HMAC verify (webhooks entrantes desde el hub)
// -------------------------------------------------------------
export function verifyHubSignature(rawBody, signatureHeader, now = Date.now()) {
  const secret = process.env.HUB_HMAC_SECRET;
  if (!secret) return { ok: false, reason: 'secret_not_configured' };
  if (!signatureHeader) return { ok: false, reason: 'missing' };

  const m = /^t=(\d+),sha256=([a-f0-9]{64})$/i.exec(signatureHeader.trim());
  if (!m) return { ok: false, reason: 'malformed' };

  const ts = Number(m[1]);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'malformed' };
  if (Math.abs(now - ts * 1000) > MAX_SKEW_MS) return { ok: false, reason: 'stale' };

  const expected = crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(m[2], 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, timestamp: ts };
}

export function signHubBody(body) {
  const secret = process.env.HUB_HMAC_SECRET;
  if (!secret) return null;
  const ts = Math.floor(Date.now() / 1000);
  const mac = crypto.createHmac('sha256', secret);
  mac.update(`${ts}.${body}`);
  return `t=${ts},sha256=${mac.digest('hex')}`;
}

// -------------------------------------------------------------
// JWT verify (SSO inbound — JWT firmado por el hub)
// -------------------------------------------------------------
export function verifyHubSsoToken(token) {
  const secret = process.env.HUB_JWT_SECRET;
  if (!secret) {
    return { ok: false, reason: 'secret_not_configured' };
  }
  try {
    const payload = jwt.verify(token, secret, {
      issuer: process.env.HUB_JWT_ISSUER || 'studio-hub',
      audience: SYSTEM_ID,
    });
    if (!payload?.email || !payload?.sub) {
      return { ok: false, reason: 'missing_claims' };
    }
    return { ok: true, claims: payload };
  } catch (e) {
    return { ok: false, reason: 'invalid', detail: e.message };
  }
}

// -------------------------------------------------------------
// Find or create user + workspace por email (idempotente)
// -------------------------------------------------------------
export async function findOrCreateUserForHub({ hubUserId, email, name }) {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Buscar link existente
  const linkResult = await query(
    `SELECT u.id, u.email, u.nombre, u.is_super_admin, u.estado
       FROM hub_user_links hl
       JOIN users u ON u.id = hl.user_id
      WHERE hl.hub_user_id = $1`,
    [hubUserId]
  );
  if (linkResult.rowCount > 0) {
    await query(
      `UPDATE hub_user_links SET last_sso_at = NOW() WHERE hub_user_id = $1`,
      [hubUserId]
    );
    return linkResult.rows[0];
  }

  // 2. Buscar usuario por email
  const userResult = await query(
    `SELECT id, email, nombre, is_super_admin, estado FROM users WHERE email = $1`,
    [normalizedEmail]
  );

  let user;
  if (userResult.rowCount > 0) {
    user = userResult.rows[0];
  } else {
    // 3. Crear usuario nuevo. password_hash null = solo SSO.
    const ins = await query(
      `INSERT INTO users (email, nombre, password_hash, email_verified, estado)
       VALUES ($1, $2, NULL, TRUE, 'activo')
       RETURNING id, email, nombre, is_super_admin, estado`,
      [normalizedEmail, name || normalizedEmail.split('@')[0]]
    );
    user = ins.rows[0];

    // Crear workspace por defecto en modo BUSINESS (vinculado al hub)
    await query(
      `INSERT INTO workspaces (nombre, owner_id, plan_id, mode)
       VALUES ($1, $2, NULL, 'BUSINESS')`,
      [`${user.nombre || 'Mi'} - Negocio`, user.id]
    );
  }

  // 4. Registrar link hub_user → finanzapp_user
  await query(
    `INSERT INTO hub_user_links (hub_user_id, user_id, email, last_sso_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (hub_user_id) DO UPDATE SET last_sso_at = NOW()`,
    [hubUserId, user.id, normalizedEmail]
  );

  return user;
}

// -------------------------------------------------------------
// Resolver workspace activo del user (preferir el BUSINESS/HYBRID)
// -------------------------------------------------------------
export async function resolveBusinessWorkspace(userId) {
  const res = await query(
    `SELECT id, nombre, mode FROM workspaces
      WHERE owner_id = $1
        AND mode IN ('BUSINESS','HYBRID')
      ORDER BY created_at ASC
      LIMIT 1`,
    [userId]
  );
  if (res.rowCount > 0) return res.rows[0];

  // fallback: cualquier workspace del usuario
  const fb = await query(
    `SELECT id, nombre, mode FROM workspaces
      WHERE owner_id = $1
      ORDER BY created_at ASC
      LIMIT 1`,
    [userId]
  );
  return fb.rows[0] || null;
}

// -------------------------------------------------------------
// Emitir un access token propio de FinanzApp para el SSO
// -------------------------------------------------------------
export function signFinanzappAccessToken(user, workspaceId) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.is_super_admin === true,
      workspaceId,
      via: 'hub_sso',
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl }
  );
}

// -------------------------------------------------------------
// Insertar income idempotente desde el hub
// -------------------------------------------------------------
export async function createIncomeFromHub({
  workspaceId,
  userId,
  externalReference,
  amount,
  description,
  occurredAt,
  clientName,
  categoryId,
  accountId,
}) {
  if (!externalReference) {
    throw new Error('external_reference es requerido para evitar duplicados');
  }

  // El UNIQUE index parcial sobre external_reference impide duplicados.
  const result = await query(
    `INSERT INTO transactions (
        workspace_id, user_id, tipo, monto, fecha, descripcion,
        cuenta_id, categoria_id, cliente_asociado,
        tipo_ingreso, external_reference, is_business
     ) VALUES ($1, $2, 'ingreso', $3, $4, $5, $6, $7, $8, 'cliente', $9, TRUE)
     ON CONFLICT (external_reference)
       WHERE external_reference IS NOT NULL
       DO NOTHING
     RETURNING id`,
    [
      workspaceId,
      userId,
      amount,
      occurredAt || new Date(),
      description || 'Ingreso desde Studio Business Hub',
      accountId || null,
      categoryId || null,
      clientName || null,
      externalReference,
    ]
  );

  if (result.rowCount === 0) {
    // Ya existía — devolver el existente
    const existing = await query(
      `SELECT id FROM transactions WHERE external_reference = $1`,
      [externalReference]
    );
    return { id: existing.rows[0]?.id, duplicate: true };
  }
  return { id: result.rows[0].id, duplicate: false };
}

// -------------------------------------------------------------
// Emitir evento al hub (outbound)
// -------------------------------------------------------------
export async function emitToHub(eventType, { externalReference, payload }) {
  const body = JSON.stringify({
    event_type: eventType,
    external_reference: externalReference,
    payload,
    occurred_at: new Date().toISOString(),
  });
  const signature = signHubBody(body);
  if (!signature) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[hub] HUB_HMAC_SECRET no configurado; evento no enviado:', eventType);
    }
    return { ok: false, reason: 'secret_missing' };
  }

  try {
    const res = await fetch(`${HUB_URL}/api/ingest/${SYSTEM_ID}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [HMAC_HEADER]: signature },
      body,
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[hub] ingest failed', res.status, eventType, text);
      return { ok: false, reason: `${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error('[hub] ingest threw', eventType, e.message);
    return { ok: false, reason: e.message };
  }
}

export const HUB_INGRESS_HEADER = HMAC_HEADER;
