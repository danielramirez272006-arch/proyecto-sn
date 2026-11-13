const { query, execute } = require('../../shared/config/database');

class EventsService {
  async listEvents({ status, category, fromDate, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT e.*, p.name AS place_name, p.lat AS place_lat, p.lng AS place_lng, p.address AS place_address 
      FROM events e 
      LEFT JOIN places p ON e.place_id = p.id 
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND e.status = ?';
      params.push(status);
    }
    if (category) {
      sql += ' AND e.category = ?';
      params.push(category);
    }
    if (fromDate) {
      sql += ' AND e.end_time >= ?';
      params.push(fromDate);
    }

    sql += ' ORDER BY e.start_time ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await query(sql, params);
    return rows;
  }

  async getEventById(id) {
    const rows = await query(`
      SELECT e.*, p.name AS place_name, p.lat AS place_lat, p.lng AS place_lng, p.address AS place_address 
      FROM events e 
      LEFT JOIN places p ON e.place_id = p.id 
      WHERE e.id = ?
    `, [id]);
    return rows[0] || null;
  }

  async updateEventStatus(id, newStatus, newStartTime = null, newEndTime = null) {
    const current = await this.getEventById(id);
    if (!current) return null;

    let sql = 'UPDATE events SET status = ?';
    const params = [newStatus];

    if (newStartTime && newEndTime) {
      sql += ', start_time = ?, end_time = ?';
      params.push(newStartTime, newEndTime);
    }

    sql += ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params.push(id);

    await execute(sql, params);
    return this.getEventById(id);
  }
}

module.exports = new EventsService();

