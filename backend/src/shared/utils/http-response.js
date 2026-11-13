/**
 * Estandarización de respuestas HTTP para el Sistema de Sinergia
 * Formato unificado: { ok: boolean, data?: any, meta?: object, error?: object }
 */

function success(res, data = null, meta = {}, status = 200) {
  return res.status(status).json({
    ok: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
    error: null,
  });
}

function created(res, data = null, meta = {}) {
  return success(res, data, meta, 201);
}

function failure(res, message = 'Error interno del servidor', code = 'INTERNAL_ERROR', details = null, status = 500) {
  return res.status(status).json({
    ok: false,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
    },
    error: {
      code,
      message,
      details,
    },
  });
}

function badRequest(res, message = 'Solicitud incorrecta', details = null) {
  return failure(res, message, 'BAD_REQUEST', details, 400);
}

function unauthorized(res, message = 'No autorizado / Sesión inválida') {
  return failure(res, message, 'UNAUTHORIZED', null, 401);
}

function forbidden(res, message = 'Acceso denegado') {
  return failure(res, message, 'FORBIDDEN', null, 403);
}

function notFound(res, message = 'Recurso no encontrado') {
  return failure(res, message, 'NOT_FOUND', null, 404);
}

function conflict(res, message = 'Conflicto de concurrencia o estado', details = null) {
  return failure(res, message, 'CONFLICT', details, 409);
}

function formatSuccess(data = null, message = null, meta = {}) {
  return {
    ok: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(message ? { message } : {}),
      ...meta,
    },
    error: null,
  };
}

function formatError(code = 'INTERNAL_ERROR', message = 'Error interno', details = null) {
  return {
    ok: false,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
    },
    error: {
      code,
      message,
      details,
    },
  };
}

module.exports = {
  success,
  created,
  failure,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  formatSuccess,
  formatError,
};

