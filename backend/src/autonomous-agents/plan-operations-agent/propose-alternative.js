const { execute } = require('../../shared/config/database');
const placesRepository = require('../../modules/places/places-repository');

class ProposeAlternative {
  async generateAndRegisterProposal(planId, currentRevision, reason) {
    // Consultar lugares alternativos en el catálogo compartido
    const backupPlaces = await placesRepository.findAll({ category: 'cafe', limit: 2 });
    const selectedPlace = backupPlaces[0] || {
      id: 'plc_cafe_1',
      name: 'Café Montaña Verde Specialty',
      address: '150m Oeste del Mercado Municipal'
    };

    const proposalId = `prp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const alternativeData = {
      title: 'Plan B: Recorrido Gastronómico Resguardado',
      estimated_cost_crc: 9000,
      stops: [
        {
          place_id: selectedPlace.id,
          event_id: null,
          start_time: new Date(Date.now() + 3600000).toISOString(),
          end_time: new Date(Date.now() + 7200000).toISOString(),
          notes: 'Refugio bajo techo con menú de repostería artesanal'
        }
      ]
    };

    await execute(
      `INSERT INTO plan_proposals (id, plan_id, plan_revision, reason, alternative_data, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [proposalId, planId, currentRevision, reason, JSON.stringify(alternativeData)]
    );

    return { id: proposalId, planId, currentRevision, reason, alternativeData };
  }
}

module.exports = new ProposeAlternative();
