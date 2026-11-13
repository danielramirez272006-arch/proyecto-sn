/**
 * Servicio de Caché LRU en Memoria con TTL (Time To Live).
 * Optimizado para conectores de Costa Rica (RECOPE, Hacienda, RainViewer, OSRM)
 * y consultas de catálogo recurrentes.
 *
 * Características:
 * - Límite de tamaño máximo (LRU Eviction) para prevenir fugas de memoria.
 * - TTL independiente por entrada.
 * - Método .wrap(key, ttlMs, fn) para cachear llamadas asíncronas automáticamente.
 * - Telemetría y estadísticas en tiempo real (hits, misses, ratio de acierto).
 */

class TtlCacheService {
  constructor({ maxEntries = 500, defaultTtlMs = 15 * 60 * 1000 } = {}) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0
    };
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Mover al final para orden LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      // Eliminar el primer elemento (el más antiguo / menos usado recientemente)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now()
    });
    this.stats.sets++;
    return value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  del(key) {
    return this.cache.delete(key);
  }

  clear(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Envuelve una función asíncrona: si el valor está en caché lo devuelve,
   * sino ejecuta la función, guarda el resultado y lo retorna.
   */
  async wrap(key, ttlMs, asyncFetcher) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const freshValue = await asyncFetcher();
    if (freshValue !== undefined && freshValue !== null) {
      this.set(key, freshValue, ttlMs);
    }
    return freshValue;
  }

  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRatio = totalRequests > 0 ? (this.stats.hits / totalRequests) : 0;
    return {
      size: this.cache.size,
      max_entries: this.maxEntries,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hit_ratio: Number(hitRatio.toFixed(3)),
    };
  }
}

const defaultCache = new TtlCacheService();

module.exports = {
  TtlCacheService,
  ttlCache: defaultCache
};

