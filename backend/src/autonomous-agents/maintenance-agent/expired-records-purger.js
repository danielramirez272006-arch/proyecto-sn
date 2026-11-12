const { execute } = require('../../shared/config/database');

class ExpiredRecordsPurger {
  async purgeOldRecords() {
    // Purgar notificaciones enviadas hace más de 30 días
    await execute(`
      DELETE FROM notification_outbox 
      WHERE status = 'sent' AND created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY)
    `);
    return { ok: true, purged_at: new Date().toISOString() };
  }
}

module.exports = new ExpiredRecordsPurger();
