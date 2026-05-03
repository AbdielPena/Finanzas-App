// ============================================
// Auth middleware — verifica JWT access token
// ============================================
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { HttpError } from './errorHandler.js';

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new HttpError(401, 'Falta token de acceso'));
  }

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    req.user = {
      id: payload.sub,
      email: payload.email,
      isSuperAdmin: payload.isSuperAdmin === true,
    };
    req.workspaceId = req.headers['x-workspace-id'] || payload.workspaceId || null;
    next();
  } catch (e) {
    next(new HttpError(401, 'Token invalido o expirado'));
  }
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user?.isSuperAdmin) {
    return next(new HttpError(403, 'Requiere privilegios de super administrador'));
  }
  next();
}

export function requireWorkspace(req, res, next) {
  if (!req.workspaceId) {
    return next(new HttpError(400, 'Falta el header X-Workspace-Id'));
  }
  next();
}
