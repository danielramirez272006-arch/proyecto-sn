const { query, execute } = require('../../shared/config/database');
const placesRepository = require('../places/places-repository');
const eventsService = require('../events/events-service');
const auditService = require('../../shared/audit/audit-service');
const { stringSimilarityFuzzy } = require('../../shared/utils/geo-math');

const VALID_USER_ROLES = ['admin', 'organizer', 'merchant', 'business_owner', 'client'];

class AdminService {
  async updateEventStatus(eventId, status, startTime = null, endTime = null) {
    const updated = await eventsService.updateEventStatus(eventId, status, startTime, endTime);
    if (!updated) throw new Error('EVENT_NOT_FOUND');

    // Invocar de forma desacoplada al agente de operaciones de planes
    const planOperationsAgent = require('../../autonomous-agents/plan-operations-agent/affected-plans-job');
    const affectedCount = await planOperationsAgent.processEventChange(eventId, status);

    return {
      event: updated,
      affected_plans_count: affectedCount,
    };
  }

  async setPlaceVerificationLock(placeId, verified) {
    return await placesRepository.update(placeId, { verified_by_admin: verified });
  }

  async findDuplicatePlaces(threshold = 0.75) {
    const places = await placesRepository.findAll({ limit: 200 });
    const duplicates = [];

    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        const p1 = places[i];
        const p2 = places[j];

        const similarity = stringSimilarityFuzzy(p1.name, p2.name);
        if (similarity >= threshold) {
          duplicates.push({
            similarity,
            primary: p1,
            duplicate: p2,
          });
        }
      }
    }
    return duplicates;
  }

  async mergePlaces(primaryId, duplicateId) {
    const primary = await placesRepository.findById(primaryId);
    const duplicate = await placesRepository.findById(duplicateId);
    if (!primary || !duplicate) throw new Error('PLACE_NOT_FOUND');

    // Redirigir paradas del duplicado al primario
    await execute('UPDATE plan_stops SET place_id = ? WHERE place_id = ?', [primaryId, duplicateId]);
    await execute('UPDATE events SET place_id = ? WHERE place_id = ?', [primaryId, duplicateId]);
    await placesRepository.delete(duplicateId);

    return { ok: true, merged_into: primaryId, removed: duplicateId };
  }

  async listUsers() {
    const users = await query(
      `SELECT u.id, u.name, u.email, u.role, u.gps_trust_score, u.created_at,
              v.zone, v.phone, v.has_pet
       FROM users u
       LEFT JOIN user_vaults v ON v.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    return (users || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      gps_trust_score: u.gps_trust_score,
      zone: u.zone || 'San José, Costa Rica',
      phone: u.phone || null,
      has_pet: Boolean(u.has_pet),
      created_at: u.created_at
    }));
  }

  async getAuditLogs() {
    const history = await query('SELECT * FROM plan_history ORDER BY created_at DESC LIMIT 50');
    return history.map(h => {
      let snap = {};
      try { snap = JSON.parse(h.snapshot); } catch {}
      return { ...h, snapshot: snap };
    });
  }

  async listUsers({ role, search } = {}) {
    const clauses = [];
    const params = [];

    if (role && VALID_USER_ROLES.includes(String(role).trim())) {
      clauses.push('role = ?');
      params.push(String(role).trim());
    }

    if (search && String(search).trim()) {
      const pattern = `%${String(search).trim().toLowerCase()}%`;
      clauses.push('(LOWER(name) LIKE ? OR LOWER(email) LIKE ?)');
      params.push(pattern, pattern);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    return await query(
      `SELECT id, name, email, role, gps_trust_score, created_at, updated_at
       FROM users ${where}
       ORDER BY created_at DESC`,
      params
    );
  }

  async updateUserRole(targetUserId, newRole, actorUserId = null, req = null) {
    const cleanRole = String(newRole || '').trim();
    if (!VALID_USER_ROLES.includes(cleanRole)) {
      throw new Error('INVALID_ROLE');
    }

    const rows = await query('SELECT id, name, email, role, gps_trust_score FROM users WHERE id = ?', [targetUserId]);
    if (!rows || rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }

    const existing = rows[0];
    if (actorUserId && actorUserId === targetUserId && cleanRole !== 'admin') {
      throw new Error('CANNOT_DEMOTE_SELF');
    }

    await execute(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [cleanRole, targetUserId]
    );

    await auditService.record({
      userId: actorUserId,
      action: 'USER_ROLE_UPDATED',
      resource: 'users',
      resourceId: targetUserId,
      details: { previous_role: existing.role, new_role: cleanRole },
      req,
    });

    const updated = await query(
      'SELECT id, name, email, role, gps_trust_score, created_at, updated_at FROM users WHERE id = ?',
      [targetUserId]
    );
    return updated[0];
  }
}

module.exports = new AdminService();

