const env = require('../config/env-config');
const { failure } = require('../utils/http-response');

function errorHandler(err, req, res, next) {
  // Ocultar secretos, tokens y datos sensibles en logs
  const sanitizedUrl = (req.originalUrl || req.url).replace(/token=[^&]+/g, 'token=***');
  console.error(`[HTTP Error] ${req.method} ${sanitizedUrl}:`, err.message);

  if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    return failure(res, 'Cuerpo de solicitud con formato JSON inválido', 'INVALID_JSON', null, 400);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Error interno del servidor';
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'SERVER_ERROR');

  const details = env.isProd ? null : err.stack;

  return failure(res, message, code, details, statusCode);
}

module.exports = errorHandler;

