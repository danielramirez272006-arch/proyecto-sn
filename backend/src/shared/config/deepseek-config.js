const env = require('./env-config');
const metricsCollector = require('../telemetry/metrics-collector');

class DeepSeekSafeClient {
  constructor() {
    this.apiKey = env.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = env.deepseek?.baseUrl || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    this.model = env.deepseek?.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.reasonerModel = 'deepseek-reasoner';
    this.temperature = env.deepseek?.temperature ?? 0.2;
    this.requestCountToday = 0;
    this.providerName = 'DeepSeek';
    this.chatSessions = new Map(); // session_id -> messages array
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateJson({ prompt, systemInstruction, model = null, temperature = null }) {
    if (!this.isConfigured()) {
      metricsCollector.recordDeepSeekCall(true);
      return this.fallbackHeuristic(prompt);
    }

    try {
      this.requestCountToday++;
      metricsCollector.recordDeepSeekCall(false);
      const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;
      
      const messages = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      } else {
        messages.push({
          role: 'system',
          content: 'Eres el copiloto inteligente de Sinergia Urbana Costa Rica. Devuelve siempre un objeto JSON válido y estructurado.'
        });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: model || this.model,
          messages,
          temperature: temperature ?? this.temperature,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Respuesta vacía recibida de DeepSeek API');
      }

      return JSON.parse(content);
    } catch (err) {
      console.warn(`[DeepSeek Client] Fallo en la llamada a DeepSeek (${err.message}). Activando motor heurístico local de respaldo.`);
      metricsCollector.recordDeepSeekCall(true);
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
      history.splice(0, history.length - 20); // Mantener últimas 20 interacciones
    }

    history.push({ role: 'user', content: message });

    if (!this.isConfigured()) {
      metricsCollector.recordDeepSeekCall(true);
      const reply = this.fallbackChatResponse(message, history);
      history.push({ role: 'assistant', content: reply.response });
      return {
        session_id: sessionId,
        model: model || this.model,
        provider: 'DeepSeek (Resilient Local Mode)',
        response: reply.response,
        suggested_actions: reply.suggested_actions,
        history_length: history.length
      };
    }

    try {
      this.requestCountToday++;
      metricsCollector.recordDeepSeekCall(false);
      const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

      const messages = [];
      messages.push({
        role: 'system',
        content: systemInstruction || 'Eres el copiloto conversacional experto de Sinergia Urbana Costa Rica, potenciado por DeepSeek. Conoces los cantones, cultura tica, opciones de café de especialidad, ferias del agricultor, Ley 7600, SINPE Móvil y transporte público.'
      });
      messages.push(...history);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: model || this.model,
          messages,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek Chat error (${response.status})`);
      }

      const data = await response.json();
      const assistantMessage = data?.choices?.[0]?.message?.content || 'No se obtuvo respuesta.';
      const reasoning = data?.choices?.[0]?.message?.reasoning_content || null;

      history.push({ role: 'assistant', content: assistantMessage });

      return {
        session_id: sessionId,
        model: model || this.model,
        provider: 'DeepSeek Cloud',
        response: assistantMessage,
        reasoning_content: reasoning,
        history_length: history.length
      };
    } catch (err) {
      metricsCollector.recordDeepSeekCall(true);
      const fallback = this.fallbackChatResponse(message, history);
      history.push({ role: 'assistant', content: fallback.response });
      return {
        session_id: sessionId,
        model: model || this.model,
        provider: 'DeepSeek (Resilient Local Mode)',
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
        response: '¡Pura vida! Soy tu copiloto urbano de Costa Rica potenciado por DeepSeek. ¿Qué plan o salida te gustaría coordinar hoy? Puedo ayudarte a buscar cafeterías con terraza, ferias del agricultor o calcular la división de cuenta con SINPE Móvil.',
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
        provider: 'DeepSeek (Local Fallback)',
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
        provider: 'DeepSeek (Local Fallback)',
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
        provider: 'DeepSeek (Local Fallback)',
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
      provider: 'DeepSeek (Local Fallback)',
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
      reasonerModel: this.reasonerModel,
      baseUrl: this.baseUrl,
      isKeyConfigured: this.isConfigured(),
      requestsExecuted: this.requestCountToday,
      activeChatSessions: this.chatSessions.size
    };
  }
}

module.exports = new DeepSeekSafeClient();
