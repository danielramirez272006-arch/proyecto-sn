const crypto = require('node:crypto');
const { query, execute } = require('../../shared/config/database');
const placesRepository = require('../places/places-repository');
const petCompatibilityService = require('../places/pet-compatibility-service');
const petVerificationService = require('./pet-verification-service');
const auditService = require('../../shared/audit/audit-service');
const deepSeekClient = require('../../shared/config/deepseek-config');
const googlePlacesClient = require('../../shared/clients/google-places-client');
const {
  hasExplicitPetAdmission,
  hasExplicitPetRejection,
  analyzePetPolicyStatement,
} = require('../../autonomous-agents/cartographer-agent/auto-tagger-ai');

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_MAX_DURATION_MS = 40000;
const DEFAULT_COOLDOWN_DAYS = 14;
const MAX_HTML_BYTES = 120 * 1024;

function isQuotaExhaustedError(err) {
  const code = String(err?.code || '').toUpperCase();
  const msg = String(err?.message || '').toUpperCase();
  return (
    err?.status === 429 ||
    code.includes('QUOTA') ||
    code.includes('429') ||
    msg.includes('HTTP_429') ||
    msg.includes('QUOTA') ||
    msg.includes('RATE_LIMIT')
  );
}

function authorizeCronRequest(headers = {}, expectedSecret = process.env.PET_REVIEW_CRON_SECRET || '') {
  const secret = String(expectedSecret || '').trim();
  if (!secret) return { ok: false, status: 503, error: 'CRON_SECRET_NOT_CONFIGURED' };

  const normalizedHeaders = {};
  for (const [k, v] of Object.entries(headers || {})) {
    normalizedHeaders[String(k).toLowerCase()] = String(v || '').trim();
  }
  const direct = normalizedHeaders['x-cron-secret'] || '';
  const auth = normalizedHeaders.authorization || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const provided = direct || bearer;

  if (!provided || provided.length !== secret.length) {
    return { ok: false, status: 401, error: 'UNAUTHORIZED_SCHEDULER' };
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (!crypto.timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: 'UNAUTHORIZED_SCHEDULER' };
  }
  return { ok: true, status: 200, error: null };
}

const BRANCH_STOPWORDS = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'a', 'al', 'san', 'santa',
  'costa', 'rica', 'restaurante', 'cafe', 'cafeteria', 'bar', 'soda', 'bistro',
  'sucursal', 'local', 'plaza', 'centro', 'comercial', 'avenida', 'calle', 'metros',
]);

const KNOWN_CR_ZONES = [
  'escalante', 'escazu', 'santa ana', 'heredia', 'alajuela', 'cartago', 'curridabat',
  'san pedro', 'rohrmoser', 'sabana', 'los yoses', 'desamparados', 'moravia', 'tibas',
  'guadalupe', 'pinares', 'lindora', 'belen', 'tres rios', 'liberia', 'jaco', 'tamarindo',
  'manuel antonio', 'puerto viejo', 'la fortuna', 'monteverde', 'san jose',
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(value) {
  return normalizeText(value)
    .split(' ')
    .filter((w) => w.length >= 3 && !BRANCH_STOPWORDS.has(w));
}

function isSafePublicHttpUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function stripHtmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWithRetry(url, options = {}, { timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_MAX_RETRIES, fetchImpl = fetch } = {}) {
  let lastError = null;
  const attempts = Math.max(1, Math.min(3, Number(maxRetries) + 1));
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const resp = await fetchImpl(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (resp.ok || (resp.status >= 400 && resp.status < 500 && resp.status !== 429)) {
        return resp;
      }
      lastError = new Error(`HTTP_${resp.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('FETCH_FAILED');
}

/**
 * Comprueba si una fuente externa corresponde a la sucursal específica del lugar
 * usando identificador de proveedor o combinación de nombre + dirección/zona.
 */
function verifyBranchMatch(place, source = {}) {
  const placeExternalIds = new Set(
    [
      place?.external_id,
      place?.google_place_id,
      place?.attributes_metadata?.google_place_id,
      place?.attributes_metadata?.foursquare_id,
      place?.attributes_metadata?.external_id,
      ...(Array.isArray(place?.attributes_metadata?.external_ids) ? place.attributes_metadata.external_ids : []),
    ]
      .filter(Boolean)
      .map((v) => String(v).trim())
  );

  const sourceExternalId = source.provider_place_id || source.external_place_id || null;
  if (sourceExternalId && placeExternalIds.size > 0) {
    if (placeExternalIds.has(String(sourceExternalId).trim())) {
      return { matched: true, method: 'provider_id', reason: null };
    }
    return {
      matched: false,
      method: 'provider_id_mismatch',
      reason: 'El identificador del proveedor corresponde a otra sucursal.',
    };
  }

  // Si la fuente es la web oficial registrada explícitamente en el lugar y no menciona otra sucursal distinta
  const placeWebsite = place?.website || place?.attributes_metadata?.website || place?.source_url || null;
  const placeZones = KNOWN_CR_ZONES.filter((z) =>
    normalizeText(`${place?.name || ''} ${place?.address || ''} ${place?.canton || ''} ${place?.district || ''}`).includes(z)
  );
  const sourceFullText = normalizeText(`${source.branch_name || ''} ${source.branch_address || ''} ${source.title || ''} ${source.text || ''}`);
  const sourceZones = KNOWN_CR_ZONES.filter((z) => sourceFullText.includes(z));

  // Si la fuente menciona explícitamente otra zona/sucursal que no coincide con la zona del lugar -> rechazar
  if (placeZones.length > 0 && sourceZones.length > 0) {
    const sharesZone = sourceZones.some((z) => placeZones.includes(z));
    if (!sharesZone) {
      return {
        matched: false,
        method: 'branch_zone_mismatch',
        reason: `La fuente refiere a otra sucursal/zona (${sourceZones.join(', ')}) distinta a ${placeZones.join(', ')}.`,
      };
    }
  }

  // Coincidencia por nombre + dirección
  const placeNameTokens = significantTokens(place?.name);
  const sourceNameTokens = significantTokens(source.branch_name || source.title || '');
  const nameHits = placeNameTokens.filter((t) => sourceNameTokens.includes(t));
  const nameRatio = placeNameTokens.length > 0 ? nameHits.length / placeNameTokens.length : 0;

  const placeAddrTokens = significantTokens(`${place?.address || ''} ${place?.canton || ''} ${place?.district || ''}`);
  const sourceAddrTokens = significantTokens(`${source.branch_address || ''} ${source.text || ''}`);
  const addrHits = placeAddrTokens.filter((t) => sourceAddrTokens.includes(t));

  if (nameRatio >= 0.6 && (addrHits.length >= 1 || (placeZones.length > 0 && sourceZones.some((z) => placeZones.includes(z))))) {
    return { matched: true, method: 'name_and_address', reason: null };
  }

  if (
    source.source_type === 'official_website' &&
    placeWebsite &&
    source.source_url &&
    String(source.source_url).trim() === String(placeWebsite).trim() &&
    (sourceZones.length === 0 || placeZones.length === 0 || sourceZones.some((z) => placeZones.includes(z)))
  ) {
    return { matched: true, method: 'registered_official_website', reason: null };
  }

  return {
    matched: false,
    method: 'unidentified_branch',
    reason: 'No se pudo confirmar que la fuente corresponda a esta sucursal por nombre y dirección ni por ID de proveedor.',
  };
}

/**
 * Extrae condiciones explícitas del texto. Cualquier condición no mencionada queda en null (desconocida).
 */
function extractExplicitConditions(text) {
  const norm = normalizeText(text);

  // Especie: solo si se menciona explícitamente
  const species = [];
  if (/\b(perr[oa]s?|canin[oa]s?|dogs?)\b/.test(norm)) species.push('dog');
  if (/\b(gat[oa]s?|felin[oa]s?|cats?)\b/.test(norm)) species.push('cat');
  const speciesAllowed = species.length > 0 ? species : null;

  // Ubicación (terraza / exterior vs interior)
  const mentionsOutdoor = /\b(terraza|exterior|patio|aire libre|outdoor)\b/.test(norm);
  const mentionsIndoor = /\b(interior|adentro|salon interno|indoor)\b/.test(norm);
  const onlyOutdoor = /\b(solo|solamente|unicamente)\s+(?:en\s+)?(?:la\s+)?(?:terraza|exterior|patio)\b/.test(norm);
  let seatingAccess = null;
  if (onlyOutdoor) {
    seatingAccess = 'outdoor';
  } else if (mentionsOutdoor && mentionsIndoor) {
    seatingAccess = 'both';
  } else if (mentionsOutdoor) {
    seatingAccess = 'outdoor';
  } else if (mentionsIndoor) {
    seatingAccess = 'indoor';
  }

  // Correa
  let leashRequired = null;
  if (/\b(con correa|correa obligatoria|uso de correa|sujet[oa]s? con correa|con pechera y correa)\b/.test(norm)) {
    leashRequired = true;
  } else if (/\b(sin correa|libre de correa|correa no obligatoria)\b/.test(norm)) {
    leashRequired = false;
  }

  // Tamaño / peso
  let sizeOrWeight = null;
  const sizeMatch = String(text || '').match(/\b(razas?\s+pequeñ[oa]s?|perros?\s+pequeñ[oa]s?|hasta\s+\d+\s*kg|menores?\s+de\s+\d+\s*kg)\b/i);
  if (sizeMatch) {
    sizeOrWeight = sizeMatch[0];
  }

  // Reserva
  let reservationRequired = null;
  if (/\b(con reserva|requiere reserva|reservacion previa|reserva previa)\b/.test(norm)) {
    reservationRequired = true;
  }

  return {
    species_allowed: speciesAllowed,
    size_or_weight_restriction: sizeOrWeight,
    max_pets: null,
    seating_access: seatingAccess,
    leash_required: leashRequired,
    reservation_required: reservationRequired,
    notes: null,
  };
}

/**
 * Extrae el fragmento original exacto donde aparece la declaración sobre mascotas.
 */
function extractBestExcerpt(rawText) {
  const clean = String(rawText || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const sentences = clean.match(/[^.!?\n]+[.!?]?/g) || [clean];
  for (const s of sentences) {
    if (analyzePetPolicyStatement(s) !== 'unknown') {
      return s.trim().slice(0, 320);
    }
  }
  return clean.slice(0, 320);
}

function buildEvidenceHash({ placeId, sourceType, sourceUrl, excerpt }) {
  const payload = [
    String(placeId || '').trim(),
    String(sourceType || '').trim().toLowerCase(),
    String(sourceUrl || '').trim().toLowerCase(),
    normalizeText(excerpt),
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

class PetPolicyHintDetector {
  /**
   * Extrae una declaración explícita de admisión o rechazo usando IA (si está configurada y habilitada)
   * protegida siempre por las reglas estrictas del etiquetador (sin falsos positivos).
   */
  async extractStatementWithAi(rawText, { placeName = '', aiExtractor = null } = {}) {
    const cleanText = String(rawText || '').trim();
    if (!cleanText) {
      return { access_status: 'unknown', excerpt: '', conditions: extractExplicitConditions('') };
    }

    // Reglas estrictas del etiquetador (evitan falsos positivos como "tiene terraza", "vendemos comida para perros", "¿se admiten mascotas?")
    const strictStatus = analyzePetPolicyStatement(cleanText);
    const heuristicExcerpt = extractBestExcerpt(cleanText);
    const heuristicConditions = extractExplicitConditions(heuristicExcerpt || cleanText);

    let aiResult = null;
    if (typeof aiExtractor === 'function') {
      try {
        aiResult = await aiExtractor({ text: cleanText, placeName });
      } catch {
        aiResult = null;
      }
    } else if (process.env.NODE_ENV !== 'test' && deepSeekClient.isConfigured()) {
      try {
        aiResult = await deepSeekClient.generateJson({
          systemInstruction: [
            'Eres un extractor estricto de políticas de admisión de mascotas en restaurantes.',
            'Devuelve JSON con: { "access_status": "allowed"|"not_allowed"|"unknown", "excerpt": string, "conditions": { "species_allowed": ["dog"|"cat"]|null, "seating_access": "outdoor"|"indoor"|"both"|null, "leash_required": boolean|null, "size_or_weight_restriction": string|null, "reservation_required": boolean|null } }.',
            'REGLAS CRÍTICAS:',
            '- "tiene terraza", "vendemos comida para perros" y "¿se admiten mascotas?" NO indican admisión -> devolver "unknown".',
            '- "No se admiten mascotas" o equivalentes claros es evidencia de rechazo -> devolver "not_allowed".',
            '- Si una condición no aparece explícitamente en el texto, dejarla en null.',
          ].join(' '),
          prompt: `Comercio: "${placeName}"\nTexto de fuente:\n"""${cleanText.slice(0, 2500)}"""`,
        });
      } catch {
        aiResult = null;
      }
    }

    // Fusión segura: la IA nunca puede convertir un falso positivo en 'allowed' si el etiquetador estricto no ve admisión explícita,
    // y nunca puede ocultar un rechazo explícito detectado por el etiquetador.
    let finalStatus = strictStatus;
    if (aiResult && ['allowed', 'not_allowed', 'unknown'].includes(aiResult.access_status)) {
      if (hasExplicitPetRejection(cleanText)) {
        finalStatus = 'not_allowed';
      } else if (aiResult.access_status === 'allowed' && hasExplicitPetAdmission(cleanText)) {
        finalStatus = 'allowed';
      } else if (aiResult.access_status === 'not_allowed' && hasExplicitPetRejection(cleanText)) {
        finalStatus = 'not_allowed';
      } else {
        finalStatus = strictStatus;
      }
    }

    const aiCond = aiResult?.conditions && typeof aiResult.conditions === 'object' ? aiResult.conditions : {};
    const mergedConditions = {
      species_allowed: Array.isArray(aiCond.species_allowed) && aiCond.species_allowed.length > 0
        ? aiCond.species_allowed
        : heuristicConditions.species_allowed,
      size_or_weight_restriction:
        aiCond.size_or_weight_restriction ?? heuristicConditions.size_or_weight_restriction ?? null,
      max_pets: aiCond.max_pets !== undefined && aiCond.max_pets !== null ? Number(aiCond.max_pets) : null,
      seating_access: ['outdoor', 'indoor', 'both'].includes(aiCond.seating_access)
        ? aiCond.seating_access
        : heuristicConditions.seating_access,
      leash_required: typeof aiCond.leash_required === 'boolean'
        ? aiCond.leash_required
        : heuristicConditions.leash_required,
      reservation_required: typeof aiCond.reservation_required === 'boolean'
        ? aiCond.reservation_required
        : heuristicConditions.reservation_required,
      notes: null,
    };

    const excerpt = (typeof aiResult?.excerpt === 'string' && aiResult.excerpt.trim().length > 0 && cleanText.includes(aiResult.excerpt.trim()))
      ? aiResult.excerpt.trim().slice(0, 320)
      : heuristicExcerpt;

    return {
      access_status: finalStatus,
      excerpt,
      conditions: mergedConditions,
    };
  }

  async _loadPlaceEvidence(placeId) {
    const rows = await query(
      `SELECT * FROM place_pet_evidence WHERE place_id = ? AND status != 'retracted' ORDER BY checked_at DESC`,
      [placeId]
    );
    return (rows || []).map((r) => {
      let cond = {};
      try {
        cond = typeof r.conditions_json === 'string' ? JSON.parse(r.conditions_json) : (r.conditions_json || {});
      } catch {
        cond = {};
      }
      return { ...r, conditions: cond };
    });
  }

  _hasProcessedEvidenceHash(existingEvidences, evidenceHash) {
    return (existingEvidences || []).some((ev) => {
      const metaHash = ev.conditions?._evidence_meta?.evidence_hash;
      if (metaHash && metaHash === evidenceHash) return true;
      if (typeof ev.evidence_ref === 'string' && ev.evidence_ref.includes(evidenceHash)) return true;
      return false;
    });
  }

  /**
   * Selecciona locales candidatos para detección por lotes:
   * política vencida, próxima a vencer o sin confirmar (con rotación para no repetir siempre los mismos).
   */
  async selectEligiblePlaces({
    placeIds = null,
    limit = DEFAULT_BATCH_SIZE,
    expiringWithinDays = 14,
    cooldownDays = DEFAULT_COOLDOWN_DAYS,
    now = new Date(),
  } = {}) {
    const windowMs = Math.max(1, Number(expiringWithinDays) || 14) * 24 * 60 * 60 * 1000;
    const cooldownCutoff = new Date(now.getTime() - Math.max(1, Number(cooldownDays) || 14) * 24 * 60 * 60 * 1000).toISOString();
    const allPlaces = await placesRepository.findAll({ limit: Math.max(limit * 4, 200) });
    const filtered = Array.isArray(placeIds) && placeIds.length > 0
      ? allPlaces.filter((p) => placeIds.includes(p.id))
      : allPlaces;

    let recentlyChecked = new Set();
    if (!Array.isArray(placeIds) || placeIds.length === 0) {
      const checkRows = await query(
        `SELECT place_id FROM automation_events WHERE event_type = 'hint_batch_checked' AND created_at >= ?`,
        [cooldownCutoff]
      ).catch(() => []);
      recentlyChecked = new Set((checkRows || []).map((r) => r.place_id));
    }

    const eligible = [];
    for (const place of filtered) {
      const evidences = await this._loadPlaceEvidence(place.id);
      const fallback = petCompatibilityService.extractInternalPolicy(place);
      const reconciled = petCompatibilityService.reconcileEvidence(evidences.length ? evidences : [fallback], now);

      const dueMs = reconciled.provenance?.review_due_at
        ? new Date(reconciled.provenance.review_due_at).getTime()
        : NaN;
      const isExpiringSoon = Number.isFinite(dueMs) && dueMs - now.getTime() <= windowMs;

      if (reconciled.is_expired) {
        eligible.push({ place, evidences, reconciled, priority: 1, eligibility_reason: 'expired' });
      } else if (isExpiringSoon) {
        eligible.push({ place, evidences, reconciled, priority: 2, eligibility_reason: 'expiring_soon' });
      } else if (!reconciled.is_confirmed && !recentlyChecked.has(place.id)) {
        eligible.push({ place, evidences, reconciled, priority: 3, eligibility_reason: 'unconfirmed' });
      }
    }

    eligible.sort((a, b) => a.priority - b.priority);
    return eligible.slice(0, Math.max(1, Math.min(25, Number(limit) || DEFAULT_BATCH_SIZE)));
  }

  /**
   * Recopila fuentes externas autorizadas (web oficial y reseñas de proveedores autorizados)
   * con timeout y reintentos limitados, registrando fallos sin alterar la política vigente.
   */
  async collectAuthorizedSources(place, {
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    sourcesProvider = null,
    now = new Date(),
  } = {}) {
    const sources = [];
    const providerFailures = [];

    // 1. Adaptador inyectado (pruebas o integraciones adicionales autorizadas)
    if (typeof sourcesProvider === 'function') {
      try {
        const injected = await sourcesProvider(place);
        if (Array.isArray(injected)) {
          sources.push(...injected);
        }
      } catch (err) {
        providerFailures.push({
          provider: 'authorized_sources_provider',
          error: err?.message || 'PROVIDER_ERROR',
          checked_at: now.toISOString(),
        });
      }
      return { sources, providerFailures };
    }

    // 2. Web oficial del comercio (solo URL pública válida)
    const websiteUrl = place?.website || place?.attributes_metadata?.website || null;
    if (websiteUrl && isSafePublicHttpUrl(websiteUrl)) {
      try {
        const resp = await fetchWithRetry(
          websiteUrl,
          { method: 'GET', headers: { Accept: 'text/html,text/plain;q=0.9' } },
          { timeoutMs, maxRetries, fetchImpl }
        );
        if (resp.ok) {
          const rawHtml = (await resp.text()).slice(0, MAX_HTML_BYTES);
          const text = stripHtmlToText(rawHtml);
          if (text) {
            sources.push({
              source_type: 'official_website',
              provider_name: 'official_website',
              source_url: websiteUrl,
              branch_name: place.name,
              branch_address: place.address || place.canton || '',
              text,
              checked_at: now.toISOString(),
            });
          }
        } else {
          providerFailures.push({
            provider: 'official_website',
            url: websiteUrl,
            error: `HTTP_${resp.status}`,
            checked_at: now.toISOString(),
          });
        }
      } catch (err) {
        providerFailures.push({
          provider: 'official_website',
          url: websiteUrl,
          error: err?.message || 'WEBSITE_FETCH_FAILED',
          checked_at: now.toISOString(),
        });
      }
    }

    // 3. Integración autorizada de Google Places (si está configurada y el local tiene coordenadas)
    if (googlePlacesClient.isConfigured() && Number.isFinite(Number(place?.lat)) && Number.isFinite(Number(place?.lng))) {
      try {
        const gRes = await googlePlacesClient.searchNearbyRestaurants({
          lat: place.lat,
          lng: place.lng,
          radius: 400,
          limit: 5,
          fetchImpl,
        });
        for (const item of gRes?.places || []) {
          if (item.allows_dogs_signal !== null && item.allows_dogs_signal !== undefined) {
            sources.push({
              source_type: 'authorized_review',
              provider_name: 'google_places',
              provider_place_id: item.external_id,
              source_url: item.source_url || null,
              branch_name: item.name,
              branch_address: item.address || '',
              text: item.allows_dogs_signal
                ? 'Se admiten perros según ficha de Google Places.'
                : 'No se admiten perros según ficha de Google Places.',
              checked_at: now.toISOString(),
            });
          }
        }
      } catch (err) {
        providerFailures.push({
          provider: 'google_places',
          error: err?.code || err?.message || 'GOOGLE_PLACES_FAILED',
          checked_at: now.toISOString(),
        });
      }
    }

    return { sources, providerFailures };
  }

  /**
   * Ejecuta el lote de detección de indicios de admisión de mascotas para locales elegibles.
   * Guarda evidencia externa exclusivamente como sugerencia (nunca confirma ni sobrescribe
   * confirmaciones vigentes) y envía conflictos o sucursales no identificadas al panel de revisión.
   */
  async runBatchDetection({
    placeIds = null,
    limit = DEFAULT_BATCH_SIZE,
    expiringWithinDays = 14,
    cooldownDays = DEFAULT_COOLDOWN_DAYS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    maxDurationMs = DEFAULT_MAX_DURATION_MS,
    fetchImpl = fetch,
    sourcesProvider = null,
    aiExtractor = null,
    actorUserId = 'pet_hint_detector',
    now = new Date(),
  } = {}) {
    const startedAt = Date.now();
    const eligibleEntries = await this.selectEligiblePlaces({
      placeIds,
      limit,
      expiringWithinDays,
      cooldownDays,
      now,
    });

    const summary = {
      batch_size: Math.max(1, Math.min(25, Number(limit) || DEFAULT_BATCH_SIZE)),
      eligible_total: eligibleEntries.length,
      processed_places: 0,
      suggestions_created: 0,
      duplicates_skipped: 0,
      branch_mismatches: 0,
      conflicts_flagged: 0,
      pending_no_source: 0,
      provider_failures: 0,
      stopped_due_to_quota: false,
      stopped_due_to_time_budget: false,
      remaining_pending: eligibleEntries.length,
      results: [],
    };

    for (const entry of eligibleEntries) {
      if (Date.now() - startedAt >= maxDurationMs) {
        summary.stopped_due_to_time_budget = true;
        break;
      }

      const { place, evidences: existingEvidences, eligibility_reason } = entry;

      const placeResult = {
        place_id: place.id,
        place_name: place.name,
        eligibility_reason,
        suggestions_created: [],
        duplicates_skipped: 0,
        branch_mismatches: [],
        conflicts: [],
        provider_failures: [],
      };

      const { sources, providerFailures } = await this.collectAuthorizedSources(place, {
        fetchImpl,
        timeoutMs,
        maxRetries,
        sourcesProvider,
        now,
      });

      if (providerFailures.length > 0) {
        placeResult.provider_failures.push(...providerFailures);
        summary.provider_failures += providerFailures.length;
        await auditService.record({
          userId: actorUserId,
          action: 'PET_HINT_PROVIDER_FAILURE',
          resource: 'places',
          resourceId: place.id,
          details: { failures: providerFailures },
        }).catch(() => {});

        if (providerFailures.some((f) => isQuotaExhaustedError({ message: f.error, code: f.error }))) {
          summary.stopped_due_to_quota = true;
          summary.results.push(placeResult);
          break;
        }
      }

      summary.processed_places += 1;
      if (sources.length === 0) {
        summary.pending_no_source += 1;
      }

      const workingEvidences = [...existingEvidences];

      for (const source of sources) {
        const checkedAt = source.checked_at || now.toISOString();
        const hintSourceType = source.source_type === 'official_website' ? 'official_website' : 'authorized_review';
        const providerName = source.provider_name || hintSourceType;

        // 1. Verificar correspondencia de sucursal
        const branchCheck = verifyBranchMatch(place, source);
        if (!branchCheck.matched) {
          placeResult.branch_mismatches.push({
            source_url: source.source_url || null,
            provider_name: providerName,
            method: branchCheck.method,
            reason: branchCheck.reason,
          });
          summary.branch_mismatches += 1;

          const mismatchKey = `hint_branch_mismatch:${place.id}:${crypto
            .createHash('sha256')
            .update(`${providerName}|${source.source_url || ''}|${source.branch_name || ''}|${source.branch_address || ''}`)
            .digest('hex')
            .slice(0, 24)}`;

          await petVerificationService._insertAutomationEvent({
            eventType: 'review_pending',
            placeId: place.id,
            idempotencyKey: mismatchKey,
            payload: {
              place_id: place.id,
              place_name: place.name,
              reason: 'branch_unidentified',
              detail: branchCheck.reason,
              source_url: source.source_url || null,
              source_type: hintSourceType,
              provider_name: providerName,
              checked_at: checkedAt,
            },
          });
          continue;
        }

        // 2. Extraer declaración explícita y condiciones con IA + reglas estrictas del etiquetador
        const extracted = await this.extractStatementWithAi(source.text, {
          placeName: place.name,
          aiExtractor,
        });

        if (extracted.access_status === 'unknown') {
          continue;
        }

        // 3. Deduplicar para evitar reprocesar la misma evidencia
        const evidenceHash = buildEvidenceHash({
          placeId: place.id,
          sourceType: hintSourceType,
          sourceUrl: source.source_url || '',
          excerpt: extracted.excerpt,
        });

        if (this._hasProcessedEvidenceHash(workingEvidences, evidenceHash)) {
          placeResult.duplicates_skipped += 1;
          summary.duplicates_skipped += 1;
          continue;
        }

        // 4. Guardar únicamente como sugerencia (source_type = 'external_provider', nunca confirma ni sobrescribe)
        const evidenceId = `ev_hint_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const conditionsPayload = {
          ...extracted.conditions,
          notes: extracted.excerpt,
          _evidence_meta: {
            suggestion_only: true,
            evidence_hash: evidenceHash,
            excerpt: extracted.excerpt,
            source_url: source.source_url || null,
            hint_source_type: hintSourceType,
            checked_at: checkedAt,
            branch_verified: true,
            branch_match_method: branchCheck.method,
          },
        };

        await execute(
          `INSERT INTO place_pet_evidence
            (id, place_id, source_type, provider_name, external_place_id, access_status, conditions_json, evidence_ref, verified_by, checked_at, expires_at, status)
           VALUES (?, ?, 'external_provider', ?, ?, ?, ?, ?, NULL, ?, NULL, 'active')`,
          [
            evidenceId,
            place.id,
            providerName,
            source.provider_place_id || source.external_place_id || null,
            extracted.access_status,
            JSON.stringify(conditionsPayload),
            source.source_url || `hint:${evidenceHash}`,
            checkedAt,
          ]
        );

        const insertedRecord = {
          id: evidenceId,
          place_id: place.id,
          source_type: 'external_provider',
          provider_name: providerName,
          external_place_id: source.provider_place_id || source.external_place_id || null,
          access_status: extracted.access_status,
          conditions: conditionsPayload,
          evidence_ref: source.source_url || `hint:${evidenceHash}`,
          checked_at: checkedAt,
          expires_at: null,
          status: 'active',
        };
        workingEvidences.push(insertedRecord);

        placeResult.suggestions_created.push({
          evidence_id: evidenceId,
          access_status: extracted.access_status,
          source_type: hintSourceType,
          source_url: source.source_url || null,
          excerpt: extracted.excerpt,
          checked_at: checkedAt,
          conditions: extracted.conditions,
        });
        summary.suggestions_created += 1;

        // Enviar sugerencia al panel de revisión existente (idempotente)
        await petVerificationService._insertAutomationEvent({
          eventType: 'review_pending',
          placeId: place.id,
          idempotencyKey: `hint_suggestion:${place.id}:${evidenceHash.slice(0, 24)}`,
          payload: {
            place_id: place.id,
            place_name: place.name,
            reason: 'external_hint_suggestion',
            evidence_id: evidenceId,
            suggested_access_status: extracted.access_status,
            source_type: hintSourceType,
            provider_name: providerName,
            source_url: source.source_url || null,
            excerpt: extracted.excerpt,
            conditions: extracted.conditions,
            checked_at: checkedAt,
          },
        });
      }

      // 5. Reconciliar evidencias para detectar contradicciones y enviarlas al panel de revisión existente
      if (workingEvidences.length > 0) {
        const reconciledAfter = petCompatibilityService.reconcileEvidence(workingEvidences, now);
        if (reconciledAfter.conflicts.length > 0) {
          placeResult.conflicts = reconciledAfter.conflicts;
          summary.conflicts_flagged += 1;

          const conflictKey = `hint_conflict:${place.id}:${crypto
            .createHash('sha256')
            .update(workingEvidences.map((e) => `${e.source_type}:${e.access_status}:${e.conditions?._evidence_meta?.evidence_hash || e.id}`).sort().join('|'))
            .digest('hex')
            .slice(0, 24)}`;

          await petVerificationService._insertAutomationEvent({
            eventType: 'contradiction_detected',
            placeId: place.id,
            idempotencyKey: conflictKey,
            payload: {
              place_id: place.id,
              place_name: place.name,
              conflicts: reconciledAfter.conflicts,
              detected_at: now.toISOString(),
            },
          });
        }
      }

      summary.results.push(placeResult);
    }

    summary.remaining_pending = Math.max(0, eligibleEntries.length - summary.processed_places);
    return summary;
  }
}

module.exports = new PetPolicyHintDetector();
module.exports.PetPolicyHintDetector = PetPolicyHintDetector;
module.exports.verifyBranchMatch = verifyBranchMatch;
module.exports.extractExplicitConditions = extractExplicitConditions;
module.exports.buildEvidenceHash = buildEvidenceHash;
module.exports.isSafePublicHttpUrl = isSafePublicHttpUrl;
module.exports.isQuotaExhaustedError = isQuotaExhaustedError;
module.exports.authorizeCronRequest = authorizeCronRequest;
