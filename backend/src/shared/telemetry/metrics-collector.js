class MetricsCollector {
  constructor() {
    this.httpRequestsTotal = new Map();
    this.httpRequestDurations = [];
    this.dbQueriesTotal = 0;
    this.dbErrorsTotal = 0;
    this.deepSeekRequestsTotal = 0;
    this.deepSeekFallbacksTotal = 0;
    this.startTime = Date.now();
  }

  recordHttpRequest(method, route, statusCode, durationMs) {
    const statusGroup = `${Math.floor(statusCode / 100)}xx`;
    const key = `${method.toUpperCase()}_${route}_${statusGroup}`;
    const count = this.httpRequestsTotal.get(key) || 0;
    this.httpRequestsTotal.set(key, count + 1);

    // Guardar muestra para percentiles (máximo 500 muestras en memoria)
    this.httpRequestDurations.push(durationMs);
    if (this.httpRequestDurations.length > 500) {
      this.httpRequestDurations.shift();
    }
  }

  recordDbQuery(success = true) {
    this.dbQueriesTotal++;
    if (!success) this.dbErrorsTotal++;
  }

  recordDeepSeekCall(fallback = false) {
    this.deepSeekRequestsTotal++;
    if (fallback) this.deepSeekFallbacksTotal++;
  }

  calculatePercentiles() {
    if (this.httpRequestDurations.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0, avg: 0 };
    }
    const sorted = [...this.httpRequestDurations].sort((a, b) => a - b);
    const getP = (p) => {
      const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
      return Number(sorted[idx].toFixed(2));
    };
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    return {
      p50: getP(50),
      p90: getP(90),
      p95: getP(95),
      p99: getP(99),
      avg: Number((sum / sorted.length).toFixed(2))
    };
  }

  getMetricsSummary() {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      uptime_seconds: uptimeSec,
      process: {
        cpu_user_ms: Math.round(cpu.user / 1000),
        cpu_system_ms: Math.round(cpu.system / 1000),
        memory_rss_bytes: mem.rss,
        memory_heap_used_bytes: mem.heapUsed,
        memory_heap_total_bytes: mem.heapTotal,
        memory_rss_mb: Number((mem.rss / 1024 / 1024).toFixed(2)),
        memory_heap_used_mb: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
      },
      http: {
        total_requests: Array.from(this.httpRequestsTotal.values()).reduce((a, b) => a + b, 0),
        latency_ms: this.calculatePercentiles(),
        routes_breakdown: Object.fromEntries(this.httpRequestsTotal)
      },
      database: {
        queries_total: this.dbQueriesTotal,
        errors_total: this.dbErrorsTotal,
      },
      ai_copilot: {
        deepseek_requests_total: this.deepSeekRequestsTotal,
        deepseek_fallbacks_total: this.deepSeekFallbacksTotal,
      }
    };
  }

  toPrometheusFormat() {
    const summary = this.getMetricsSummary();
    const lines = [
      '# HELP nodejs_uptime_seconds Number of seconds the process has been running',
      '# TYPE nodejs_uptime_seconds counter',
      `nodejs_uptime_seconds ${summary.uptime_seconds}`,
      '',
      '# HELP nodejs_memory_rss_bytes Resident Set Size in bytes',
      '# TYPE nodejs_memory_rss_bytes gauge',
      `nodejs_memory_rss_bytes ${summary.process.memory_rss_bytes}`,
      '',
      '# HELP nodejs_memory_heap_used_bytes Memory heap used in bytes',
      '# TYPE nodejs_memory_heap_used_bytes gauge',
      `nodejs_memory_heap_used_bytes ${summary.process.memory_heap_used_bytes}`,
      '',
      '# HELP http_requests_total Total number of HTTP requests made',
      '# TYPE http_requests_total counter'
    ];

    for (const [key, val] of this.httpRequestsTotal.entries()) {
      const parts = key.split('_');
      const statusGroup = parts.pop();
      const method = parts.shift();
      const route = parts.join('_') || '/';
      lines.push(`http_requests_total{method="${method}",route="${route}",status="${statusGroup}"} ${val}`);
    }

    lines.push(
      '',
      '# HELP http_request_duration_ms HTTP request latency percentiles in milliseconds',
      '# TYPE http_request_duration_ms gauge',
      `http_request_duration_ms{quantile="0.5"} ${summary.http.latency_ms.p50}`,
      `http_request_duration_ms{quantile="0.95"} ${summary.http.latency_ms.p95}`,
      `http_request_duration_ms{quantile="0.99"} ${summary.http.latency_ms.p99}`,
      '',
      '# HELP db_queries_total Total database queries executed',
      '# TYPE db_queries_total counter',
      `db_queries_total ${summary.database.queries_total}`,
      `db_errors_total ${summary.database.errors_total}`,
      '',
      '# HELP deepseek_requests_total Total calls to DeepSeek AI Copilot',
      '# TYPE deepseek_requests_total counter',
      `deepseek_requests_total ${summary.ai_copilot.deepseek_requests_total}`,
      `deepseek_fallbacks_total ${summary.ai_copilot.deepseek_fallbacks_total}`
    );

    return lines.join('\n');
  }
}

module.exports = new MetricsCollector();
