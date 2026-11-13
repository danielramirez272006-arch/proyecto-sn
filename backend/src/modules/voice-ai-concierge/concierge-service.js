const geminiClient = require('../../shared/config/gemini-config');
const placesRepository = require('../places/places-repository');

class ConciergeService {
  async processVoiceIntent(transcriptText = '') {
    const aiResult = await geminiClient.generateIntentOrDraft({
      systemInstruction: `Eres el Asistente Bot Conversacional de Voz y Copiloto de Sinergia Urbana Costa Rica, potenciado por Google Gemini.
Analiza comandos de voz o texto en lenguaje coloquial tico (ej. "vamos por un yodito", "feria", "veterinaria de guardia", "comida rica", "presupuesto").
Devuelve exclusivamente un JSON con los campos:
- provider: "Google Gemini"
- bot_reply: respuesta conversacional cálida y natural de 2 a 3 oraciones en español costarricense ("¡Pura vida!...") recomendando opciones reales en Costa Rica según lo que pidió el usuario
- intent: 'SEARCH_FOOD' | 'FIND_VET' | 'CREATE_PLAN' | 'EXPLORE_MAP'
- category: string
- suggested_filters: objeto con flags booleanos (pet_friendly, ley_7600, emergency_24h, specialty_coffee, sinpe_movil, etc.)
- target_route: string (ej. '/food-radar', '/vet-hub', '/group-match', '/live-map')
- clarifying_question: pregunta de seguimiento conversacional breve para continuar el chat con el usuario
- estimated_budget_crc: número entero realista en colones costarricenses (CRC)
- voice_response_text: síntesis concisa de máximo 2 oraciones para lectura de voz (TTS)
- suggested_places: array de hasta 2 nombres de lugares o zonas recomendadas en Costa Rica`,
      prompt: `Mensaje o comando de voz del usuario: "${transcriptText}"`
    });

    if (aiResult && !aiResult.bot_reply) {
      aiResult.bot_reply = aiResult.voice_response_text || `¡Pura vida! He procesado tu solicitud sobre "${transcriptText}". ${aiResult.clarifying_question || ''}`;
    }

    return aiResult;
  }

  async chat({ sessionId = 'default', message }) {
    return geminiClient.generateChat({ sessionId, message });
  }

  async deepReason({ contextDescription, objective, constraints = [] }) {
    return geminiClient.generateChat({
      sessionId: `reason_${Date.now()}`,
      systemInstruction: 'Eres el motor de optimización y razonamiento analítico de Sinergia Urbana Costa Rica, potenciado por Google Gemini. Resuelve problemas de coordinación de rutas, mitigación de conflictos climáticos y optimización presupuestaria en colones.',
      message: `Objetivo: ${objective}\nContexto: ${contextDescription}\nRestricciones: ${constraints.join(', ')}`
    });
  }

  async generateMultiDayItinerary({ days = 2, zone = 'Gran Área Metropolitana', budgetCrc = 35000, preferences = [], prompt = '' }) {
    const safeDays = Math.max(1, Math.min(7, Number(days) || 2));
    const safeBudget = Math.max(0, Number(budgetCrc) || 35000);
    const places = await placesRepository.findAll({ limit: 15 });
    const pool = places.length >= 4 ? places : [
      { id: 'plc_1', name: 'Feria del Agricultor de Ciudad Colón', category: 'feria', address: 'Plaza Central de Mora' },
      { id: 'plc_2', name: 'Café de Especialidad Tarrazú & Escalante', category: 'cafe', address: 'Barrio Escalante, San José' },
      { id: 'plc_3', name: 'Mirador y Senderos del Valle Central', category: 'parque', address: 'Cerros de Escazú / Santa Ana' },
      { id: 'plc_4', name: 'Mercado Gastronómico La California', category: 'restaurante', address: 'San José Centro' }
    ];

    // En modo en vivo (fuera de pruebas unitarias offline), usar Google Gemini para generar un itinerario real y personalizado
    if (process.env.NODE_ENV !== 'test' && geminiClient.isConfigured()) {
      try {
        const placesContext = pool.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          address: p.address || p.canton || zone
        }));

        const systemInstruction = `Eres el Planificador Experto de Itinerarios de Sinergia Urbana Costa Rica, potenciado por Google Gemini.
Diseña un itinerario auténtico, variado y realista en Costa Rica para el número de días, zona, presupuesto y preferencias indicadas.
Reglas importantes:
1. NUNCA repitas el mismo título de día ni las mismas descripciones entre días. Cada día debe tener una temática distinta y lugares reales de Costa Rica.
2. Analiza el presupuesto en colones costarricenses (CRC):
   - Si el presupuesto es exorbitante o irreal (por ejemplo, millones o miles de millones de colones), coméntalo con buen humor tico en "ai_summary" (ej. que con ese presupuesto alcanza hasta para comprar la finca cafetalera entera), PERO asigna en "allocated_budget_crc" y "estimated_cost_crc" costos REALISTAS en colones costarricenses (ej. entre ₡5,000 y ₡45,000 por actividad, o experiencias VIP reales) para que el usuario tenga datos útiles.
   - Si el presupuesto es ajustado (ej. menos de ₡10,000), prioriza actividades gratuitas, parques, ferias del agricultor y sodas tradicionales económicas.
3. Devuelve exclusivamente un JSON válido con esta estructura exacta:
{
  "ai_summary": "Explicación amigable de Gemini sobre el plan diseñado y análisis del presupuesto en colones",
  "realistic_total_cost_crc": número entero con la suma realista estimada de todos los días,
  "days": [
    {
      "day_number": 1,
      "title": "Día 1: Título único y atractivo",
      "allocated_budget_crc": número entero realista en colones para ese día,
      "morning_activity": {
        "time": "08:30 AM",
        "place_id": "id del lugar o sugerido",
        "place_name": "Nombre específico del lugar en Costa Rica",
        "category": "cafe | feria | parque | cultura | restaurante",
        "description": "Descripción específica y detallada de qué hacer y qué pedir/visitar",
        "estimated_cost_crc": número entero realista
      },
      "afternoon_activity": {
        "time": "01:30 PM",
        "place_id": "id del lugar o sugerido",
        "place_name": "Nombre específico del lugar de la tarde",
        "category": "restaurante | naturaleza | museo | cafe",
        "description": "Descripción específica de la actividad de la tarde",
        "estimated_cost_crc": número entero realista
      },
      "evening_activity": {
        "time": "06:30 PM",
        "place_name": "Nombre específico para cerrar el día",
        "category": "gastronomia | mirador | cultura",
        "description": "Actividad nocturna o cena recomendada",
        "estimated_cost_crc": número entero realista
      }
    }
  ],
  "mobility_tips": ["Consejo práctico 1 de movilidad/clima/SINPE en CR", "Consejo práctico 2"]
}`;

        const userPrompt = `Solicito un itinerario en Costa Rica con estos parámetros:
- Días: ${safeDays}
- Zona principal: ${zone}
- Presupuesto ingresado por el usuario: ₡${safeBudget.toLocaleString('es-CR')} CRC
- Preferencias o estilo solicitado: ${prompt || (preferences.length ? preferences.join(', ') : 'Gastronomía local, café de especialidad, naturaleza y espacios pet-friendly')}
- Lugares de referencia en catálogo: ${JSON.stringify(placesContext)}`;

        const aiItinerary = await geminiClient.generateJson({
          prompt: userPrompt,
          systemInstruction,
          temperature: 0.35
        });

        if (aiItinerary && Array.isArray(aiItinerary.days) && aiItinerary.days.length > 0) {
          return {
            provider: 'Google Gemini Cloud (gemini-3.5-flash)',
            ai_generated: true,
            ai_summary: aiItinerary.ai_summary || `Itinerario personalizado de ${safeDays} días en ${zone}.`,
            total_days: safeDays,
            zone,
            total_budget_crc: safeBudget,
            realistic_total_cost_crc: aiItinerary.realistic_total_cost_crc || aiItinerary.days.reduce((acc, d) => acc + (Number(d.allocated_budget_crc) || 0), 0),
            currency: 'CRC',
            days: aiItinerary.days.slice(0, safeDays),
            mobility_tips: Array.isArray(aiItinerary.mobility_tips) && aiItinerary.mobility_tips.length > 0
              ? aiItinerary.mobility_tips
              : [
                  'Utiliza el tren interurbano INCOFER en horas pico para evitar presas en Circunvalación.',
                  'La mayoría de comercios aceptan SINPE Móvil sin comisión adicional.'
                ]
          };
        }
      } catch (err) {
        console.warn('[ConciergeService] Fallback en generateMultiDayItinerary:', err.message);
      }
    }

    const dayThemes = [
      'Ruta de Café de Especialidad y Mercados Locales',
      'Naturaleza, Senderos del Valle y Gastronomía Artesanal',
      'Cultura Urbana, Museos y Tardes Pet-Friendly',
      'Miradores Panorámicos y Tradición Costarricense',
      'Recorrido Sostenible y Sabores de Altura'
    ];

    const itineraryDays = [];
    const rawPerDay = Math.round(safeBudget / Math.max(1, safeDays));
    const realisticPerDay = rawPerDay > 250000 ? 35000 : (rawPerDay < 3000 ? 6000 : rawPerDay);

    for (let d = 1; d <= safeDays; d++) {
      const morningPlace = pool[(d * 2 - 2) % pool.length];
      const afternoonPlace = pool[(d * 2 - 1) % pool.length];
      const theme = dayThemes[(d - 1) % dayThemes.length];

      itineraryDays.push({
        day_number: d,
        title: `Día ${d}: ${theme} (${zone})`,
        allocated_budget_crc: realisticPerDay,
        morning_activity: {
          time: '08:30 AM',
          place_id: morningPlace.id,
          place_name: morningPlace.name,
          category: morningPlace.category,
          description: `Visita matutina a ${morningPlace.name} (${morningPlace.address || zone}): productos locales frescos y desayuno costarricense.`,
          estimated_cost_crc: Math.round(realisticPerDay * 0.4)
        },
        afternoon_activity: {
          time: '02:00 PM',
          place_id: afternoonPlace.id,
          place_name: afternoonPlace.name,
          category: afternoonPlace.category,
          description: `Recorrido de tarde en ${afternoonPlace.name}: experiencia gastronómica, métodos de extracción V60/Chemex y terraza al aire libre.`,
          estimated_cost_crc: Math.round(realisticPerDay * 0.6)
        }
      });
    }

    return {
      provider: 'Google Gemini Multi-Day Itinerary Engine',
      ai_generated: false,
      ai_summary: rawPerDay > 250000
        ? `Tu presupuesto de ₡${safeBudget.toLocaleString('es-CR')} supera ampliamente el costo promedio en ${zone}; hemos calculado un presupuesto diario realista de ₡${realisticPerDay.toLocaleString('es-CR')} por día con experiencias de primer nivel.`
        : `Itinerario optimizado para ${safeDays} días en ${zone} ajustado a tu presupuesto.`,
      total_days: safeDays,
      zone,
      total_budget_crc: safeBudget,
      realistic_total_cost_crc: realisticPerDay * safeDays,
      currency: 'CRC',
      days: itineraryDays,
      mobility_tips: [
        'Utiliza el tren interurbano INCOFER en horas pico para evitar presas en Circunvalación.',
        'La mayoría de locales aceptan SINPE Móvil como método preferido sin cobro de comisión.'
      ]
    };
  }

  getAiStatus() {
    return geminiClient.getMetrics();
  }

  async generatePlanDraft({ promptText, budgetCrc = 12000, attendeesCount = 2, preferences = [] }) {
    const places = await placesRepository.findAll({ limit: 4 });
    const selected = places.slice(0, 2);

    const draft = {
      provider: 'Google Gemini',
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
