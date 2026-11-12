/**
 * Caché en memoria por cuadrícula GPS (3h) para gastar $0 de cuota externa
 */

const memoryCache = new Map();
const DEFAULT_TTL_MS = 3 * 60 * 60 * 1000; // 3 Horas

function cacheGuard(ttlMs = DEFAULT_TTL_MS) {
  return (req, res, next) => {
    // Solo cachear peticiones idempotentes GET
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.originalUrl || req.url}`;
    const cached = memoryCache.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      res.setHeader('X-Cache-Status', 'HIT');
      return res.status(200).json(cached.payload);
    }

    // Interceptar res.json para guardar en cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(key, {
          payload: body,
          expiresAt: Date.now() + ttlMs,
        });
      }
      res.setHeader('X-Cache-Status', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

function clearCache(pattern = null) {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
}

module.exports = {
  cacheGuard,
  clearCache,
};

