/**
 * Cliente HTTP Resiliente con Tiempos de Espera, Reintentos Acotados y Pausa ante Fallos
 * - 100% Sin costo, sin tarjeta de crédito
 * - Circuit breaker simple por host
 * - Soporte para Retry-After
 */

class ResilientHttpClient {
  constructor() {
    this.failureCountByHost = new Map();
    this.pausedUntilByHost = new Map();
    this.maxFailuresBeforePause = 3;
    this.pauseDurationMs = 30000; // 30s de pausa ante caídas del proveedor
  }

  getHost(url) {
    try {
      return new URL(url).host;
    } catch {
      return 'default';
    }
  }

  isHostPaused(host) {
    const pausedUntil = this.pausedUntilByHost.get(host);
    if (!pausedUntil) return false;
    if (Date.now() > pausedUntil) {
      this.pausedUntilByHost.delete(host);
      this.failureCountByHost.set(host, 0);
      return false;
    }
    return true;
  }

  recordFailure(host) {
    const count = (this.failureCountByHost.get(host) || 0) + 1;
    this.failureCountByHost.set(host, count);
    if (count >= this.maxFailuresBeforePause) {
      console.warn(`[HttpClient] Proveedor ${host} falló repetidamente. Pausando llamadas por ${this.pauseDurationMs / 1000}s`);
      this.pausedUntilByHost.set(host, Date.now() + this.pauseDurationMs);
    }
  }

  recordSuccess(host) {
    this.failureCountByHost.set(host, 0);
  }

  async fetchWithRetry(url, options = {}, retries = 2, timeoutMs = 4000) {
    const host = this.getHost(url);

    if (this.isHostPaused(host)) {
      throw new Error(`CIRCUIT_OPEN: El proveedor ${host} se encuentra temporalmente en pausa por fallos previos.`);
    }

    let attempt = 0;
    while (attempt <= retries) {
      try {
        const signal = AbortSignal.timeout(timeoutMs);
        const response = await fetch(url, { ...options, signal });

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000;
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, waitTime));
            attempt++;
            continue;
          }
        }

        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }

        this.recordSuccess(host);
        return response;
      } catch (err) {
        attempt++;
        if (attempt > retries) {
          this.recordFailure(host);
          throw err;
        }
        // Exponential backoff con jitter
        const backoff = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 200, 3000);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  async getJson(url, fallbackData = null, timeoutMs = 3500) {
    try {
      const res = await this.fetchWithRetry(url, { method: 'GET' }, 1, timeoutMs);
      return await res.json();
    } catch (err) {
      if (fallbackData !== null) {
        return fallbackData;
      }
      throw err;
    }
  }
}

module.exports = new ResilientHttpClient();

