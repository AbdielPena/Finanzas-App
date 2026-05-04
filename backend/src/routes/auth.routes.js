// ============================================
// Auth routes — register, login, refresh, logout
// ============================================
import { Router } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { query, getClient } from '../config/db.js';
import { config } from '../config/env.js';
import { HttpError } from '../middleware/errorHandler.js';
import { authRequired } from '../middleware/auth.js';
import {
  sendVerificationEmail, sendPasswordResetEmail,
  sendWelcomeEmail, sendPasswordChangedEmail,
} from '../services/email.service.js';

const router = Router();

// Rate limit estricto para endpoints sensibles (anti brute-force)
const strictAuthLimit = rateLimit({
  windowMs: 15 * 60 * 1000,            // 15 minutos
  max: 10,                              // 10 intentos por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_attempts', message: 'Demasiados intentos, espera 15 minutos.' },
  skipSuccessfulRequests: true,         // exitos no cuentan
});

const passwordResetLimit = rateLimit({
  windowMs: 60 * 60 * 1000,             // 1 hora
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_attempts' },
});

// ---------- Schemas ----------
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(2),
  workspaceName: z.string().min(2).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ---------- Helpers ----------
function signAccessToken(user, workspaceId) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.is_super_admin === true,
      workspaceId,
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashRefresh(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function persistRefreshToken(userId, refreshTokenPlain, req) {
  const tokenHash = hashRefresh(refreshTokenPlain);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30d
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, req.headers['user-agent'] || null, req.ip, expiresAt]
  );
}

// ---------- POST /auth/register ----------
router.post('/register', strictAuthLimit, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await query('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase()]);
    if (existing.rowCount > 0) {
      throw new HttpError(409, 'El email ya esta registrado');
    }

    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, nombre)
         VALUES ($1, $2, $3)
         RETURNING id, email, nombre, is_super_admin, created_at`,
        [data.email.toLowerCase(), passwordHash, data.nombre]
      );
      const user = userResult.rows[0];

      const wsResult = await client.query(
        `INSERT INTO workspaces (nombre, owner_id, plan_id)
         VALUES ($1, $2, (SELECT id FROM plans WHERE codigo = 'free'))
         RETURNING id, nombre`,
        [data.workspaceName || `Workspace de ${data.nombre}`, user.id]
      );
      const workspace = wsResult.rows[0];

      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, rol)
         VALUES ($1, $2, 'owner')`,
        [workspace.id, user.id]
      );

      await client.query('COMMIT');

      const accessToken = signAccessToken(user, workspace.id);
      const refreshToken = generateRefreshToken();
      await persistRefreshToken(user.id, refreshToken, req);

      // Email de bienvenida (fire-and-forget, no bloquea la respuesta)
      sendWelcomeEmail(user.email, {
        nombre: user.nombre,
        workspaceNombre: workspace.nombre,
      }).catch((e) => console.warn('[welcome-email]', e.message));

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
        },
        workspace,
        accessToken,
        refreshToken,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

// ---------- POST /auth/login ----------
router.post('/login', strictAuthLimit, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const r = await query(
      `SELECT id, email, password_hash, nombre, is_super_admin, estado
       FROM users WHERE email = $1`,
      [data.email.toLowerCase()]
    );
    if (r.rowCount === 0) throw new HttpError(401, 'Credenciales invalidas');

    const user = r.rows[0];
    if (user.estado !== 'activo') throw new HttpError(403, 'Usuario suspendido o inactivo');

    const ok = await argon2.verify(user.password_hash, data.password);
    if (!ok) throw new HttpError(401, 'Credenciales invalidas');

    // Workspace por defecto = el primero al que pertenece
    const wsR = await query(
      `SELECT w.id, w.nombre, wm.rol
       FROM workspace_members wm
       JOIN workspaces w ON w.id = wm.workspace_id
       WHERE wm.user_id = $1 AND w.deleted_at IS NULL
       ORDER BY wm.created_at ASC
       LIMIT 1`,
      [user.id]
    );
    const workspace = wsR.rows[0] || null;

    await query('UPDATE users SET ultimo_acceso = NOW() WHERE id = $1', [user.id]);

    const accessToken = signAccessToken(user, workspace?.id);
    const refreshToken = generateRefreshToken();
    await persistRefreshToken(user.id, refreshToken, req);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        isSuperAdmin: user.is_super_admin,
      },
      workspace,
      accessToken,
      refreshToken,
    });
  } catch (e) {
    next(e);
  }
});

// ---------- POST /auth/refresh ----------
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken;
    if (!refreshToken) throw new HttpError(400, 'Falta refreshToken');

    const tokenHash = hashRefresh(refreshToken);
    const r = await query(
      `SELECT rt.id as token_id, rt.user_id, rt.expires_at, rt.revoked_at,
              u.email, u.nombre, u.is_super_admin, u.estado
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1`,
      [tokenHash]
    );
    if (r.rowCount === 0) throw new HttpError(401, 'Refresh token invalido');
    const row = r.rows[0];
    if (row.revoked_at) throw new HttpError(401, 'Refresh token revocado');
    if (new Date(row.expires_at) < new Date()) throw new HttpError(401, 'Refresh token expirado');
    if (row.estado !== 'activo') throw new HttpError(403, 'Usuario inactivo');

    // Rotacion: revoca el viejo y emite uno nuevo
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [row.token_id]);
    const newRefresh = generateRefreshToken();
    await persistRefreshToken(row.user_id, newRefresh, req);

    const accessToken = signAccessToken(
      { id: row.user_id, email: row.email, is_super_admin: row.is_super_admin },
      req.headers['x-workspace-id'] || null
    );

    res.json({ accessToken, refreshToken: newRefresh });
  } catch (e) {
    next(e);
  }
});

// ---------- POST /auth/logout ----------
router.post('/logout', authRequired, async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken;
    if (refreshToken) {
      const tokenHash = hashRefresh(refreshToken);
      await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------- POST /auth/request-verification ----------
router.post('/request-verification', authRequired, async (req, res, next) => {
  try {
    const userResult = await query('SELECT email, email_verified FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rowCount === 0) throw new HttpError(404, 'Usuario no encontrado');
    if (userResult.rows[0].email_verified) {
      return res.json({ ok: true, message: 'Email ya verificado' });
    }

    const tokenPlain = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenPlain).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [req.user.id, tokenHash, expiresAt]
    );

    await sendVerificationEmail(userResult.rows[0].email, tokenPlain);
    res.json({ ok: true, message: 'Email de verificacion enviado' });
  } catch (e) {
    next(e);
  }
});

// ---------- POST /auth/verify-email ----------
router.post('/verify-email', async (req, res, next) => {
  try {
    const token = req.body?.token;
    if (!token) throw new HttpError(400, 'Falta token');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const r = await query(
      `SELECT id, user_id, expires_at, used_at
       FROM email_verification_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    if (r.rowCount === 0) throw new HttpError(400, 'Token invalido');
    const row = r.rows[0];
    if (row.used_at) throw new HttpError(400, 'Token ya usado');
    if (new Date(row.expires_at) < new Date()) throw new HttpError(400, 'Token expirado');

    await query('UPDATE users SET email_verified = TRUE WHERE id = $1', [row.user_id]);
    await query('UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1', [row.id]);

    res.json({ ok: true, message: 'Email verificado correctamente' });
  } catch (e) {
    next(e);
  }
});

// ---------- POST /auth/forgot-password ----------
router.post('/forgot-password', passwordResetLimit, async (req, res, next) => {
  try {
    const email = (req.body?.email || '').toLowerCase().trim();
    if (!email) throw new HttpError(400, 'Falta email');

    // Siempre responde 200 (no revelar si el email existe)
    const r = await query('SELECT id FROM users WHERE email = $1 AND estado = $2', [email, 'activo']);
    if (r.rowCount > 0) {
      const tokenPlain = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(tokenPlain).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip)
         VALUES ($1, $2, $3, $4)`,
        [r.rows[0].id, tokenHash, expiresAt, req.ip]
      );

      await sendPasswordResetEmail(email, tokenPlain);
    }
    res.json({ ok: true, message: 'Si el email existe, recibiras instrucciones' });
  } catch (e) {
    next(e);
  }
});

// ---------- POST /auth/reset-password ----------
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) throw new HttpError(400, 'Faltan campos');
    if (password.length < 8) throw new HttpError(400, 'Password muy corto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const r = await query(
      `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    if (r.rowCount === 0) throw new HttpError(400, 'Token invalido');
    const row = r.rows[0];
    if (row.used_at) throw new HttpError(400, 'Token ya usado');
    if (new Date(row.expires_at) < new Date()) throw new HttpError(400, 'Token expirado');

    const newHash = await argon2.hash(password, { type: argon2.argon2id });

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, row.user_id]);
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [row.id]);
    // Revoca todas las sesiones activas
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [row.user_id]);

    // Email de confirmacion del cambio
    try {
      const userR = await query('SELECT email, nombre FROM users WHERE id = $1', [row.user_id]);
      if (userR.rowCount > 0) {
        sendPasswordChangedEmail(userR.rows[0].email, {
          nombre: userR.rows[0].nombre,
          ip: req.ip,
        }).catch(() => {});
      }
    } catch {}

    res.json({ ok: true, message: 'Password restablecido' });
  } catch (e) {
    next(e);
  }
});

// ---------- GET /auth/me ----------
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const r = await query(
      'SELECT id, email, nombre, is_super_admin, ultimo_acceso, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (r.rowCount === 0) throw new HttpError(404, 'Usuario no encontrado');
    res.json({ user: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

export default router;
