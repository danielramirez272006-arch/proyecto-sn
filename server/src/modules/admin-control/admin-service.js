const { query, execute } = require('../../shared/config/database');
const placesRepository = require('../places/places-repository');
const eventsService = require('../events/events-service');
const { stringSimilarityFuzzy } = require('../../shared/utils/geo-math');

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

  async getAuditLogs() {
    const history = await query('SELECT * FROM plan_history ORDER BY created_at DESC LIMIT 50');
    return history.map(h => {
      let snap = {};
      try { snap = JSON.parse(h.snapshot); } catch {}
      return { ...h, snapshot: snap };
    });
  }
}

module.exports = new AdminService();

