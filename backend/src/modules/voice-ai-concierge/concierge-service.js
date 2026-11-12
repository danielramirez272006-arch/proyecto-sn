const deepSeekClient = require('../../shared/config/deepseek-config');
const placesRepository = require('../places/places-repository');

class ConciergeService {
  async processVoiceIntent(transcriptText = '') {
    const aiResult = await deepSeekClient.generateIntentOrDraft({
      systemInstruction: `Eres el Asistente Copiloto de Sinergia Urbana Costa Rica, potenciado por DeepSeek.
Analiza comandos de voz o texto en lenguaje coloquial tico (ej. "vamos por un yodito", "feria", "veterinaria de guardia", "comida rica", "presupuesto").
Devuelve exclusivamente un JSON con los campos:
- provider: "DeepSeek"
- intent: 'SEARCH_FOOD' | 'FIND_VET' | 'CREATE_PLAN' | 'EXPLORE_MAP'
- category: string
- suggested_filters: objeto con flags booleanos (pet_friendly, ley_7600, emergency_24h, specialty_coffee, etc.)
- target_route: string (ej. '/food-radar', '/vet-hub', '/group-match', '/live-map')
- clarifying_question: string breve en español amigable
- estimated_budget_crc: número entero en colones costarricenses (CRC)
- voice_response_text: síntesis concisa de máximo 2 oraciones para TTS`,
      prompt: `Transcripción de voz: "${transcriptText}"`
    });

    return aiResult;
  }

  getAiStatus() {
    return deepSeekClient.getMetrics();
  }

  async generatePlanDraft({ promptText, budgetCrc = 12000, attendeesCount = 2, preferences = [] }) {
    // Buscar lugares disponibles en el catálogo
    const places = await placesRepository.findAll({ limit: 4 });
    const selected = places.slice(0, 2);

    const draft = {
      provider: 'DeepSeek',
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
