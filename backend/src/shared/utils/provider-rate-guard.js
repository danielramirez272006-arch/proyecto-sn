/**
 * Control de consumo por proceso (no global entre múltiples instancias):
 * limita concurrencia, tasa por minuto y reintentos seguros para proveedores externos.
 */
class ProviderRateGuard {
  constructor({
    name,
    maxPerMinute = 30,
    maxConcurrency = 2,
    maxRetries = 1,
    retryDelayMs = 200,
  } = {}) {
    this.name = name || 'provider';
    this.maxPerMinute = Math.max(1, Number(maxPerMinute) || 30);
    this.maxConcurrency = Math.max(1, Number(maxConcurrency) || 2);
    this.maxRetries = Math.max(0, Math.min(2, Number(maxRetries) ?? 1));
    this.retryDelayMs = Math.max(50, Number(retryDelayMs) || 200);
    this.timestamps = [];
    this.activeCount = 0;
  }

  getLimitsInfo() {
    return {
      provider: this.name,
      scope: 'per_process',
      max_per_minute: this.maxPerMinute,
      max_concurrency: this.maxConcurrency,
      max_retries: this.maxRetries,
    };
  }

  _pruneWindow(now = Date.now()) {
    const cutoff = now - 60 * 1000;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }

  async run(fn) {
    this._pruneWindow();
    if (this.timestamps.length >= this.maxPerMinute) {
      const err = new Error(`Límite local por minuto alcanzado para ${this.name}.`);
      err.code = 'PROVIDER_LOCAL_RATE_LIMIT';
      err.status = 429;
      throw err;
    }

    if (this.activeCount >= this.maxConcurrency) {
      const err = new Error(`Límite local de concurrencia alcanzado para ${this.name}.`);
      err.code = 'PROVIDER_CONCURRENCY_LIMIT';
      err.status = 429;
      throw err;
    }

    this.timestamps.push(Date.now());
    this.activeCount += 1;

    try {
      let attempt = 0;
      while (true) {
        try {
          return await fn();
        } catch (err) {
          const retryable = err?.status === 502 || err?.status === 503 || err?.status === 504;
          if (!retryable || attempt >= this.maxRetries) {
            throw err;
          }
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
        }
      }
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
    }
  }
}

module.exports = { ProviderRateGuard };
