const env = require('../config/env-config');
const { failure } = require('../utils/http-response');

const INTERNAL_LEAK_REGEX = /(?:SQLITE_|ERR_SQLITE|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|syntax error at or near|relation ".*" does not exist|column ".*" does not exist|password authentication failed|SELECT\s+.+\s+FROM|INSERT\s+INTO)/i;

function sanitizeErrorLogText(text = '') {
  return String(text || '')
    .replace(/(token|key|api_key|password|secret)=[^&\s]+/gi, '$1=***')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***');
}

/**
 * Manejador centralizado de condiciones excepcionales (OWASP A10:2025 - Mishandling of Exceptional Conditions).
 * - Falla cerrado (fail-closed) evitando filtrar trazas SQL, rutas del sistema o secretos en respuestas 5xx.
 * - Normaliza JSON malformado (400), payloads sobredimensionados (413) y timeouts (408/504).
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const sanitizedUrl = sanitizeErrorLogText(req.originalUrl || req.url || '');
  const safeLogMessage = sanitizeErrorLogText(err?.message || 'Unknown error');
  console.error(`[HTTP Error] [${req.id || 'no-req-id'}] ${req.method} ${sanitizedUrl}:`, safeLogMessage);

  if (err?.name === 'SyntaxError' && err?.status === 400 && 'body' in err) {
    return failure(res, 'Cuerpo de solicitud con formato JSON inválido', 'INVALID_JSON', null, 400);
  }

  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return failure(res, 'El cuerpo de la solicitud excede el tamaño máximo permitido', 'PAYLOAD_TOO_LARGE', null, 413);
  }

  if (err?.code === 'ETIMEDOUT' || err?.name === 'AbortError' || err?.status === 408) {
    return failure(res, 'La operación excedió el tiempo máximo de espera', 'REQUEST_TIMEOUT', null, 408);
  }

  const statusCode = Number(err?.statusCode || err?.status) || 500;
  const code = err?.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');

  const rawMessage = String(err?.message || 'Error interno del servidor');
  const shouldMaskMessage =
    statusCode >= 500 && (env.isProd || INTERNAL_LEAK_REGEX.test(rawMessage));

  const publicMessage = shouldMaskMessage
    ? 'Error interno del servidor. La incidencia fue registrada de forma segura.'
    : rawMessage;

  const details = env.isProd || statusCode >= 500
    ? { request_id: req.id || null }
    : { request_id: req.id || null, stack: err?.stack };

  return failure(res, publicMessage, code, details, statusCode);
}

module.exports = errorHandler;
module.exports.sanitizeErrorLogText = sanitizeErrorLogText;
