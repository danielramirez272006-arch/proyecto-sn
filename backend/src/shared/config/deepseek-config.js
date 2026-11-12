const env = require('./env-config');

class DeepSeekSafeClient {
  constructor() {
    this.apiKey = env.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = env.deepseek?.baseUrl || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    this.model = env.deepseek?.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.temperature = env.deepseek?.temperature ?? 0.2;
    this.requestCountToday = 0;
    this.providerName = 'DeepSeek';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateJson({ prompt, systemInstruction, model = null, temperature = null }) {
    if (!this.isConfigured()) {
      return this.fallbackHeuristic(prompt);
    }

    try {
      this.requestCountToday++;
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
      return this.fallbackHeuristic(prompt);
    }
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
      baseUrl: this.baseUrl,
      isKeyConfigured: this.isConfigured(),
      requestsExecuted: this.requestCountToday
    };
  }
}

module.exports = new DeepSeekSafeClient();
