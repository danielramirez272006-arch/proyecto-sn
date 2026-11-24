const googlePlacesClient = require('../../shared/clients/google-places-client');
const foursquarePlacesClient = require('../../shared/clients/foursquare-places-client');
const wikimediaPlacesClient = require('../../shared/clients/wikimedia-places-client');
const placesRepository = require('./places-repository');
const { PHOTO_NAME_REGEX } = googlePlacesClient;
const { haversineDistanceKm } = require('../../shared/utils/geo-math');

// Caché en memoria de corta duración del catálogo interno para reflejar fotos nuevas rápidamente
let internalCatalogCache = { items: null, ts: 0 };
const INTERNAL_CATALOG_TTL_MS = 15 * 1000;

async function getInternalPlacesWithPhotos(repo = placesRepository) {
  if (internalCatalogCache.items && Date.now() - internalCatalogCache.ts < INTERNAL_CATALOG_TTL_MS) {
    return internalCatalogCache.items;
  }
  try {
    const rows = await repo.findAll({ limit: 500 });
    const withPhotos = (rows || []).filter((p) => p && p.photo_url);
    internalCatalogCache = { items: withPhotos, ts: Date.now() };
    return withPhotos;
  } catch {
    return [];
  }
}

async function resolveFromInternalDatabase(placeInput, deps = {}) {
  const internalId = String(placeInput?.id || '').trim();
  const name = String(placeInput?.name || placeInput?.nombre || '').trim();
  const lat = Number(placeInput?.lat);
  const lng = Number(placeInput?.lng);
  const repo = deps.placesRepo || placesRepository;

  const catalog = await getInternalPlacesWithPhotos(repo);
  if (catalog.length === 0) return null;

  let matched = null;
  if (internalId) {
    matched = catalog.find((p) => String(p.id) === internalId) || null;
  }

  if (!matched && name) {
    const targetNorm = normalizeText(name);
    matched = catalog.find((p) => normalizeText(p.name) === targetNorm) || null;
  }

  if (!matched && name) {
    const targetTokens = tokenSet(name);
    let bestScore = 0;
    for (const candidate of catalog) {
      const candTokens = tokenSet(candidate.name);
      const nameScore = jaccardSimilarity(targetTokens, candTokens);
      if (nameScore < 0.5) continue;
      if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng)) {
        const distKm = haversineDistanceKm(lat, lng, candidate.lat, candidate.lng);
        if (distKm > 2.5) continue;
      }
      if (nameScore > bestScore) {
        bestScore = nameScore;
        matched = candidate;
      }
    }
  }

  if (!matched || !matched.photo_url) return null;

  const galleryEntries = Array.isArray(matched.gallery) && matched.gallery.length > 0
    ? matched.gallery.map((g) => ({
        url: g.url,
        attributions: g.credit || g.author
          ? [{ displayName: g.credit || g.author, uri: g.source_page_url || null, photoUri: null }]
          : [{ displayName: 'Catálogo Synodos', uri: null, photoUri: null }],
      }))
    : [{
        url: matched.photo_url,
        attributions: [{ displayName: 'Catálogo Synodos', uri: null, photoUri: null }],
      }];

  return {
    internal_id: internalId || matched.id,
    external_id: matched.id,
    provider: 'supabase_database',
    status: 'resolved',
    photo_url: matched.photo_url,
    gallery: galleryEntries,
    attributions: galleryEntries[0]?.attributions || [],
    source_url: matched.photo?.source_page_url || null,
    matched_name: matched.name,
    matched_address: matched.address || matched.district || matched.canton || null,
    reason: null,
  };
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value) {
  const stopWords = new Set(['de', 'la', 'el', 'y', 'en', 'del', 'san', 'jose', 'costa', 'rica', 'barrio']);
  return new Set(
    normalizeText(value)
      .split(' ')
      .filter((t) => t.length >= 2 && !stopWords.has(t))
  );
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function scoreCandidate(placeInput, candidate) {
  const targetNameTokens = tokenSet(placeInput.name);
  const candNameTokens = tokenSet(candidate.name);
  const nameScore = jaccardSimilarity(targetNameTokens, candNameTokens);

  const targetAddrTokens = tokenSet(`${placeInput.address || ''} ${placeInput.zone || ''}`);
  const candAddrTokens = tokenSet(candidate.address);
  const addrScore = jaccardSimilarity(targetAddrTokens, candAddrTokens);

  const hasCoords = Number.isFinite(Number(placeInput.lat)) && Number.isFinite(Number(placeInput.lng));
  const distanceKm = hasCoords
    ? haversineDistanceKm(Number(placeInput.lat), Number(placeInput.lng), candidate.lat, candidate.lng)
    : null;

  // Rechazar si está demasiado lejos (> 0.6 km) cuando hay coordenadas conocidas
  if (distanceKm !== null && distanceKm > 0.6) {
    return { valid: false, score: 0, distanceKm, nameScore, addrScore };
  }

  // Exigir similitud mínima de nombre para no asociar por coincidencia casual de zona
  if (nameScore < 0.35) {
    return { valid: false, score: 0, distanceKm, nameScore, addrScore };
  }

  const distScore = distanceKm === null ? 0.5 : Math.max(0, 1 - distanceKm / 0.6);
  const total = nameScore * 0.55 + distScore * 0.3 + addrScore * 0.15;

  return {
    valid: true,
    score: total,
    distanceKm,
    nameScore,
    addrScore,
  };
}

function formatAttributions(photoObj) {
  if (!Array.isArray(photoObj?.authorAttributions)) return [];
  return photoObj.authorAttributions.map((a) => ({
    displayName: a.displayName || null,
    uri: a.uri || null,
    photoUri: a.photoUri || null,
  }));
}

async function resolveFromFoursquare(placeInput, fsqClient) {
  if (!fsqClient || !fsqClient.isConfigured()) return null;

  const { name, address, zone, lat, lng } = placeInput;
  const internalId = String(placeInput?.id || '').trim() || null;

  let candidates;
  try {
    candidates = await fsqClient.searchPlaces({
      query: name,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      radiusMeters: 700,
      limit: 5,
    });
  } catch {
    return null;
  }

  const scored = candidates
    .map((c) => ({
      candidate: c,
      eval: scoreCandidate({ name, address, zone, lat, lng }, c),
    }))
    .filter((entry) => entry.eval.valid)
    .sort((a, b) => b.eval.score - a.eval.score);

  if (scored.length === 0) return null;

  if (scored.length > 1) {
    const gap = scored[0].eval.score - scored[1].eval.score;
    const samePlace = scored[0].candidate.external_id === scored[1].candidate.external_id;
    if (!samePlace && gap < 0.12) {
      return {
        internal_id: internalId,
        external_id: null,
        provider: 'foursquare',
        status: 'ambiguous',
        photo_url: null,
        gallery: [],
        attributions: [],
        source_url: null,
        matched_name: null,
        matched_address: null,
        candidates_count: scored.length,
        reason: 'Múltiples sucursales posibles en Foursquare; vinculación pendiente.',
      };
    }
  }

  const best = scored[0].candidate;
  let photos = [];
  try {
    photos = await fsqClient.getPlacePhotos({ fsqId: best.external_id, limit: 3 });
  } catch {
    return null;
  }

  if (photos.length === 0) return null;

  const attrs = [{ displayName: 'Foursquare', uri: best.source_url, photoUri: null }];
  return {
    internal_id: internalId,
    external_id: best.external_id,
    provider: 'foursquare',
    status: 'resolved',
    photo_url: photos[0].url,
    gallery: photos.map((p) => ({ url: p.url, attributions: attrs })),
    attributions: attrs,
    source_url: best.source_url,
    matched_name: best.name,
    matched_address: best.address,
    reason: null,
  };
}

async function resolvePlacePhotos(placeInput, deps = {}) {
  const client = deps.googleClient || googlePlacesClient;
  const fsqClient = deps.foursquareClient || (deps.googleClient ? null : foursquarePlacesClient);
  const wikiClient = deps.wikimediaClient || (deps.googleClient ? null : wikimediaPlacesClient);
  const internalId = String(placeInput?.id || '').trim();
  const name = String(placeInput?.name || placeInput?.nombre || '').trim();
  const address = String(placeInput?.address || placeInput?.direccion || '').trim();
  const zone = String(placeInput?.zone || placeInput?.zona || '').trim();
  const lat = Number(placeInput?.lat);
  const lng = Number(placeInput?.lng);

  const baseResult = {
    internal_id: internalId || null,
    external_id: null,
    provider: 'google_places',
    status: 'no_match',
    photo_url: null,
    gallery: [],
    attributions: [],
    source_url: null,
    matched_name: null,
    matched_address: null,
    reason: null,
  };

  if (!name) {
    return { ...baseResult, status: 'invalid_input', reason: 'Falta el nombre del establecimiento.' };
  }

  // 0. Prioridad absoluta: Base de datos propia en Supabase (cero dependencia de APIs externas)
  if (!deps.googleClient && deps.skipInternalDb !== true) {
    const dbHit = await resolveFromInternalDatabase({ id: internalId, name, address, zone, lat, lng }, deps);
    if (dbHit) {
      return dbHit;
    }
  }

  // Si se solicitó modo solo base de datos (sin llamadas a APIs externas), retornar sin consultar terceros
  if (deps.dbOnly === true) {
    return {
      ...baseResult,
      provider: 'supabase_database',
      status: 'no_photos',
      reason: 'Sin fotografía registrada en la base de datos propia.',
    };
  }

  // 1. Intentar Foursquare Places API si está configurada (ideal para restaurantes/cafés sin billing de Google)
  if (fsqClient && fsqClient.isConfigured()) {
    const fsqResult = await resolveFromFoursquare({ id: internalId, name, address, zone, lat, lng }, fsqClient);
    if (fsqResult && (fsqResult.status === 'resolved' || fsqResult.status === 'ambiguous')) {
      return fsqResult;
    }
  }

  // 2. Intentar Wikimedia Commons / Wikipedia (100% gratuito sin API key; ideal para museos, parques y sitios públicos)
  if (wikiClient) {
    const wikiHit = await wikiClient.findPlacePhoto({ name, lat, lng });
    if (wikiHit && wikiHit.photo_url) {
      return {
        ...baseResult,
        external_id: wikiHit.external_id,
        provider: wikiHit.provider,
        status: 'resolved',
        photo_url: wikiHit.photo_url,
        gallery: wikiHit.gallery,
        attributions: wikiHit.attributions,
        source_url: wikiHit.source_url,
        matched_name: wikiHit.matched_name,
        matched_address: address || zone || null,
      };
    }
  }

  if (!client.isConfigured()) {
    return {
      ...baseResult,
      status: 'not_configured',
      reason: 'Sin fotografías disponibles en fuentes gratuitas y sin clave de proveedor configurada.',
    };
  }

  const textQuery = [name, address || zone, 'San José, Costa Rica'].filter(Boolean).join(', ');

  let candidates;
  try {
    candidates = await client.searchTextPlace({
      textQuery,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      radiusMeters: 600,
      maxResultCount: 5,
    });
  } catch (err) {
    return {
      ...baseResult,
      status: err.code === 'GOOGLE_PLACES_NOT_CONFIGURED' ? 'not_configured' : 'error',
      error_code: err.code || 'GOOGLE_PLACES_UNAVAILABLE',
      reason: err.message || 'No fue posible consultar Google Places.',
    };
  }

  const scored = candidates
    .map((c) => ({
      candidate: c,
      eval: scoreCandidate({ name, address, zone, lat, lng }, c),
    }))
    .filter((entry) => entry.eval.valid)
    .sort((a, b) => b.eval.score - a.eval.score);

  if (scored.length === 0) {
    return {
      ...baseResult,
      status: 'no_match',
      reason: 'No se encontró una sucursal verificable por nombre, dirección y ubicación.',
    };
  }

  // Detectar ambigüedad cuando dos sucursales tienen puntajes muy cercanos
  if (scored.length > 1) {
    const gap = scored[0].eval.score - scored[1].eval.score;
    const samePlace = scored[0].candidate.external_id === scored[1].candidate.external_id;
    if (!samePlace && gap < 0.12) {
      return {
        ...baseResult,
        status: 'ambiguous',
        candidates_count: scored.length,
        reason: 'Múltiples sucursales posibles; vinculación pendiente.',
      };
    }
  }

  const best = scored[0].candidate;
  const validPhotos = (best.photos || []).filter((p) => p?.name && PHOTO_NAME_REGEX.test(p.name)).slice(0, 3);

  if (validPhotos.length === 0) {
    return {
      ...baseResult,
      external_id: best.external_id,
      source_url: best.source_url,
      matched_name: best.name,
      matched_address: best.address,
      status: 'no_photos',
      reason: 'El establecimiento no tiene fotografías disponibles en Google Places.',
    };
  }

  const resolvedGallery = [];
  const attributions = [];

  for (const photoObj of validPhotos) {
    try {
      const media = await client.getPhotoMedia({ photoName: photoObj.name, maxWidthPx: 900 });
      if (media?.photo_uri) {
        const photoAttrs = formatAttributions(photoObj);
        resolvedGallery.push({
          url: media.photo_uri,
          attributions: photoAttrs,
        });
        attributions.push(...photoAttrs);
      }
    } catch (err) {
      if (resolvedGallery.length === 0) {
        return {
          ...baseResult,
          external_id: best.external_id,
          source_url: best.source_url,
          matched_name: best.name,
          matched_address: best.address,
          status: 'error',
          error_code: err.code || 'GOOGLE_PLACES_UNAVAILABLE',
          reason: err.message || 'No fue posible resolver la fotografía.',
        };
      }
    }
  }

  if (resolvedGallery.length === 0) {
    return {
      ...baseResult,
      external_id: best.external_id,
      source_url: best.source_url,
      matched_name: best.name,
      matched_address: best.address,
      status: 'no_photos',
      reason: 'No se obtuvieron URLs de fotografía válidas.',
    };
  }

  return {
    ...baseResult,
    external_id: best.external_id,
    source_url: best.source_url,
    matched_name: best.name,
    matched_address: best.address,
    status: 'resolved',
    photo_url: resolvedGallery[0].url,
    gallery: resolvedGallery,
    attributions,
  };
}

async function resolveBatchPlacePhotos(rawPlaces = [], deps = {}) {
  if (!Array.isArray(rawPlaces)) {
    const err = new Error('Se requiere un arreglo places.');
    err.status = 400;
    err.code = 'INVALID_PLACES_LIST';
    throw err;
  }

  const limited = rawPlaces.slice(0, 50);
  const items = await Promise.all(limited.map((p) => resolvePlacePhotos(p, deps)));

  return {
    items,
    provider: deps.dbOnly ? 'supabase_database' : 'supabase_database_first',
    configured: true,
  };
}

function clearInternalCatalogCache() {
  internalCatalogCache = { items: null, ts: 0 };
}

module.exports = {
  resolvePlacePhotos,
  resolveBatchPlacePhotos,
  scoreCandidate,
  clearInternalCatalogCache,
};
