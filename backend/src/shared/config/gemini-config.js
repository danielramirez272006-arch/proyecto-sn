const env = require('./env-config');
const metricsCollector = require('../telemetry/metrics-collector');

class GeminiSafeClient {
  constructor() {
    this.apiKey = env.gemini?.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = env.gemini?.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    this.dailyLimit = env.gemini?.freeTierDailyQuota || 1500;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.currentDate = new Date().toISOString().slice(0, 10);
    this.requestCountToday = 0;
    this.providerName = 'Google Gemini';
    this.chatSessions = new Map(); // session_id -> array of { role: 'user' | 'model', content: string }
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  checkQuota() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.currentDate !== today) {
      this.currentDate = today;
      this.requestCountToday = 0;
    }
    return this.requestCountToday < this.dailyLimit;
  }

  async generateJson({ prompt, systemInstruction, model = null, temperature = null }) {
    if (!this.checkQuota()) {
      console.warn('[Gemini Client] Cuota diaria de Gemini alcanzada. Usando motor heurístico local de respaldo.');
      metricsCollector.recordGeminiCall(true);
      return this.fallbackHeuristic(prompt);
    }

    if (!this.isConfigured()) {
      metricsCollector.recordGeminiCall(true);
      return this.fallbackHeuristic(prompt);
    }

    try {
      this.requestCountToday++;
      metricsCollector.recordGeminiCall(false);

      const activeModel = model || this.model;
      const endpoint = `${this.baseUrl}/models/${activeModel}:generateContent?key=${this.apiKey}`;

      const bodyPayload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: temperature ?? 0.2,
          responseMimeType: 'application/json'
        }
      };

      if (systemInstruction) {
        bodyPayload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API respondió con estado ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Respuesta vacía recibida de Gemini API');
      }

      return JSON.parse(rawText);
    } catch (err) {
      console.warn(`[Gemini Client] Fallo en la llamada a Gemini (${err.message}). Activando motor heurístico local de respaldo.`);
      metricsCollector.recordGeminiCall(true);
      return this.fallbackHeuristic(prompt);
    }
  }

  async generateChat({ sessionId = 'default', message, systemInstruction = null, model = null }) {
    let history = this.chatSessions.get(sessionId);
    if (!history) {
      history = [];
      this.chatSessions.set(sessionId, history);
    }

    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    history.push({ role: 'user', content: message });

    if (!this.checkQuota() || !this.isConfigured()) {
      metricsCollector.recordGeminiCall(true);
      const reply = this.fallbackChatResponse(message, history);
      history.push({ role: 'model', content: reply.response });
      return {
        session_id: sessionId,
        model: model || this.model,
        provider: 'Google Gemini (Resilient Local Mode)',
        response: reply.response,
        suggested_actions: reply.suggested_actions,
        history_length: history.length
      };
    }

    try {
      this.requestCountToday++;
      metricsCollector.recordGeminiCall(false);

      const activeModel = model || this.model;
      const endpoint = `${this.baseUrl}/models/${activeModel}:generateContent?key=${this.apiKey}`;

      const contents = history.map(item => ({
        role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
        parts: [{ text: item.content }]
      }));

      const bodyPayload = {
        contents,
        generationConfig: {
          temperature: 0.3
        }
      };

      if (systemInstruction) {
        bodyPayload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      } else {
        bodyPayload.systemInstruction = {
          parts: [{
            text: 'Eres el copiloto conversacional experto de Sinergia Urbana Costa Rica, potenciado por Google Gemini. Conoces los cantones, cultura tica, opciones de café de especialidad, ferias del agricultor, Ley 7600, SINPE Móvil y transporte público.'
          }]
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        throw new Error(`Gemini Chat error (${response.status})`);
      }

      const data = await response.json();
      const assistantMessage = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No se obtuvo respuesta.';

      history.push({ role: 'model', content: assistantMessage });

      return {
        session_id: sessionId,
        model: activeModel,
        provider: 'Google Gemini Cloud',
        response: assistantMessage,
        history_length: history.length
      };
    } catch (err) {
      metricsCollector.recordGeminiCall(true);
      const fallback = this.fallbackChatResponse(message, history);
      history.push({ role: 'model', content: fallback.response });
      return {
        session_id: sessionId,
        model: model || this.model,
        provider: 'Google Gemini (Resilient Local Mode)',
        response: fallback.response,
        suggested_actions: fallback.suggested_actions,
        history_length: history.length
      };
    }
  }

  fallbackChatResponse(prompt = '', history = []) {
    const text = String(prompt).toLowerCase();

    if (text.includes('hola') || text.includes('buenas') || text.includes('saludos')) {
      return {
        response: '¡Pura vida! Soy tu copiloto urbano de Costa Rica potenciado por Google Gemini. ¿Qué plan o salida te gustaría coordinar hoy? Puedo ayudarte a buscar cafeterías con terraza, ferias del agricultor o calcular la división de cuenta con SINPE Móvil.',
        suggested_actions: ['Buscar café de especialidad', 'Crear plan para el fin de semana', 'Consultar ferias activas']
      };
    }

    if (text.includes('itinerario') || text.includes('ruta') || text.includes('días')) {
      return {
        response: 'Te preparé una propuesta de itinerario cultural y gastronómico para el Valle Central: Día 1 con desayuno en feria del agricultor y tarde de café; Día 2 con recorrido histórico y mirador al atardecer.',
        suggested_actions: ['Ajustar presupuesto', 'Ver paradas en el mapa', 'Compartir con amigos']
      };
    }

    return {
      response: `Entendido. Tomando en cuenta tu solicitud ("${prompt}"), te sugiero revisar las paradas y comercios verificados con rampa Ley 7600 y pago vía SINPE Móvil en nuestro mapa en vivo.`,
      suggested_actions: ['Abrir mapa en vivo', 'Ver locales cercanos']
    };
  }

  async generateIntentOrDraft(params) {
    return this.generateJson(params);
  }

  fallbackHeuristic(prompt = '') {
    const text = String(prompt).toLowerCase();

    if (text.includes('café') || text.includes('comer') || text.includes('antojo') || text.includes('restaurante')) {
      return {
        provider: 'Google Gemini (Local Fallback)',
        intent: 'SEARCH_FOOD',
        category: 'cafe',
        suggested_filters: { pet_friendly: true, specialty_coffee: true },
        target_route: '/food-radar',
        clarifying_question: '¿Prefieres cafetería con terraza o espacio silencioso para trabajar?',
        estimated_budget_crc: 6000,
        voice_response_text: 'Localicé opciones de cafeterías con terraza pet-friendly y café de especialidad tico.'
      };
    }

    if (text.includes('veterinaria') || text.includes('perro') || text.includes('gato') || text.includes('emergencia') || text.includes('mascota')) {
      return {
        provider: 'Google Gemini (Local Fallback)',
        intent: 'FIND_VET',
        category: 'veterinaria',
        suggested_filters: { emergency_24h: true },
        target_route: '/vet-hub',
        clarifying_question: '¿Se trata de una urgencia 24/7 o de consulta preventiva?',
        estimated_budget_crc: 15000,
        voice_response_text: 'Localicé veterinarias y clínicas de urgencia 24/7 en tu cuadrante.'
      };
    }

    if (text.includes('feria') || text.includes('plan') || text.includes('salir') || text.includes('amigos')) {
      return {
        provider: 'Google Gemini (Local Fallback)',
        intent: 'CREATE_PLAN',
        category: 'plan',
        suggested_filters: { ley_7600: true },
        target_route: '/group-match',
        clarifying_question: '¿Para cuántos amigos o familiares organizamos la salida?',
        estimated_budget_crc: 10000,
        voice_response_text: 'He preparado un borrador de salida combinando la feria del agricultor y parada de café.'
      };
    }

    return {
      provider: 'Google Gemini (Local Fallback)',
      intent: 'EXPLORE_MAP',
      category: 'general',
      suggested_filters: {},
      target_route: '/live-map',
      clarifying_question: '¿Buscas un comercio específico o quieres ver el mapa en vivo?',
      estimated_budget_crc: 0,
      voice_response_text: 'Mostrando comercios, eventos y alertas viales en tiempo real en el mapa.'
    };
  }

  getMetrics() {
    return {
      provider: this.providerName,
      activeModel: this.model,
      baseUrl: this.baseUrl,
      isKeyConfigured: this.isConfigured(),
      requestsExecuted: this.requestCountToday,
      activeChatSessions: this.chatSessions.size,
      quotaDailyLimit: this.dailyLimit,
      remainingToday: Math.max(0, this.dailyLimit - this.requestCountToday)
    };
  }
}

module.exports = new GeminiSafeClient();
