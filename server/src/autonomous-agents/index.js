const affectedPlansJob = require('./plan-operations-agent/affected-plans-job');
const proposeAlternative = require('./plan-operations-agent/propose-alternative');
const osmScannerJob = require('./cartographer-agent/osm-scanner-job');
const duplicateFuzzyDetector = require('./cartographer-agent/duplicate-fuzzy-detector');
const autoTaggerAi = require('./cartographer-agent/auto-tagger-ai');
const dailyBriefingJob = require('./weather-editor-agent/daily-briefing-job');
const holidayFuelSyncJob = require('./weather-editor-agent/holiday-fuel-sync-job');
const reportConsensusJob = require('./consensus-moderator-agent/report-consensus-job');
const lostPetVisualMatcher = require('./consensus-moderator-agent/lost-pet-visual-matcher');
const ghostPlaceCleaner = require('./consensus-moderator-agent/ghost-place-cleaner');
const invoicePriceExtractor = require('./consensus-moderator-agent/invoice-price-extractor');
const expiredRecordsPurger = require('./maintenance-agent/expired-records-purger');
const deadLinkPhoneHealer = require('./maintenance-agent/dead-link-phone-healer');
const hypeScoreCalculator = require('./maintenance-agent/hype-score-calculator');
const autoBackupJson = require('./maintenance-agent/auto-backup-json');

class AutonomousAgentsOrchestrator {
  constructor() {
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log('[Agents Orchestrator] 4 Agentes Autónomos inicializados (Cartographer, Weather Editor, Consensus Moderator, Maintenance).');
  }

  async runDailyMaintenance() {
    console.log('[Agents Orchestrator] Ejecutando rutina de mantenimiento programada...');
    await holidayFuelSyncJob.syncDailyIndicators();
    await expiredRecordsPurger.purgeOldRecords();
    await autoBackupJson.performBackup();
  }
}

module.exports = {
  orchestrator: new AutonomousAgentsOrchestrator(),
  affectedPlansJob,
  proposeAlternative,
  osmScannerJob,
  duplicateFuzzyDetector,
  autoTaggerAi,
  dailyBriefingJob,
  holidayFuelSyncJob,
  reportConsensusJob,
  lostPetVisualMatcher,
  ghostPlaceCleaner,
  invoicePriceExtractor,
  expiredRecordsPurger,
  deadLinkPhoneHealer,
  hypeScoreCalculator,
  autoBackupJson,
};

