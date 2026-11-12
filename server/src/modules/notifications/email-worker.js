const notificationService = require('./notification-service');

class EmailWorker {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.intervalMs = 5000;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(async () => {
      try {
        await notificationService.processPendingOutbox();
      } catch (err) {
        console.error('[EmailWorker] Error procesando cola outbox:', err.message);
      }
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }
}

module.exports = new EmailWorker();

