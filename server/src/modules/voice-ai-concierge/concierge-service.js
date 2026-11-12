const geminiClient = require('../../shared/config/gemini-config');
const placesRepository = require('../places/places-repository');

class ConciergeService {
  async processVoiceIntent(transcriptText = '') {
    const aiResult = await geminiClient.generateIntentOrDraft({
      prompt: `Analiza este comando de voz de un usuario en Costa Rica: "${transcriptText}".
Determina la intención ('SEARCH_FOOD', 'FIND_VET', 'CREATE_PLAN', 'EXPLORE_MAP'), filtros sugeridos, categoría, ruta destino, texto corto para sintetizar por voz y presupuesto estimado en Colones (CRC).`
    });

    return aiResult;
  }

  async generatePlanDraft({ promptText, budgetCrc = 12000, attendeesCount = 2, preferences = [] }) {
    // Buscar lugares disponibles en el catálogo
    const places = await placesRepository.findAll({ limit: 4 });
    const selected = places.slice(0, 2);

    const draft = {
      draft_id: `drf_${Date.now()}`,
      suggested_title: `Salida de ${attendeesCount} personas: Café y Sabores Locales`,
      estimated_budget_crc: budgetCrc,
      budget_per_person_crc: Math.round(budgetCrc / Math.max(1, attendeesCount)),
      clarifying_questions: [
        '¿Desean transporte en tren o vehículo propio?',
        '¿Llevarán mascotas que requieran terraza pet-friendly?'
      ],
      proposed_stops: selected.map((p, idx) => ({
        place_id: p.id,
        place_name: p.name,
        category: p.category,
        address: p.address,
        order: idx + 1,
        duration_minutes: 75,
        estimated_cost_crc: Math.round(budgetCrc / Math.max(1, selected.length)),
      })),
      voice_summary: `He preparado un borrador con ${selected.length} paradas recomendadas para un presupuesto de ${budgetCrc} colones.`
    };

    return draft;
  }
}

module.exports = new ConciergeService();

