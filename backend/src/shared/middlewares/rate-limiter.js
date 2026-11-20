const { formatError } = require('../utils/http-response');

/**
 * IP del cliente. Solo se confía en X-Forwarded-For cuando el despliegue está detrás de un
 * proxy de confianza (TRUST_PROXY=true); de lo contrario un atacante podría falsificar el
 * encabezado para evadir los límites de intentos.
 */
function clientIp(req) {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = req.headers && req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

class RateLimiterRegistry {
  constructor() {
    this.buckets = new Map();
  }

  createLimiter({ 
    name = 'default',
    maxRequests = 120, 
    windowMs = 60 * 1000,
    message = 'Demasiadas solicitudes. Límite de tasa excedido.',
    skipInTest = true,
    keyFn = null
  } = {}) {
    return (req, res, next) => {
      if (skipInTest && process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
        return next();
      }

      const identity = keyFn ? String(keyFn(req) || clientIp(req)) : clientIp(req);
      const key = `${name}:${identity}`;
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

// Límite por cuenta (correo) para frenar fuerza bruta aunque cambie la IP
const loginEmailLimiter = registry.createLimiter({
  name: 'login-email',
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
  message: 'Demasiados intentos para esta cuenta. Intenta nuevamente en 15 minutos.',
  keyFn: (req) => String(req.body?.email || '').trim().toLowerCase()
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
rateLimiter.loginEmailLimiter = loginEmailLimiter;
rateLimiter.voteLimiter = voteLimiter;

module.exports = rateLimiter;
