const { query, execute } = require('../../shared/config/database');

class OutboxRepository {
  async enqueue({ recipient, type, payload, idempotencyKey }) {
    const id = `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const payloadStr = typeof payload === 'object' ? JSON.stringify(payload) : payload;

    const { getDialect } = require('../../shared/config/database');
    const dialect = getDialect();

    if (dialect === 'mysql') {
      await execute(`
        INSERT INTO notification_outbox (id, recipient, type, payload, idempotency_key, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
        ON DUPLICATE KEY UPDATE status = status
      `, [id, recipient, type, payloadStr, idempotencyKey]);
    } else {
      await execute(`
        INSERT INTO notification_outbox (id, recipient, type, payload, idempotency_key, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
        ON CONFLICT(idempotency_key) DO NOTHING
      `, [id, recipient, type, payloadStr, idempotencyKey]);
    }

    return id;
  }

  async claimPendingBatch(limit = 10, leaseSeconds = 60) {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + leaseSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ');

    // Seleccionar candidatos
    const rows = await query(`
      SELECT * FROM notification_outbox 
      WHERE (status = 'pending' OR (status = 'processing' AND locked_until < CURRENT_TIMESTAMP))
        AND next_attempt_at <= CURRENT_TIMESTAMP
        AND attempts < max_attempts
      LIMIT ?
    `, [limit]);

    if (!rows || rows.length === 0) return [];

    const ids = rows.map(r => r.id);
    for (const id of ids) {
      await execute(
        "UPDATE notification_outbox SET status = 'processing', locked_until = ? WHERE id = ?",
        [leaseUntil, id]
      );
    }

    return rows.map(r => {
      let p = {};
      try { p = JSON.parse(r.payload); } catch {}
      return { ...r, payload: p };
    });
  }

  async markSent(id) {
    await execute(
      "UPDATE notification_outbox SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );
  }

  async markFailed(id, errorMessage, currentAttempts) {
    const nextAttempts = currentAttempts + 1;
    // Backoff exponencial: 2^attempts * 60 segundos
    const backoffSeconds = Math.min(3600, Math.pow(2, nextAttempts) * 60);
    const nextAttempt = new Date(Date.now() + backoffSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const newStatus = nextAttempts >= 5 ? 'failed' : 'pending';

    await execute(
      `UPDATE notification_outbox 
       SET status = ?, attempts = ?, last_error = ?, next_attempt_at = ?, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newStatus, nextAttempts, errorMessage, nextAttempt, id]
    );
  }

  async getQueueStats() {
    const rows = await query(`
      SELECT status, COUNT(*) as count 
      FROM notification_outbox 
      GROUP BY status
    `);
    const stats = { pending: 0, processing: 0, sent: 0, failed: 0 };
    for (const r of rows) {
      if (stats[r.status] !== undefined) stats[r.status] = Number(r.count);
    }
    return stats;
  }
}

module.exports = new OutboxRepository();
