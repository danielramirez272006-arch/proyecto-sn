const crypto = require('node:crypto');
const { AiInteractionLogModel } = require('../models');
const geminiClient = require('../shared/config/gemini-config');
const deepSeekClient = require('../shared/config/deepseek-config');
const autoTaggerAi = require('../autonomous-agents/cartographer-agent/auto-tagger-ai');
const proposeAlternative = require('../autonomous-agents/plan-operations-agent/propose-alternative');
const dailyBriefingJob = require('../autonomous-agents/weather-editor-agent/daily-briefing-job');
const lostPetVisualMatcher = require('../autonomous-agents/consensus-moderator-agent/lost-pet-visual-matcher');
const invoicePriceExtractor = require('../autonomous-agents/consensus-moderator-agent/invoice-price-extractor');
const reportConsensusJob = require('../autonomous-agents/consensus-moderator-agent/report-consensus-job');
const geminiVideoClient = require('../shared/clients/gemini-video-client');
const { sanitizePromptInjection } = require('../shared/middlewares/payload-sanitizer');

/**
 * Anonimiza PII (correos, teléfonos de CR, cédulas) y neutraliza Prompt Injection antes de construir prompts o guardar bitácoras.
 */
function sanitizePiiForPrompt(text) {
  const { cleanText } = sanitizePromptInjection(String(text || ''), 600);
  return cleanText
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL_REDACTADO]')
    .replace(/\b(?:\+?506[\s-]?)?[24678]\d{3}[\s-]?\d{4}\b/g, '[TELEFONO_REDACTADO]')
    .replace(/\b\d-\d{4}-\d{4}\b/g, '[CEDULA_REDACTADA]')
    .slice(0, 600);
}

const AGENT_REGISTRY = {
  'bruno-concierge': {
    name: 'bruno-concierge',
    title: 'Copiloto Argos (Concierge Bienestar Pet — Synodos)',
    authorized_roles: ['client', 'organizer', 'merchant', 'business_owner', 'admin'],
    provider: 'google_gemini',
    model: geminiClient.model || 'gemini-3.1-flash-lite',
    objective: 'Orientar al tutor sobre cuidado animal, rutas pet-friendly y recomendaciones de salidas en el GAM.',
    async execute(input = {}) {
      const prompt = sanitizePiiForPrompt(input.message || input.prompt || 'Recomendación de paseo pet-friendly en San José');
      const res = await geminiClient.generateJson({
        prompt,
        systemInstruction: 'Eres Argos, asistente de bienestar animal y rutas pet-friendly de Synodos en Costa Rica. Responde en JSON breve.'
      }).catch(() => null);
      return {
        reply: res?.reply || res?.summary || res?.recommendation || 'Para pasear con tu mascota en el GAM, verifica sombra en aceras y lleva hidratación.',
        mode: res?.source || 'heuristic_fallback',
      };
    },
  },
  'video-analyzer': {
    name: 'video-analyzer',
    title: 'Analizador de Videos Veterinarios (YouTube)',
    authorized_roles: ['admin'],
    provider: 'google_gemini',
    model: geminiClient.model || 'gemini-3.1-flash-lite',
    objective: 'Extraer especie, tema veterinario, resumen y fragmentos verificables con marcas de tiempo.',
    async execute(input = {}) {
      const url = String(input.youtube_url || 'https://www.youtube.com/watch?v=4HFHEmtvoRg');
      const title = sanitizePiiForPrompt(input.title || 'Guía de cuidado animal');
      const duration = Number(input.duration_seconds) || 240;
      const analysis = await geminiVideoClient.analyzeVideo(url, title, duration).catch(() => ({
        species: 'perros',
        topic: 'cuidado_general',
        summary: `Resumen estructurado para: ${title}`,
        fragments: [{ question: '¿Cuál es la recomendación principal?', answer: 'Consultar guía paso a paso.', start_seconds: 15 }],
      }));
      return analysis;
    },
  },
  'auto-tagger': {
    name: 'auto-tagger',
    title: 'Clasificador Semántico de Comercios (AutoTaggerAI)',
    authorized_roles: ['admin'],
    provider: 'deepseek',
    model: deepSeekClient.model || 'deepseek-chat',
    objective: 'Etiquetar automáticamente atributos pet-friendly, acústica y tipo de terraza de un establecimiento.',
    async execute(input = {}) {
      const place = {
        name: sanitizePiiForPrompt(input.name || 'Cafetería Escalante'),
        description: sanitizePiiForPrompt(input.description || 'Terraza techada tranquila con agua para perros'),
        category: input.category || 'cafe',
      };
      if (typeof autoTaggerAi.classifyPlace === 'function') {
        return await autoTaggerAi.classifyPlace(place);
      }
      if (typeof autoTaggerAi.tagPlace === 'function') {
        return await autoTaggerAi.tagPlace(place);
      }
      return { tags: ['pet_friendly_candidate', 'terraza_tranquila'], confidence: 0.82, place: place.name };
    },
  },
  'propose-alternative': {
    name: 'propose-alternative',
    title: 'Agente de Planes Alternativos por Clima/Aforo',
    authorized_roles: ['client', 'organizer', 'admin'],
    provider: 'deepseek',
    model: deepSeekClient.model || 'deepseek-chat',
    objective: 'Sugerir locales cubiertos o de menor ruido cuando el clima o el aforo afectan un plan activo.',
    async execute(input = {}) {
      const planId = input.plan_id || null;
      if (planId && typeof proposeAlternative.proposeForPlan === 'function') {
        return await proposeAlternative.proposeForPlan(planId);
      }
      return {
        reason: sanitizePiiForPrompt(input.reason || 'Lluvia vespertina en el GAM'),
        alternatives: [
          { name: 'Franco Café (Terraza Techada)', zone: 'Barrio Escalante', acoustic_db: 46 },
          { name: 'El Árbol de Seda', zone: 'Barrio Escalante', acoustic_db: 49 },
        ],
      };
    },
  },
  'daily-briefing': {
    name: 'daily-briefing',
    title: 'Editor de Boletín Diario GAM (Weather & Ops)',
    authorized_roles: ['admin'],
    provider: 'deepseek',
    model: deepSeekClient.model || 'deepseek-chat',
    objective: 'Consolidar el resumen diario de clima, alertas térmicas podales y estado de terrazas.',
    async execute() {
      if (typeof dailyBriefingJob.generateBriefing === 'function') {
        return await dailyBriefingJob.generateBriefing();
      }
      if (typeof dailyBriefingJob.run === 'function') {
        return await dailyBriefingJob.run();
      }
      return {
        date: new Date().toISOString().slice(0, 10),
        zone: 'GAM Costa Rica',
        summary: 'Condiciones estables por la mañana; se recomienda paseo temprano antes de las 10:00 a.m.',
      };
    },
  },
  'lost-pet-matcher': {
    name: 'lost-pet-matcher',
    title: 'Matcher Visual de Mascotas Extraviadas (SOS)',
    authorized_roles: ['client', 'organizer', 'admin'],
    provider: 'deepseek',
    model: deepSeekClient.model || 'deepseek-chat',
    objective: 'Comparar reportes de mascotas perdidas y encontradas por características físicas y proximidad GPS.',
    async execute(input = {}) {
      const lostPet = input.lost_pet || { species: 'dog', breed: 'Golden Retriever', color: 'dorado', lat: 9.935, lng: -84.065 };
      const foundPets = Array.isArray(input.found_pets) ? input.found_pets : [];
      const maxKm = Number(input.max_distance_km) || 5;
      const matches = await lostPetVisualMatcher.matchPets(lostPet, foundPets, maxKm);
      return { matches, total_matches: Array.isArray(matches) ? matches.length : 0 };
    },
  },
  'invoice-extractor': {
    name: 'invoice-extractor',
    title: 'Extractor de Facturas y Comprobantes SINPE',
    authorized_roles: ['client', 'organizer', 'merchant', 'admin'],
    provider: 'deepseek',
    model: deepSeekClient.model || 'deepseek-chat',
    objective: 'Extraer subtotal, IVA (13%), servicio (10%) y total de comprobantes para dividir cuentas grupales.',
    async execute(input = {}) {
      const text = sanitizePiiForPrompt(input.text || 'Café 2500 CRC, Bowl Canino 3500 CRC, Total 6000 CRC');
      return await invoicePriceExtractor.extractFromText(text);
    },
  },
  'report-consensus': {
    name: 'report-consensus',
    title: 'Moderador de Consenso de Reportes Urbanos',
    authorized_roles: ['admin'],
    provider: 'deepseek',
    model: deepSeekClient.model || 'deepseek-chat',
    objective: 'Evaluar la confiabilidad y consenso de reportes ciudadanos de ruido, calor en aceras o aforo.',
    async execute(input = {}) {
      if (typeof reportConsensusJob.evaluateReports === 'function') {
        return await reportConsensusJob.evaluateReports(input);
      }
      if (typeof reportConsensusJob.run === 'function') {
        return await reportConsensusJob.run();
      }
      return { evaluated: true, consensus_status: 'verified', reports_analyzed: Number(input.count) || 0 };
    },
  },
};

class AiAgentsHubService {
  listAgents() {
    return Object.values(AGENT_REGISTRY).map((a) => ({
      name: a.name,
      title: a.title,
      authorized_roles: a.authorized_roles,
      provider: a.provider,
      model: a.model,
      objective: a.objective,
    }));
  }

  async recordLog({ agentName, actor, inputSummary, outputSummary, provider, model, latencyMs, status }) {
    const id = `ailog_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await AiInteractionLogModel.create({
      id,
      agent_name: agentName,
      invoked_by: actor?.id || 'anonymous',
      invoked_role: actor?.role || 'guest',
      input_summary: sanitizePiiForPrompt(typeof inputSummary === 'string' ? inputSummary : JSON.stringify(inputSummary || {})),
      output_summary: sanitizePiiForPrompt(typeof outputSummary === 'string' ? outputSummary : JSON.stringify(outputSummary || {})),
      provider: provider || 'local',
      model: model || 'heuristic',
      latency_ms: Math.max(0, Math.round(Number(latencyMs) || 0)),
      status: status || 'success',
    });
    return id;
  }

  async runAgent(agentName, input = {}, actor = null) {
    const agent = AGENT_REGISTRY[agentName];
    if (!agent) {
      const err = new Error(`Agente de IA no encontrado: ${agentName}`);
      err.status = 404;
      throw err;
    }

    const userRole = actor?.role || 'guest';
    if (!agent.authorized_roles.includes(userRole)) {
      const err = new Error(`Acceso restringido. El agente '${agentName}' requiere rol: ${agent.authorized_roles.join(', ')}`);
      err.status = 403;
      throw err;
    }

    const t0 = Date.now();
    try {
      const output = await agent.execute(input, actor);
      const latencyMs = Date.now() - t0;
      const logId = await this.recordLog({
        agentName: agent.name,
        actor,
        inputSummary: input,
        outputSummary: output,
        provider: agent.provider,
        model: agent.model,
        latencyMs,
        status: 'success',
      });

      return {
        agent: agent.name,
        log_id: logId,
        provider: agent.provider,
        model: agent.model,
        latency_ms: latencyMs,
        output,
      };
    } catch (err) {
      const latencyMs = Date.now() - t0;
      await this.recordLog({
        agentName: agent.name,
        actor,
        inputSummary: input,
        outputSummary: { error: err.message },
        provider: agent.provider,
        model: agent.model,
        latencyMs,
        status: 'error',
      }).catch(() => {});
      throw err;
    }
  }

  async listLogs({ agentName = null, limit = 50 } = {}) {
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    const where = agentName ? { agent_name: agentName } : {};
    return await AiInteractionLogModel.findAll({
      where,
      orderBy: 'created_at',
      orderDir: 'DESC',
      limit: safeLimit
    });
  }
}

module.exports = new AiAgentsHubService();
module.exports.AGENT_REGISTRY = AGENT_REGISTRY;
module.exports.sanitizePiiForPrompt = sanitizePiiForPrompt;
