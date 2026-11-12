const { execute } = require('../../shared/config/database');

class PlaceCorrectionService {
  async submitCorrection({ place_id, proposed_data, evidence_url, submitted_by = 'merchant' }) {
    const id = `cor_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const dataStr = typeof proposed_data === 'object' ? JSON.stringify(proposed_data) : proposed_data;

    await execute(
      `INSERT INTO place_corrections (id, place_id, proposed_data, evidence_url, status, submitted_by)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [id, place_id, dataStr, evidence_url || '', submitted_by]
    );

    return { id, place_id, status: 'pending', created_at: new Date().toISOString() };
  }
}

module.exports = new PlaceCorrectionService();

