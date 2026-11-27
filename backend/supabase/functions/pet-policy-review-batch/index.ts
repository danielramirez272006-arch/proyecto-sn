// Supabase Edge Function: pet-policy-review-batch
// Revisión diaria por lotes de indicios de políticas de mascotas en restaurantes.
// Programada exclusivamente por Supabase Cron (pg_cron + pg_net).
// - Solo usa fuentes gratuitas/autorizadas ya configuradas (web oficial, OSM Overpass, Gemini si existe).
// - Nunca confirma ni sobrescribe políticas confirmadas; guarda únicamente sugerencias en app_private.place_pet_evidence.
// - Detiene el lote inmediatamente si se agota una cuota gratuita (HTTP 429) o el presupuesto de tiempo.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 25;
const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_DURATION_MS = 40000;
const DEFAULT_COOLDOWN_DAYS = 14;
const MAX_HTML_BYTES = 120 * 1024;

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

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(value: unknown): string[] {
  return normalizeText(value)
    .split(' ')
    .filter((w) => w.length >= 3 && !BRANCH_STOPWORDS.has(w));
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function isSafePublicHttpUrl(rawUrl: unknown): boolean {
  try {
    const parsed = new URL(String(rawUrl ?? '').trim());
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

function stripHtmlToText(html: string): string {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasExplicitPetRejection(description: string): boolean {
  const text = String(description || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const rejection =
    /\b(?:no se admiten|no se permiten|no acept(?:a|amos|an)|no admit(?:e|imos|en)|no permit(?:e|imos|en)|no ingresan|prohibid[oa]s?\s+(?:el ingreso de\s+)?(?:las\s+)?(?:mascotas|perros|gatos)|(?:mascotas|perros|gatos)\s+(?:no\s+(?:son\s+)?(?:admitid[oa]s|permitid[oa]s|aceptad[oa]s)|prohibid[oa]s))\b/;
  return (text.match(/[^.!?;\n]+\??/g) || []).some(
    (sentence) => !/[¿?]/.test(sentence) && rejection.test(sentence)
  );
}

function hasExplicitPetAdmission(description: string): boolean {
  const text = String(description || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const explicitAdmission =
    /\b(?:(?:acept(?:a|amos|an)|admit(?:e|imos|en)|permit(?:e|imos|en)|se admiten|se permiten)\s+(?:el ingreso de\s+)?(?:a\s+)?(?:las\s+|los\s+|tus\s+|sus\s+)?(?:mascotas|perros|gatos)|(?:mascotas|perros|gatos)\s+(?:son\s+)?(?:bienvenid[oa]s|admitid[oa]s|permitid[oa]s))\b/;
  const uncertain = /\b(?:no|excepto|pregunta|consulta|confirmar|prohibid[oa]s?)\b/;
  return (
    (text.match(/[^.!?;\n]+\??/g) || []).some(
      (sentence) => !/[¿?]/.test(sentence) && explicitAdmission.test(sentence) && !uncertain.test(sentence)
    ) && !hasExplicitPetRejection(text)
  );
}

function analyzePetPolicyStatement(text: string): 'allowed' | 'not_allowed' | 'unknown' {
  if (hasExplicitPetRejection(text)) return 'not_allowed';
  if (hasExplicitPetAdmission(text)) return 'allowed';
  return 'unknown';
}

function extractBestExcerpt(rawText: string): string {
  const clean = String(rawText || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const sentences = clean.match(/[^.!?\n]+[.!?]?/g) || [clean];
  for (const s of sentences) {
    if (analyzePetPolicyStatement(s) !== 'unknown') return s.trim().slice(0, 320);
  }
  return clean.slice(0, 320);
}

function extractExplicitConditions(text: string) {
  const norm = normalizeText(text);
  const species: string[] = [];
  if (/\b(perr[oa]s?|canin[oa]s?|dogs?)\b/.test(norm)) species.push('dog');
  if (/\b(gat[oa]s?|felin[oa]s?|cats?)\b/.test(norm)) species.push('cat');

  const mentionsOutdoor = /\b(terraza|exterior|patio|aire libre|outdoor)\b/.test(norm);
  const mentionsIndoor = /\b(interior|adentro|salon interno|indoor)\b/.test(norm);
  const onlyOutdoor = /\b(solo|solamente|unicamente)\s+(?:en\s+)?(?:la\s+)?(?:terraza|exterior|patio)\b/.test(norm);
  let seatingAccess: string | null = null;
  if (onlyOutdoor) seatingAccess = 'outdoor';
  else if (mentionsOutdoor && mentionsIndoor) seatingAccess = 'both';
  else if (mentionsOutdoor) seatingAccess = 'outdoor';
  else if (mentionsIndoor) seatingAccess = 'indoor';

  let leashRequired: boolean | null = null;
  if (/\b(con correa|correa obligatoria|uso de correa|sujet[oa]s? con correa)\b/.test(norm)) leashRequired = true;
  else if (/\b(sin correa|libre de correa|correa no obligatoria)\b/.test(norm)) leashRequired = false;

  const sizeMatch = String(text || '').match(
    /\b(razas?\s+pequeñ[oa]s?|perros?\s+pequeñ[oa]s?|hasta\s+\d+\s*kg|menores?\s+de\s+\d+\s*kg)\b/i
  );

  return {
    species_allowed: species.length > 0 ? species : null,
    size_or_weight_restriction: sizeMatch ? sizeMatch[0] : null,
    max_pets: null,
    seating_access: seatingAccess,
    leash_required: leashRequired,
    reservation_required: /\b(con reserva|requiere reserva|reserva previa)\b/.test(norm) ? true : null,
    notes: null,
  };
}

function verifyBranchMatch(place: Record<string, any>, source: Record<string, any>) {
  const meta = place.attributes_metadata || {};
  const placeExternalIds = new Set(
    [
      place.external_id,
      meta.google_place_id,
      meta.foursquare_id,
      meta.osm_id,
      meta.external_id,
      ...(Array.isArray(meta.external_ids) ? meta.external_ids : []),
    ]
      .filter(Boolean)
      .map((v) => String(v).trim())
  );

  const sourceExtId = source.provider_place_id || source.external_place_id || null;
  if (sourceExtId && placeExternalIds.size > 0) {
    if (placeExternalIds.has(String(sourceExtId).trim())) {
      return { matched: true, method: 'provider_id', reason: null };
    }
    return { matched: false, method: 'provider_id_mismatch', reason: 'El ID del proveedor corresponde a otra sucursal.' };
  }

  const placeZoneText = normalizeText(`${place.name || ''} ${place.address || ''} ${place.canton || ''}`);
  const placeZones = KNOWN_CR_ZONES.filter((z) => placeZoneText.includes(z));
  const sourceZoneText = normalizeText(`${source.branch_name || ''} ${source.branch_address || ''} ${source.text || ''}`);
  const sourceZones = KNOWN_CR_ZONES.filter((z) => sourceZoneText.includes(z));

  if (placeZones.length > 0 && sourceZones.length > 0 && !sourceZones.some((z) => placeZones.includes(z))) {
    return {
      matched: false,
      method: 'branch_zone_mismatch',
      reason: `La fuente refiere a otra zona (${sourceZones.join(', ')}) distinta a ${placeZones.join(', ')}.`,
    };
  }

  const placeNameTokens = significantTokens(place.name);
  const sourceNameTokens = significantTokens(source.branch_name || source.title || '');
  const nameRatio =
    placeNameTokens.length > 0
      ? placeNameTokens.filter((t) => sourceNameTokens.includes(t)).length / placeNameTokens.length
      : 0;

  const placeAddrTokens = significantTokens(`${place.address || ''} ${place.canton || ''}`);
  const sourceAddrTokens = significantTokens(`${source.branch_address || ''} ${source.text || ''}`);
  const addrHits = placeAddrTokens.filter((t) => sourceAddrTokens.includes(t));

  if (nameRatio >= 0.6 && (addrHits.length >= 1 || sourceZones.some((z) => placeZones.includes(z)))) {
    return { matched: true, method: 'name_and_address', reason: null };
  }

  const placeWebsite = meta.website || place.source_url || null;
  if (
    source.source_type === 'official_website' &&
    placeWebsite &&
    source.source_url &&
    String(source.source_url).trim() === String(placeWebsite).trim()
  ) {
    return { matched: true, method: 'registered_official_website', reason: null };
  }

  return {
    matched: false,
    method: 'unidentified_branch',
    reason: 'No se pudo confirmar que la fuente corresponda a esta sucursal por nombre y dirección ni por ID del proveedor.',
  };
}

class QuotaExhaustedError extends Error {
  provider: string;
  constructor(provider: string, message: string) {
    super(message);
    this.name = 'QuotaExhaustedError';
    this.provider = provider;
  }
}

async function fetchWithRetry(url: string, init: RequestInit, timeoutMs: number, maxRetries: number): Promise<Response> {
  let lastErr: unknown = null;
  const attempts = Math.max(1, Math.min(3, maxRetries + 1));
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const resp = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (resp.status === 429) return resp;
      if (resp.ok || (resp.status >= 400 && resp.status < 500)) return resp;
      lastErr = new Error(`HTTP_${resp.status}`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('FETCH_FAILED');
}

async function queryGeminiSearchGrounding(
  place: Record<string, any>,
  apiKey: string,
  model: string,
  timeoutMs: number
) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const prompt = [
    `Busca información pública verificable sobre la política de admisión de mascotas de la sucursal exacta:`,
    `Nombre: "${place.name}"`,
    `Dirección/Zona: "${place.address || place.canton || 'Costa Rica'}"`,
    `Responde en máximo 2 oraciones citando la declaración explícita de admisión o rechazo y sus condiciones (especie, terraza, correa).`,
    `Si no encuentras una declaración explícita de esta sucursal exacta, responde exactamente: SIN_DECLARACION.`,
  ].join('\n');

  const resp = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
      }),
    },
    timeoutMs,
    1
  );

  if (resp.status === 429) {
    throw new QuotaExhaustedError('google_gemini', 'Cuota gratuita de Google Gemini agotada (HTTP 429).');
  }
  if (!resp.ok) {
    throw new Error(`GEMINI_HTTP_${resp.status}`);
  }

  const data = await resp.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p: any) => p.text || '').join(' ').trim() || '';
  if (!text || /SIN_DECLARACION/i.test(text)) return [];

  const chunks = candidate?.groundingMetadata?.groundingChunks || [];
  const firstWeb = chunks.find((c: any) => c?.web?.uri)?.web || null;
  if (!firstWeb?.uri) return [];

  return [
    {
      source_type: 'authorized_review',
      provider_name: 'gemini_google_search',
      source_url: firstWeb.uri,
      branch_name: firstWeb.title || place.name,
      branch_address: place.address || place.canton || '',
      text,
      checked_at: new Date().toISOString(),
    },
  ];
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. Autenticación estricta del programador (Supabase Cron)
  const expectedSecret = (Deno.env.get('PET_REVIEW_CRON_SECRET') || '').trim();
  if (!expectedSecret) {
    return new Response(
      JSON.stringify({ ok: false, error: 'CRON_SECRET_NOT_CONFIGURED' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const headerSecret = (req.headers.get('x-cron-secret') || '').trim();
  const authHeader = (req.headers.get('authorization') || '').trim();
  const bearerSecret = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const providedSecret = headerSecret || bearerSecret;

  if (!timingSafeEqualStr(providedSecret, expectedSecret)) {
    return new Response(JSON.stringify({ ok: false, error: 'UNAUTHORIZED_SCHEDULER' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: 'SUPABASE_CREDENTIALS_MISSING' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, any> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const envBatchSize = Number(Deno.env.get('PET_REVIEW_BATCH_SIZE') || DEFAULT_BATCH_SIZE);
  const batchSize = Math.max(
    1,
    Math.min(MAX_BATCH_SIZE, Number(body.batch_size ?? envBatchSize) || DEFAULT_BATCH_SIZE)
  );
  const expiringWithinDays = Math.max(1, Number(body.expiring_within_days ?? 14) || 14);
  const cooldownDays = Math.max(1, Number(body.cooldown_days ?? DEFAULT_COOLDOWN_DAYS) || DEFAULT_COOLDOWN_DAYS);
  const timeoutMs = Math.max(1500, Math.min(12000, Number(body.timeout_ms ?? DEFAULT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS));
  const maxRetries = Math.max(0, Math.min(2, Number(body.max_retries ?? DEFAULT_MAX_RETRIES) || DEFAULT_MAX_RETRIES));
  const maxDurationMs = Math.max(10000, Math.min(50000, Number(body.max_duration_ms ?? DEFAULT_MAX_DURATION_MS) || DEFAULT_MAX_DURATION_MS));

  const geminiApiKey = (Deno.env.get('GEMINI_API_KEY') || '').trim();
  const geminiModel = (Deno.env.get('GEMINI_MODEL') || 'gemini-3.1-flash-lite').trim();
  const enableGeminiSearch = Deno.env.get('PET_REVIEW_ENABLE_GEMINI_SEARCH') !== 'false' && Boolean(geminiApiKey);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const startedAt = Date.now();
  const now = new Date();
  const nowIso = now.toISOString();
  const windowMs = expiringWithinDays * 24 * 60 * 60 * 1000;
  const cooldownCutoff = new Date(now.getTime() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();

  // 2. Cargar locales, marcas de rotación y evidencias vía RPC segura (service_role -> app_private)
  const { data: stateData, error: stateErr } = await supabase.rpc('pet_review_get_batch_state', {
    p_cooldown_cutoff: cooldownCutoff,
  });

  if (stateErr) {
    return new Response(JSON.stringify({ ok: false, error: stateErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const places = Array.isArray(stateData?.places) ? stateData.places : [];
  const recentlyChecked = new Set(Array.isArray(stateData?.recent_checked) ? stateData.recent_checked : []);
  const allEvidences = Array.isArray(stateData?.evidences) ? stateData.evidences : [];

  const evidenceByPlace = new Map<string, any[]>();
  for (const row of allEvidences) {
    const list = evidenceByPlace.get(row.place_id) || [];
    let cond: Record<string, any> = {};
    try {
      cond = typeof row.conditions_json === 'string' ? JSON.parse(row.conditions_json) : (row.conditions_json || {});
    } catch {
      cond = {};
    }
    list.push({ ...row, conditions: cond });
    evidenceByPlace.set(row.place_id, list);
  }

  // 3. Seleccionar y priorizar lote configurable (vencidas -> próximas a vencer -> sin confirmar no revisadas recientemente)
  const candidates: Array<{ place: any; evidences: any[]; priority: number; reason: string }> = [];
  for (const place of places || []) {
    const evidences = evidenceByPlace.get(place.id) || [];
    const metaPolicy = place.attributes_metadata?.pet_policy || {};
    const confirmedEv = evidences.find(
      (e) => (e.source_type === 'business_confirmation' || e.source_type === 'admin_review') && e.status === 'active'
    );
    const expiresAt = confirmedEv?.expires_at || metaPolicy.expires_at || null;
    const dueMs = expiresAt ? new Date(expiresAt).getTime() : NaN;
    const isConfirmed = Boolean(
      confirmedEv &&
        (confirmedEv.access_status === 'allowed' || confirmedEv.access_status === 'not_allowed') &&
        (!Number.isFinite(dueMs) || dueMs >= now.getTime())
    );
    const isExpired = Boolean(confirmedEv && Number.isFinite(dueMs) && dueMs < now.getTime());
    const isExpiringSoon = Boolean(confirmedEv && Number.isFinite(dueMs) && dueMs - now.getTime() <= windowMs);

    if (isExpired) {
      candidates.push({ place, evidences, priority: 1, reason: 'expired' });
    } else if (isExpiringSoon) {
      candidates.push({ place, evidences, priority: 2, reason: 'expiring_soon' });
    } else if (!isConfirmed && !recentlyChecked.has(place.id)) {
      candidates.push({ place, evidences, priority: 3, reason: 'unconfirmed' });
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  const batch = candidates.slice(0, batchSize);

  const summary = {
    ok: true,
    scheduler: 'supabase_cron',
    batch_size: batchSize,
    eligible_total: candidates.length,
    processed_places: 0,
    suggestions_created: 0,
    duplicates_skipped: 0,
    branch_mismatches: 0,
    conflicts_flagged: 0,
    pending_no_source: 0,
    provider_failures: 0,
    stopped_due_to_quota: false,
    stopped_due_to_time_budget: false,
    remaining_pending: candidates.length,
    executed_at: nowIso,
  };

  for (const entry of batch) {
    if (Date.now() - startedAt >= maxDurationMs) {
      summary.stopped_due_to_time_budget = true;
      break;
    }

    const { place, evidences } = entry;
    const sources: any[] = [];

    try {
      // Fuente 1: Web oficial registrada en el local
      const websiteUrl = place.attributes_metadata?.website || null;
      if (websiteUrl && isSafePublicHttpUrl(websiteUrl)) {
        try {
          const resp = await fetchWithRetry(
            websiteUrl,
            { method: 'GET', headers: { Accept: 'text/html,text/plain;q=0.9' } },
            timeoutMs,
            maxRetries
          );
          if (resp.status === 429) {
            throw new QuotaExhaustedError('official_website', 'Rate limit HTTP 429');
          }
          if (resp.ok) {
            const text = stripHtmlToText((await resp.text()).slice(0, MAX_HTML_BYTES));
            if (text) {
              sources.push({
                source_type: 'official_website',
                provider_name: 'official_website',
                source_url: websiteUrl,
                branch_name: place.name,
                branch_address: place.address || place.canton || '',
                text,
                checked_at: nowIso,
              });
            }
          }
        } catch (err) {
          if (err instanceof QuotaExhaustedError) throw err;
          summary.provider_failures += 1;
        }
      }

      // Fuente 2: Gemini Search Grounding (solo si está configurado y no hubo web oficial)
      if (sources.length === 0 && enableGeminiSearch) {
        try {
          const gSources = await queryGeminiSearchGrounding(place, geminiApiKey, geminiModel, timeoutMs);
          sources.push(...gSources);
        } catch (err) {
          if (err instanceof QuotaExhaustedError) throw err;
          summary.provider_failures += 1;
        }
      }
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        summary.stopped_due_to_quota = true;
        summary.provider_failures += 1;
        break;
      }
    }

    summary.processed_places += 1;

    if (sources.length === 0) {
      summary.pending_no_source += 1;
    }

    const workingEvidences = [...evidences];
    for (const source of sources) {
      const branchCheck = verifyBranchMatch(place, source);
      if (!branchCheck.matched) {
        summary.branch_mismatches += 1;
        const mismatchHash = (
          await sha256Hex(`${place.id}|${source.provider_name}|${source.source_url || ''}|${source.branch_name || ''}`)
        ).slice(0, 24);
        const dedupeKey = `hint_branch_mismatch:${place.id}:${mismatchHash}`;
        await supabase.rpc('pet_review_upsert_event', {
          p_id: `aut_${Date.now()}_${mismatchHash.slice(0, 6)}`,
          p_event_type: 'review_pending',
          p_place_id: place.id,
          p_dedupe_key: dedupeKey,
          p_status: 'pending',
          p_payload_json: JSON.stringify({
            place_id: place.id,
            place_name: place.name,
            reason: 'branch_unidentified',
            detail: branchCheck.reason,
            source_url: source.source_url || null,
            checked_at: source.checked_at || nowIso,
          }),
          p_processed_at: null,
        });
        continue;
      }

      const accessStatus = analyzePetPolicyStatement(source.text);
      if (accessStatus === 'unknown') continue;

      const excerpt = extractBestExcerpt(source.text);
      const conditions = extractExplicitConditions(excerpt || source.text);
      const evidenceHash = await sha256Hex(
        `${place.id}|${source.source_type}|${String(source.source_url || '').toLowerCase()}|${normalizeText(excerpt)}`
      );

      const alreadyExists = workingEvidences.some(
        (ev) => ev.conditions?._evidence_meta?.evidence_hash === evidenceHash
      );
      if (alreadyExists) {
        summary.duplicates_skipped += 1;
        continue;
      }

      const evidenceId = `ev_hint_${Date.now()}_${evidenceHash.slice(0, 6)}`;
      const conditionsPayload = {
        ...conditions,
        notes: excerpt,
        _evidence_meta: {
          suggestion_only: true,
          evidence_hash: evidenceHash,
          excerpt,
          source_url: source.source_url || null,
          hint_source_type: source.source_type,
          checked_at: source.checked_at || nowIso,
          branch_verified: true,
          branch_match_method: branchCheck.method,
        },
      };

      // Guardar únicamente como sugerencia (nunca sobrescribe places.attributes_metadata.pet_policy)
      await supabase.rpc('pet_review_record_evidence', {
        p_id: evidenceId,
        p_place_id: place.id,
        p_provider_name: source.provider_name || source.source_type,
        p_external_place_id: source.provider_place_id || null,
        p_access_status: accessStatus,
        p_conditions_json: JSON.stringify(conditionsPayload),
        p_evidence_ref: source.source_url || `hint:${evidenceHash}`,
        p_checked_at: source.checked_at || nowIso,
      });

      workingEvidences.push({
        id: evidenceId,
        source_type: 'external_provider',
        access_status: accessStatus,
        conditions: conditionsPayload,
      });
      summary.suggestions_created += 1;

      const suggestionKey = `hint_suggestion:${place.id}:${evidenceHash.slice(0, 24)}`;
      await supabase.rpc('pet_review_upsert_event', {
        p_id: `aut_${Date.now()}_${evidenceHash.slice(0, 6)}`,
        p_event_type: 'review_pending',
        p_place_id: place.id,
        p_dedupe_key: suggestionKey,
        p_status: 'pending',
        p_payload_json: JSON.stringify({
          place_id: place.id,
          place_name: place.name,
          reason: 'external_hint_suggestion',
          evidence_id: evidenceId,
          suggested_access_status: accessStatus,
          source_url: source.source_url || null,
          excerpt,
          conditions,
          checked_at: source.checked_at || nowIso,
        }),
        p_processed_at: null,
      });
    }

    // Detectar contradicción entre fuentes activas (allowed vs not_allowed)
    const explicitStatuses = new Set(
      workingEvidences.map((e) => e.access_status).filter((s) => s === 'allowed' || s === 'not_allowed')
    );
    if (explicitStatuses.has('allowed') && explicitStatuses.has('not_allowed')) {
      summary.conflicts_flagged += 1;
      const conflictKey = `hint_conflict:${place.id}:${nowIso.slice(0, 10)}`;
      await supabase.rpc('pet_review_upsert_event', {
        p_id: `aut_c_${Date.now()}_${place.id.slice(-6)}`,
        p_event_type: 'contradiction_detected',
        p_place_id: place.id,
        p_dedupe_key: conflictKey,
        p_status: 'pending',
        p_payload_json: JSON.stringify({
          place_id: place.id,
          place_name: place.name,
          reason: 'conflicting_pet_sources',
          detected_at: nowIso,
        }),
        p_processed_at: null,
      });
    }

    // Registrar marca de rotación diaria para avanzar por todo el catálogo
    const checkKey = `hint_checked:${place.id}:${nowIso.slice(0, 10)}`;
    await supabase.rpc('pet_review_upsert_event', {
      p_id: `aut_k_${Date.now()}_${place.id.slice(-6)}`,
      p_event_type: 'hint_batch_checked',
      p_place_id: place.id,
      p_dedupe_key: checkKey,
      p_status: 'processed',
      p_payload_json: JSON.stringify({ checked_at: nowIso, sources_found: sources.length }),
      p_processed_at: nowIso,
    });
  }

  summary.remaining_pending = Math.max(0, candidates.length - summary.processed_places);

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
