const httpClient = require('./http-client');
const env = require('../config/env-config');

class GeminiVideoClient {
  constructor() {
    this.apiKey = env.gemini?.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = env.gemini?.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Genera análisis simulado heurístico si falta clave o se agota la cuota
   */
  generateFallbackAnalysis(youtubeUrl, title = '', durationSeconds = 300) {
    const lowerTitle = (title || '').toLowerCase();
    const isCat = lowerTitle.includes('gato') || lowerTitle.includes('felin') || lowerTitle.includes('michi');
    const species = isCat ? 'gato' : (lowerTitle.includes('ave') ? 'ave' : 'perro');

    let topic = 'higiene';
    if (lowerTitle.includes('aliment') || lowerTitle.includes('comida') || lowerTitle.includes('nutri')) {
      topic = 'alimentacion';
    } else if (lowerTitle.includes('auxilio') || lowerTitle.includes('emergencia') || lowerTitle.includes('herida')) {
      topic = 'primeros_auxilios';
    } else if (lowerTitle.includes('adiestra') || lowerTitle.includes('educa') || lowerTitle.includes('entrena')) {
      topic = 'adiestramiento';
    } else if (lowerTitle.includes('salud') || lowerTitle.includes('vacun') || lowerTitle.includes('diente')) {
      topic = 'salud_preventiva';
    }

    const duration = Math.max(60, durationSeconds || 300);

    const f1Start = Math.min(20, Math.floor(duration * 0.1));
    const f1End = Math.min(duration, f1Start + 50);

    const f2Start = Math.min(duration - 40, Math.floor(duration * 0.45));
    const f2End = Math.min(duration, f2Start + 60);

    const f3Start = Math.min(duration - 30, Math.floor(duration * 0.75));
    const f3End = Math.min(duration, f3Start + 45);

    let fragments = [];
    if (topic === 'higiene') {
      fragments = [
        {
          question: `¿Cada cuánto tiempo se debe bañar o higienizar a tu ${species}?`,
          answer: `La recomendación veterinaria general es bañar o asear al ${species} cada 3 a 4 semanas para preservar la barrera lipídica protectora de su piel.`,
          start_seconds: f1Start,
          end_seconds: f1End
        },
        {
          question: '¿Qué temperatura debe tener el agua?',
          answer: 'El agua debe estar siempre tibia o templada (36°C a 38°C), evitando cambios bruscos de temperatura que le causen estrés.',
          start_seconds: f2Start,
          end_seconds: f2End
        },
        {
          question: '¿Cómo secar correctamente el pelaje para evitar hongos?',
          answer: 'Utiliza toallas absorbentes primero y secadora a temperatura tibia manteniendo una distancia prudencial de 25 cm.',
          start_seconds: f3Start,
          end_seconds: f3End
        }
      ];
    } else if (topic === 'alimentacion') {
      fragments = [
        {
          question: `¿Cuál es la ración diaria ideal según el peso de tu ${species}?`,
          answer: `La cantidad de comida debe dividirse en 2 raciones al día siguiendo la tabla nutricional de acuerdo al peso y actividad física del ${species}.`,
          start_seconds: f1Start,
          end_seconds: f1End
        },
        {
          question: '¿Qué alimentos son tóxicos y nunca deben suministrarse?',
          answer: 'Chocolate, cebolla, ajo, uvas, pasas y edulcorantes artificiales como el xilitol son altamente tóxicos para perros y gatos.',
          start_seconds: f2Start,
          end_seconds: f2End
        }
      ];
    } else if (topic === 'primeros_auxilios') {
      fragments = [
        {
          question: `¿Qué primeros auxilios básicos se deben aplicar ante una emergencia en casa con tu ${species}?`,
          answer: `Mantén la calma, revisa pulso y respiración, inmoviliza con cuidado sin presionar el tórax y traslada de inmediato al centro veterinario.`,
          start_seconds: f1Start,
          end_seconds: f1End
        },
        {
          question: `¿Cómo actuar si tu ${species} sufre un accidente doméstico?`,
          answer: `Evita movimientos bruscos, envuélvelo en una toalla limpia para evitar mordeduras por dolor y no le administres medicamentos humanos.`,
          start_seconds: f2Start,
          end_seconds: f2End
        }
      ];
    } else {
      fragments = [
        {
          question: `¿Cuáles son las señales tempranas de bienestar o alerta en tu ${species}?`,
          answer: `Presta atención a cambios en el apetito, nivel de actividad y postura corporal como indicadores clave de salud.`,
          start_seconds: f1Start,
          end_seconds: f1End
        },
        {
          question: '¿Qué hacer como primer paso de atención?',
          answer: 'Mantén la calma, revisa las constantes vitales y contacta al veterinario si notas letargo o dolor.',
          start_seconds: f2Start,
          end_seconds: f2End
        }
      ];
    }

    return {
      species,
      topic,
      summary: `Guía educativa veterinaria sobre ${topic} para ${species}. El video explica técnicas preventivas y mejores prácticas paso a paso.`,
      fragments,
      provider: 'mock_fallback',
      is_live: false,
      note: 'Análisis generado mediante heurística veterinaria de desarrollo. Para llamadas en vivo, configure GEMINI_API_KEY.'
    };
  }

  /**
   * Valida y ajusta los fragmentos y tiempos contra la duración real conocida del video
   */
  validateAndSanitizeAnalysis(analysis, durationSeconds = 0) {
    if (!analysis || typeof analysis !== 'object') {
      throw new Error('El análisis de Gemini devolvió una estructura inválida.');
    }

    const validSpecies = ['perro', 'gato', 'ave', 'conejo', 'roedor', 'general'];
    const validTopics = ['alimentacion', 'higiene', 'adiestramiento', 'primeros_auxilios', 'salud_preventiva', 'comportamiento', 'cuidado_general'];

    const species = validSpecies.includes(String(analysis.species || '').toLowerCase())
      ? String(analysis.species).toLowerCase()
      : 'general';

    const topic = validTopics.includes(String(analysis.topic || '').toLowerCase())
      ? String(analysis.topic).toLowerCase()
      : 'cuidado_general';

    const summary = String(analysis.summary || 'Resumen de cuidados para mascotas.').trim();

    const rawFragments = Array.isArray(analysis.fragments) ? analysis.fragments : [];
    // Limitar a máximo tres fragmentos según especificación
    const trimmedFragments = rawFragments.slice(0, 3);

    const maxDuration = durationSeconds > 0 ? durationSeconds : 3600;

    const sanitizedFragments = trimmedFragments.map((f, idx) => {
      let start = Math.max(0, parseInt(f.start_seconds ?? f.segundo_inicio ?? 0, 10));
      let end = f.end_seconds !== undefined && f.end_seconds !== null 
        ? parseInt(f.end_seconds ?? f.segundo_fin, 10) 
        : null;

      // Validación estricta contra la duración del video
      if (start > maxDuration) {
        start = Math.max(0, maxDuration - 30);
      }

      if (end !== null) {
        if (end < start) {
          end = Math.min(maxDuration, start + 30);
        }
        if (end > maxDuration) {
          end = maxDuration;
        }
      }

      return {
        order_index: idx,
        question: String(f.question || f.pregunta || `Pregunta clave ${idx + 1}`).trim(),
        answer: String(f.answer || f.respuesta_breve || 'Respuesta verificada en el fragmento.').trim(),
        start_seconds: start,
        end_seconds: end
      };
    });

    return {
      species,
      topic,
      summary,
      fragments: sanitizedFragments
    };
  }

  /**
   * Envía la URL pública de YouTube a Gemini para análisis estructurado
   */
  async analyzeVideo(youtubeUrl, title = '', durationSeconds = 300) {
    if (!this.isConfigured()) {
      const fallback = this.generateFallbackAnalysis(youtubeUrl, title, durationSeconds);
      const sanitized = this.validateAndSanitizeAnalysis(fallback, durationSeconds);
      return {
        ...sanitized,
        provider: 'mock_fallback',
        is_live: false,
        note: 'GEMINI_API_KEY no configurada. Se empleó generador heurístico de desarrollo.'
      };
    }

    const systemPrompt = `Eres un médico veterinario colegiado experto en bienestar y cuidado animal de Sinergia Urbana Costa Rica.
Analiza el video educativo de YouTube proporcionado y responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "species": "perro" | "gato" | "ave" | "conejo" | "general",
  "topic": "alimentacion" | "higiene" | "adiestramiento" | "primeros_auxilios" | "salud_preventiva" | "comportamiento" | "cuidado_general",
  "summary": "Resumen conciso y profesional del video (máximo 300 caracteres)",
  "fragments": [
    {
      "question": "Pregunta frecuente que responde directamente este fragmento",
      "answer": "Respuesta breve, exacta y respaldada por el fragmento del video (máximo 250 caracteres)",
      "start_seconds": 15,
      "end_seconds": 65
    }
  ]
}
REGLAS ESTRICTAS:
1. Máximo 3 fragmentos.
2. Cada fragmento debe tener start_seconds entero mayor o igual a 0.
3. end_seconds debe ser mayor a start_seconds y menor a ${durationSeconds || 300} segundos.
4. No inventes información médica contradictoria con las buenas prácticas veterinarias.`;

    const userPrompt = `URL del video de YouTube: ${youtubeUrl}
Título del video: ${title}
Duración total aproximada: ${durationSeconds || 300} segundos.
Por favor analiza el contenido de este video y extrae los 3 fragmentos clave más útiles para tutores de mascotas.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemPrompt}\n\n${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isQuota = response.status === 429 || errorText.includes('RESOURCE_EXHAUSTED');
        const err = new Error(`Gemini API error (${response.status}): ${errorText}`);
        err.isQuota = isQuota;
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini no devolvió texto en los candidatos de respuesta');
      }

      const parsed = JSON.parse(rawText);
      const sanitized = this.validateAndSanitizeAnalysis(parsed, durationSeconds);

      return {
        ...sanitized,
        provider: 'gemini_multimodal_live',
        model_used: this.model,
        is_live: true
      };
    } catch (err) {
      console.warn('[GeminiVideoClient] Error al analizar video con Gemini:', err.message);
      const isQuota = err.isQuota || err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED');

      const fallback = this.generateFallbackAnalysis(youtubeUrl, title, durationSeconds);
      const sanitized = this.validateAndSanitizeAnalysis(fallback, durationSeconds);

      return {
        ...sanitized,
        provider: 'mock_fallback_on_error',
        is_live: false,
        quota_exhausted: isQuota,
        error: isQuota ? 'QUOTA_EXCEEDED: Se agotó la cuota de Gemini API.' : err.message,
        note: 'Fallback aplicado automáticamente para no interrumpir el flujo administrativo.'
      };
    }
  }
}

module.exports = new GeminiVideoClient();

