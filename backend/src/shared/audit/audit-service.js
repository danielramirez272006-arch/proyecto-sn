const crypto = require('node:crypto');
const { query, execute } = require('../config/database');

class AuditService {
  async record({ userId = null, action, resource, resourceId = null, details = {}, req = null }) {
    try {
      const id = `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const ipAddress = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
      const userAgent = (req?.headers?.['user-agent'] || '').slice(0, 255);
      const detailsJson = JSON.stringify(details);

      await execute(`
        INSERT INTO audit_trail (id, user_id, action, resource, resource_id, details_json, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [id, userId, action, resource, resourceId, detailsJson, ipAddress, userAgent]);

      return { id, action, recorded: true };
    } catch (err) {
      console.warn('[AuditService] Error registrando evento de auditoría:', err.message);
      return { recorded: false, error: err.message };
    }
  }

  async getHistory({ resource = null, resourceId = null, userId = null, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const params = [];

    if (resource) {
      conditions.push('resource = ?');
      params.push(resource);
    }
    if (resourceId) {
      conditions.push('resource_id = ?');
      params.push(resourceId);
    }
    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const rows = await query(`
      SELECT id, user_id, action, resource, resource_id, details_json, ip_address, user_agent, created_at
      FROM audit_trail
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, params);

    return (rows || []).map(r => ({
      ...r,
      details: r.details_json ? JSON.parse(r.details_json) : {}
    }));
  }
}

module.exports = new AuditService();
