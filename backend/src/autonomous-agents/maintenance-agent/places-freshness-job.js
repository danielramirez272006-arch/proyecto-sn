const crypto = require('crypto');
const { query, execute } = require('../../shared/config/database');

class PlacesFreshnessJob {
  async checkExpiringEvidence(now = new Date()) {
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    let expiring = [];
    try {
      expiring = await query(
        `SELECT id, place_id, provider_name, expires_at
         FROM place_pet_evidence
         WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= ?
         LIMIT 50`,
        [sevenDaysLater]
      );
    } catch {
      return { checked: 0, events_created: 0 };
    }

    let created = 0;
    for (const row of expiring || []) {
      const idempotencyKey = `expiring:${row.id}:${String(row.expires_at).slice(0, 10)}`;
      try {
        const existing = await query('SELECT id FROM automation_events WHERE idempotency_key = ?', [idempotencyKey]);
        if (existing && existing.length > 0) continue;

        await execute(
          `INSERT INTO automation_events (id, event_type, place_id, payload_json, idempotency_key, status)
           VALUES (?, 'confirmation_expiring', ?, ?, ?, 'pending')`,
          [
            `evt_${crypto.randomBytes(8).toString('hex')}`,
            row.place_id,
            JSON.stringify({ evidence_id: row.id, provider_name: row.provider_name, expires_at: row.expires_at }),
            idempotencyKey,
          ]
        );
        created += 1;
      } catch {
        // Ignorar errores puntuales de inserción
      }
    }

    return {
      checked: (expiring || []).length,
      events_created: created,
      checked_at: now.toISOString(),
    };
  }
}

module.exports = new PlacesFreshnessJob();
