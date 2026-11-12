const { query, execute } = require('../../shared/config/database');
const proposeAlternative = require('./propose-alternative');
const sseBroadcaster = require('../../shared/realtime/sse-broadcaster');

class AffectedPlansJob {
  async processEventChange(eventId, newStatus) {
    if (newStatus !== 'cancelled' && newStatus !== 'rescheduled') {
      return 0;
    }

    // Buscar paradas activas asociadas a este evento
    const affectedRows = await query(`
      SELECT DISTINCT p.id AS plan_id, p.code AS plan_code, p.revision AS plan_revision, p.organizer_id,
             e.title AS event_title, e.status AS event_status
      FROM plan_stops s
      JOIN plan_options o ON s.option_id = o.id
      JOIN plans p ON o.plan_id = p.id
      JOIN events e ON s.event_id = e.id
      WHERE s.event_id = ? AND p.status IN ('active', 'confirmed')
    `, [eventId]);

    if (!affectedRows || affectedRows.length === 0) return 0;

    let proposalsCreated = 0;
    for (const row of affectedRows) {
      const reason = `El evento "${row.event_title}" cambió a estado "${newStatus}". Se calculó una alternativa viable.`;
      const proposal = await proposeAlternative.generateAndRegisterProposal(row.plan_id, row.plan_revision, reason);
      if (proposal) {
        proposalsCreated++;
        sseBroadcaster.broadcast(`plan:${row.plan_code}`, 'PROPOSAL_GENERATED', {
          proposal_id: proposal.id,
          reason,
          plan_revision: row.plan_revision,
        });
      }
    }

    return proposalsCreated;
  }
}

module.exports = new AffectedPlansJob();
