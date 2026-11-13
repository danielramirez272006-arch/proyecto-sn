const { formatError } = require('../utils/http-response');

class RateLimiterRegistry {
  constructor() {
    this.buckets = new Map();
  }

  createLimiter({ 
    name = 'default',
    maxRequests = 120, 
    windowMs = 60 * 1000,
    message = 'Demasiadas solicitudes. Límite de tasa excedido.',
    skipInTest = true
  } = {}) {
    return (req, res, next) => {
      if (skipInTest && process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
        return next();
      }

      const forwarded = req.headers['x-forwarded-for'];
      const ip = forwarded
        ? String(forwarded).split(',')[0].trim()
        : (req.socket?.remoteAddress || '127.0.0.1');
      const key = `${name}:${ip}`;
      const now = Date.now();

      if (this.buckets.size > 1000) {
        for (const [k, v] of this.buckets.entries()) {
          if (now > v.resetTime) this.buckets.delete(k);
        }
      }

      let record = this.buckets.get(key);
      if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + windowMs };
        this.buckets.set(key, record);
      } else {
        record.count++;
      }

      const remaining = Math.max(0, maxRequests - record.count);
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

      if (record.count > maxRequests) {
        res.setHeader('Retry-After', retryAfterSeconds);
        return res.status(429).json(formatError('RATE_LIMIT_EXCEEDED', message, {
          retry_after_seconds: retryAfterSeconds,
          limit: maxRequests
        }));
      }

      next();
    };
  }

  reset() {
    this.buckets.clear();
  }
}

const registry = new RateLimiterRegistry();

// Limiters específicos preconfigurados para producción empresarial
const globalLimiter = registry.createLimiter({
  name: 'global',
  maxRequests: 180,
  windowMs: 60 * 1000
});

const authLimiter = registry.createLimiter({
  name: 'auth',
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
  message: 'Demasiados intentos de autenticación. Intente nuevamente en 15 minutos.'
});

const aiLimiter = registry.createLimiter({
  name: 'ai-copilot',
  maxRequests: 30,
  windowMs: 60 * 1000,
  message: 'Cuota de consultas al Copiloto DeepSeek temporalmente agotada por este minuto.'
});

const voteLimiter = registry.createLimiter({
  name: 'voting',
  maxRequests: 60,
  windowMs: 60 * 1000,
  message: 'Límite de votación excedido. Evite envíos repetidos concurrentes.'
});

// Función legacy para compatibilidad
function rateLimiter(maxRequests = 120, windowMs = 60 * 1000) {
  return registry.createLimiter({ maxRequests, windowMs });
}

rateLimiter.registry = registry;
rateLimiter.globalLimiter = globalLimiter;
rateLimiter.authLimiter = authLimiter;
rateLimiter.aiLimiter = aiLimiter;
rateLimiter.voteLimiter = voteLimiter;

module.exports = rateLimiter;
