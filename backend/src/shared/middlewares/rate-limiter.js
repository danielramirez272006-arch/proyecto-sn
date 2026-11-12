const { failure } = require('../utils/http-response');

const ipRequests = new Map();
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_MINUTE = 120;

function rateLimiter(maxRequests = MAX_REQUESTS_PER_MINUTE, windowMs = WINDOW_MS) {
  return (req, res, next) => {
    // Si estamos en entorno de testing, no limitar
    if (process.env.NODE_ENV === 'test') return next();

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    let record = ipRequests.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      ipRequests.set(ip, record);
    } else {
      record.count++;
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));

    if (record.count > maxRequests) {
      return failure(res, 'Demasiadas solicitudes. Límite de tasa excedido.', 'RATE_LIMIT_EXCEEDED', null, 429);
    }

    next();
  };
}

module.exports = rateLimiter;

