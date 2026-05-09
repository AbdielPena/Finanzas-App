// ============================================
// Manejador centralizado de errores
// ============================================
import { config } from '../config/env.js';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, res) {
  res.status(404).json({
    error: 'not_found',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) { // eslint-disable-line
  // Errores de Zod
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      error: 'validation_error',
      details: err.errors,
    });
  }

  // HttpError personalizado
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details,
    });
  }

  // Decide si exponemos detalles internos al cliente. Antes dependiamos
  // SOLO de NODE_ENV !== 'production', lo que era frágil: una variable
  // de entorno mal configurada en cPanel podia leak stack traces a
  // produccion. Ahora cualquiera de los dos basta para exponer:
  //   - explicito: EXPOSE_ERRORS=1
  //   - default:   nodeEnv === 'development' o 'test'
  const exposeErrors = config.exposeErrors === true
    || ['development', 'test'].includes(config.nodeEnv);

  // Errores de PostgreSQL
  if (err?.code && /^[0-9A-Z]{5}$/.test(err.code)) {
    console.error('[pg-error]', err.code, err.message);
    return res.status(500).json({
      error: 'database_error',
      ...(exposeErrors && { details: err.message }),
    });
  }

  console.error('[unhandled]', err);
  res.status(500).json({
    error: 'internal_server_error',
    ...(exposeErrors && { stack: err.stack }),
  });
}
