const env = require('./env-config');

class GeminiSafeClient {
  constructor() {
    this.apiKey = env.gemini.apiKey;
    this.dailyLimit = env.gemini.freeTierDailyQuota;
    this.currentDate = new Date().toISOString().slice(0, 10);
    this.requestCountToday = 0;
  }

  checkQuota() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.currentDate !== today) {
      this.currentDate = today;
      this.requestCountToday = 0;
    }
    return this.requestCountToday < this.dailyLimit;
  }

  async generateIntentOrDraft({ prompt, systemInstruction, temperature = 0.2 }) {
    if (!this.checkQuota()) {
      console.warn('[Gemini Client] Cuota diaria de Gemini Free Tier alcanzada. Usando motor heurístico local de respaldo.');
      return this.fallbackHeuristic(prompt);
    }

    if (!this.apiKey) {
      return this.fallbackHeuristic(prompt);
    }

    try {
      this.requestCountToday++;
      // Endpoint oficial v1beta de Google Gemini
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API respondió con estado ${response.status}`);
      }

      const json = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(rawText);
    } catch (err) {
      console.warn('[Gemini Client] Error llamando a Gemini API, usando respuesta estructurada de fallback:', err.message);
      return this.fallbackHeuristic(prompt);
    }
  }

  fallbackHeuristic(prompt = '') {
    const text = String(prompt).toLowerCase();
    
    // Detección de intenciones para voz/texto
    if (text.includes('café') || text.includes('comer') || text.includes('antojo') || text.includes('restaurante')) {
      return {
        intent: 'SEARCH_FOOD',
        category: 'cafe',
        suggested_filters: { pet_friendly: true, specialty_coffee: true },
        target_route: '/food-radar',
        clarifying_question: '¿Prefieres cafetería con terraza o espacio silencioso para trabajar?',
        estimated_budget_crc: 6000,
        voice_response_text: 'Encontré cafeterías de especialidad con terraza y método V60 en Ciudad Colón.'
      };
    }

    if (text.includes('veterinaria') || text.includes('perro') || text.includes('gato') || text.includes('emergencia') || text.includes('mascota')) {
      return {
        intent: 'FIND_VET',
        category: 'veterinaria',
        suggested_filters: { emergency_24h: true },
        target_route: '/vet-hub',
        clarifying_question: '¿Se trata de una emergencia médica 24/7 o consulta general?',
        estimated_budget_crc: 15000,
        voice_response_text: 'Localicé clínicas veterinarias con servicio de guardia activa cerca de tu zona.'
      };
    }

    if (text.includes('feria') || text.includes('plan') || text.includes('salir') || text.includes('amigos')) {
      return {
        intent: 'CREATE_PLAN',
        category: 'plan',
        suggested_filters: { ley_7600: true },
        target_route: '/group-match',
        clarifying_question: '¿Cuántas personas asistirán a la salida?',
        estimated_budget_crc: 10000,
        voice_response_text: 'Preparé un borrador de salida combinando la feria artesanal y un café de especialidad.'
      };
    }

    return {
      intent: 'EXPLORE_MAP',
      category: 'general',
      suggested_filters: {},
      target_route: '/live-map',
      clarifying_question: '¿Deseas buscar un lugar específico o explorar eventos cercanos?',
      estimated_budget_crc: 0,
      voice_response_text: 'Mostrando los lugares y eventos activos en el mapa interactivo.'
    };
  }

  getMetrics() {
    return {
      quotaDailyLimit: this.dailyLimit,
      requestsUsedToday: this.requestCountToday,
      remainingToday: Math.max(0, this.dailyLimit - this.requestCountToday),
      isKeyConfigured: Boolean(this.apiKey)
    };
  }
}

module.exports = new GeminiSafeClient();

