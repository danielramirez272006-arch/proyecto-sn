const affectedPlansJob = require('./plan-operations-agent/affected-plans-job');
const reportConsensusJob = require('./consensus-moderator-agent/report-consensus-job');
const expiredRecordsPurger = require('./maintenance-agent/expired-records-purger');
const autoBackupJson = require('./maintenance-agent/auto-backup-json');
const holidayFuelSyncJob = require('./weather-editor-agent/holiday-fuel-sync-job');
const dailyBriefingJob = require('./weather-editor-agent/daily-briefing-job');
const hypeScoreCalculator = require('./maintenance-agent/hype-score-calculator');
const { emailWorker } = require('../modules/notifications');

class AgentScheduler {
  constructor() {
    this.intervals = new Map();
    this.jobs = {
      'affected-plans-monitor': {
        name: 'affected-plans-monitor',
        description: 'Detección automática de planes grupales afectados por cancelaciones o clima adverso',
        intervalMs: 60 * 1000, // Cada 1 minuto
        lastRun: null,
        lastResult: null,
        runCount: 0,
        handler: async () => affectedPlansJob.checkAndProposeForAffectedPlans(),
      },
      'report-consensus-job': {
        name: 'report-consensus-job',
        description: 'Consenso y verificación comunitaria de reportes ciudadanos en tiempo real',
        intervalMs: 90 * 1000,
        lastRun: null,
        lastResult: null,
        runCount: 0,
        handler: async () => reportConsensusJob.evaluateConsensus(),
      },
      'expired-records-purger': {
        name: 'expired-records-purger',
        description: 'Purga de propuestas obsoletas, borradores abandonados y logs antiguos',
        intervalMs: 15 * 60 * 1000, // Cada 15 minutos
        lastRun: null,
        lastResult: null,
        runCount: 0,
        handler: async () => expiredRecordsPurger.purgeOldRecords(),
      },
      'auto-backup-json': {
        name: 'auto-backup-json',
        description: 'Copia de seguridad incremental del almacén JSON local para desarrollo offline',
        intervalMs: 30 * 60 * 1000, // Cada 30 minutos
        lastRun: null,
        lastResult: null,
        runCount: 0,
        handler: async () => autoBackupJson.performBackup(),
      },
      'daily-indicators-sync': {
        name: 'daily-indicators-sync',
        description: 'Sincronización con RECOPE (combustibles) y Nager.Date (feriados de Costa Rica)',
        intervalMs: 6 * 60 * 60 * 1000, // Cada 6 horas
        lastRun: null,
        lastResult: null,
        runCount: 0,
        handler: async () => holidayFuelSyncJob.syncDailyIndicators(),
      },
      'weather-briefing-sync': {
        name: 'weather-briefing-sync',
        description: 'Pronóstico matutino y alertas de lluvia vía Open-Meteo para Costa Rica',
        intervalMs: 3 * 60 * 60 * 1000, // Cada 3 horas
        lastRun: null,
        lastResult: null,
        runCount: 0,
        handler: async () => dailyBriefingJob.generateBriefing(),
      },
      'hype-score-recalculator': {
        name: 'hype-score-recalculator',
        description: 'Puntaje de tendencia comunitaria y relevancia de comercios locales',
        intervalMs: 20 * 60 * 1000,
        lastRun: null,
        lastResult: null,
        runCount: 0,
        handler: async () => hypeScoreCalculator.recalculateAllScores(),
      }
    };
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Agent Scheduler] Iniciando temporizadores de los agentes autónomos...');

    for (const [key, job] of Object.entries(this.jobs)) {
      // Configurar temporizador periódico
      const timer = setInterval(() => {
        this.runJob(key).catch(err => {
          console.warn(`[Agent Scheduler] Error en ejecución periódica de ${key}:`, err.message);
        });
      }, job.intervalMs);

      // Unref para no retener el proceso en tests unitarios
      if (typeof timer.unref === 'function') {
        timer.unref();
      }

      this.intervals.set(key, timer);
    }
  }

  stop() {
    for (const [key, timer] of this.intervals.entries()) {
      clearInterval(timer);
    }
    this.intervals.clear();
    this.isRunning = false;
    console.log('[Agent Scheduler] Todos los temporizadores han sido detenidos.');
  }

  async runJob(jobName) {
    const job = this.jobs[jobName];
    if (!job) {
      throw new Error(`Tarea de agente no encontrada: "${jobName}"`);
    }

    const start = Date.now();
    try {
      const result = await job.handler();
      job.lastRun = new Date().toISOString();
      job.lastResult = result || { status: 'completed' };
      job.runCount++;
      job.durationMs = Date.now() - start;
      return {
        ok: true,
        job: jobName,
        duration_ms: job.durationMs,
        result: job.lastResult
      };
    } catch (err) {
      job.lastRun = new Date().toISOString();
      job.lastResult = { error: err.message };
      job.durationMs = Date.now() - start;
      throw err;
    }
  }

  getStatus() {
    const statusList = Object.entries(this.jobs).map(([key, j]) => ({
      name: j.name,
      description: j.description,
      interval_seconds: Math.round(j.intervalMs / 1000),
      last_run: j.lastRun,
      last_result: j.lastResult,
      run_count: j.runCount,
      duration_ms: j.durationMs || 0,
      active: this.isRunning
    }));

    return {
      scheduler_running: this.isRunning,
      active_jobs_count: statusList.length,
      jobs: statusList
    };
  }
}

module.exports = new AgentScheduler();

