const crypto = require('node:crypto');
const metricsCollector = require('../telemetry/metrics-collector');

function requestTracer(req, res, next) {
  const start = Date.now();

  // 1. Obtener o generar x-request-id único
  const incomingId = req.headers['x-request-id'];
  const requestId = incomingId || `req_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  req.id = requestId;
  res.setHeader('x-request-id', requestId);

  // 2. Interceptar finalización de la respuesta
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    res.setHeader('x-response-time', `${duration}ms`);

    // Registrar en colector de métricas
    const routePattern = req.baseUrl || req.path || '/';
    metricsCollector.recordHttpRequest(req.method, routePattern, res.statusCode, duration);

    // Logging estructurado en desarrollo y producción
    if (process.env.NODE_ENV !== 'test') {
      const logEntry = {
        level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
        timestamp: new Date().toISOString(),
        request_id: requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        duration_ms: duration,
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
      };
      if (logEntry.level === 'ERROR') {
        console.error(JSON.stringify(logEntry));
      } else {
        console.log(JSON.stringify(logEntry));
      }
    }

    return originalEnd.apply(this, args);
  };

  next();
}

module.exports = requestTracer;
