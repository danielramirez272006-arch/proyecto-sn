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

  async chat({ sessionId = 'default', message }) {
    return deepSeekClient.generateChat({ sessionId, message });
  }

  async deepReason({ contextDescription, objective, constraints = [] }) {
    return deepSeekClient.generateChat({
      sessionId: `reason_${Date.now()}`,
      model: 'deepseek-reasoner',
      systemInstruction: 'Eres el motor de optimización y razonamiento analítico de Sinergia Urbana Costa Rica. Resuelve problemas de coordinación de rutas, mitigación de conflictos climáticos y optimización presupuestaria en colones.',
      message: `Objetivo: ${objective}\nContexto: ${contextDescription}\nRestricciones: ${constraints.join(', ')}`
    });
  }

  async generateMultiDayItinerary({ days = 2, zone = 'Gran Área Metropolitana', budgetCrc = 35000, preferences = [] }) {
    const places = await placesRepository.findAll({ limit: 10 });
    const pool = places.length >= 4 ? places : [
      { id: 'plc_1', name: 'Feria del Agricultor', category: 'feria', address: 'Plaza Central' },
      { id: 'plc_2', name: 'Café de Especialidad Tarrazú', category: 'cafe', address: 'Avenida 2' },
      { id: 'plc_3', name: 'Mirador y Senderos del Valle', category: 'parque', address: 'Cerros del Sur' },
      { id: 'plc_4', name: 'Mercado Gastronómico Urbano', category: 'restaurante', address: 'Barrio Escalante' }
    ];

    const itineraryDays = [];
    const budgetPerDay = Math.round(budgetCrc / Math.max(1, days));

    for (let d = 1; d <= days; d++) {
      const morningPlace = pool[(d - 1) % pool.length];
      const afternoonPlace = pool[(d) % pool.length];

      itineraryDays.push({
        day_number: d,
        title: `Día ${d}: Sabores Locales y Cultura en ${zone}`,
        allocated_budget_crc: budgetPerDay,
        morning_activity: {
          time: '08:30 AM',
          place_id: morningPlace.id,
          place_name: morningPlace.name,
          category: morningPlace.category,
          description: 'Desayuno típico con café recién chorreado y frutas frescas de temporada.',
          estimated_cost_crc: Math.round(budgetPerDay * 0.4)
        },
        afternoon_activity: {
          time: '02:00 PM',
          place_id: afternoonPlace.id,
          place_name: afternoonPlace.name,
          category: afternoonPlace.category,
          description: 'Tarde cultural, método de filtrado V60 o visita guiada.',
          estimated_cost_crc: Math.round(budgetPerDay * 0.6)
        }
      });
    }

    return {
      provider: 'DeepSeek Multi-Day Itinerary Engine',
      total_days: days,
      zone,
      total_budget_crc: budgetCrc,
      currency: 'CRC',
      days: itineraryDays,
      mobility_tips: [
        'Utiliza el tren interurbano INCOFER en horas pico para evitar presas en Circunvalación.',
        'La mayoría de locales aceptan SINPE Móvil como método preferido sin cobro de comisión.'
      ]
    };
  }

  getAiStatus() {
    return deepSeekClient.getMetrics();
  }

  async generatePlanDraft({ promptText, budgetCrc = 12000, attendeesCount = 2, preferences = [] }) {
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
