const { execute } = require('../../shared/config/database');

class ExpiredRecordsPurger {
  async purgeOldRecords(daysOld = 30) {
    const cutoffSql = new Date(Date.now() - Math.max(1, Number(daysOld) || 30) * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);

    // Compatible con Supabase PostgreSQL, MySQL y SQLite (sin funciones propietarias DATE_SUB)
    await execute(
      `DELETE FROM notification_outbox WHERE status = 'sent' AND created_at < ?`,
      [cutoffSql]
    );

    return { ok: true, cutoff: cutoffSql, purged_at: new Date().toISOString() };
  }
}

module.exports = new ExpiredRecordsPurger();
