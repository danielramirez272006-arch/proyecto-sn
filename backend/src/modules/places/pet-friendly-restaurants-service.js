const { query } = require('../../shared/config/database');
const { haversineDistanceKm } = require('../../shared/utils/geo-math');
const placesRepository = require('./places-repository');
const overpassPlacesService = require('./overpass-places-service');
const googlePlacesClient = require('../../shared/clients/google-places-client');
const petCompatibilityService = require('./pet-compatibility-service');

function normalizeName(name = '') {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

class PetFriendlyRestaurantsService {
  async _loadEvidenceByPlaceIds(placeIds = []) {
    if (!placeIds || placeIds.length === 0) return new Map();
    const map = new Map();
    try {
      const placeholders = placeIds.map(() => '?').join(', ');
      const rows = await query(
        `SELECT * FROM place_pet_evidence WHERE place_id IN (${placeholders}) AND status != 'retracted' ORDER BY checked_at DESC`,
        placeIds
      );
      for (const row of rows || []) {
        let conditions = {};
        try {
          conditions = typeof row.conditions_json === 'string'
            ? JSON.parse(row.conditions_json)
            : (row.conditions_json || {});
        } catch {
          conditions = {};
        }
        const list = map.get(row.place_id) || [];
        list.push({
          id: row.id,
          source_type: row.source_type,
          provider_name: row.provider_name,
          external_place_id: row.external_place_id || null,
          access_status: row.access_status,
          conditions,
          evidence_ref: row.evidence_ref || null,
          verified_by: row.verified_by || null,
          checked_at: row.checked_at || null,
          expires_at: row.expires_at || null,
          status: row.status || 'active',
        });
        map.set(row.place_id, list);
      }
    } catch {
      // Tabla opcional antes de aplicar migración 008
    }
    return map;
  }

  _buildOsmEvidence(osmItem) {
    const seatingAccess = osmItem.outdoor_seating === true ? 'outdoor' : null;
    return {
      source_type: 'external_provider',
      provider_name: osmItem.source || 'openstreetmap',
      external_place_id: osmItem.external_id || osmItem.id,
      access_status: osmItem.pet_access_status || 'unknown',
      conditions: {
        // OSM tag dog=yes/no solo refiere a perros; nunca se atribuye a gatos u otras especies
        species_allowed: osmItem.pet_access_status === 'allowed' ? ['dog'] : null,
        size_or_weight_restriction: null,
        max_pets: null,
        seating_access: seatingAccess,
        leash_required: osmItem.leash_required ?? null,
        reservation_required: null,
        notes: null,
      },
      evidence_ref: osmItem.source_url || null,
      checked_at: new Date().toISOString(),
      expires_at: null,
      verified_by: null,
      status: 'active',
    };
  }

  _buildGoogleEvidence(gItem) {
    return {
      source_type: 'external_provider',
      provider_name: 'google_places',
      external_place_id: gItem.external_id,
      access_status: gItem.access_status || 'unknown',
      conditions: {
        // allowsDogs aplica únicamente a perros; desconocemos máximo, tamaño y terraza/interior
        species_allowed: gItem.access_status === 'allowed' ? ['dog'] : null,
        size_or_weight_restriction: null,
        max_pets: null,
        seating_access: null,
        leash_required: null,
        reservation_required: null,
        notes: null,
      },
      evidence_ref: gItem.source_url || null,
      checked_at: new Date().toISOString(),
      expires_at: null,
      verified_by: null,
      status: 'active',
    };
  }

  /**
   * Búsqueda estricta de restaurantes reales compatibles con mascotas.
   */
  async search(rawParams = {}, deps = {}) {
    const params = petCompatibilityService.validateSearchParams(rawParams);
    const osmService = deps.osmService || overpassPlacesService;
    const gClient = deps.googleClient || googlePlacesClient;
    const repo = deps.placesRepo || placesRepository;
    const now = deps.now || new Date();

    const providersStatus = {
      internal_db: { status: 'ok', count: 0 },
      openstreetmap: { status: 'pending', count: 0 },
      google_places: { status: gClient.isConfigured() ? 'pending' : 'not_configured', count: 0 },
    };

    // 1. Lugares internos dentro del radio
    let internalCandidates = [];
    try {
      const allInternal = await repo.findAll({ limit: 150 });
      const foodCategories = new Set(['restaurant', 'restaurante', 'cafe', 'bar', 'bakery', 'bistro']);
      internalCandidates = (allInternal || [])
        .filter((p) => {
          if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
          const distKm = haversineDistanceKm(params.lat, params.lng, p.lat, p.lng);
          if (distKm * 1000 > params.radius) return false;
          const cat = String(p.category || '').toLowerCase();
          return foodCategories.has(cat) || cat.includes('caf') || cat.includes('rest');
        })
        .map((p) => ({
          ...p,
          distance_km: haversineDistanceKm(params.lat, params.lng, p.lat, p.lng),
        }));
      providersStatus.internal_db = { status: internalCandidates.length > 0 ? 'ok' : 'empty', count: internalCandidates.length };
    } catch {
      providersStatus.internal_db = { status: 'error', count: 0 };
    }

    const evidenceMap = deps.loadEvidence
      ? await deps.loadEvidence(internalCandidates.map((p) => p.id))
      : await this._loadEvidenceByPlaceIds(internalCandidates.map((p) => p.id));

    // 2. Proveedores externos en paralelo (OSM + Google si está configurado)
    const externalPromises = [
      osmService.findNearbyRestaurants({
        lat: params.lat,
        lng: params.lng,
        radius: params.radius,
        limit: Math.min(params.limit + 10, 50),
        fetchImpl: deps.fetchImpl,
        bypassCache: Boolean(deps.fetchImpl),
      }),
    ];

    if (gClient.isConfigured()) {
      externalPromises.push(
        gClient.searchNearbyRestaurants({
          lat: params.lat,
          lng: params.lng,
          radius: params.radius,
          limit: Math.min(params.limit, 20),
          fetchImpl: deps.fetchImpl,
        })
      );
    }

    const [osmSettled, googleSettled] = await Promise.allSettled(externalPromises);

    let osmItems = [];
    if (osmSettled.status === 'fulfilled') {
      osmItems = osmSettled.value.restaurants || [];
      providersStatus.openstreetmap = {
        status: osmSettled.value.provider_status || (osmItems.length > 0 ? 'ok' : 'empty'),
        count: osmItems.length,
        degraded: Boolean(osmSettled.value.degraded),
      };
    } else {
      providersStatus.openstreetmap = { status: 'error', count: 0, degraded: true };
    }

    let googleItems = [];
    if (gClient.isConfigured()) {
      if (googleSettled?.status === 'fulfilled') {
        googleItems = googleSettled.value.places || [];
        providersStatus.google_places = {
          status: googleItems.length > 0 ? 'ok' : 'empty',
          count: googleItems.length,
          atmosphere_requested: googleSettled.value.atmosphere_requested,
        };
      } else if (googleSettled?.status === 'rejected') {
        const code = googleSettled.reason?.code || 'GOOGLE_PLACES_UNAVAILABLE';
        providersStatus.google_places = {
          status: code === 'GOOGLE_PLACES_QUOTA_EXCEEDED'
            ? 'quota_exceeded'
            : code === 'GOOGLE_PLACES_TIMEOUT'
            ? 'timeout'
            : 'unavailable',
          count: 0,
          error_code: code,
        };
      }
    }

    // 3. Unificar sin fusionar sucursales distintas (solo coincide si misma coordenada <= 40m y mismo nombre, o mismo external_id)
    const entries = [];

    const findMatchingEntry = (candidate) => {
      const candNorm = normalizeName(candidate.name);
      return entries.find((e) => {
        if (candidate.external_id && e.placeItem.external_id && candidate.external_id === e.placeItem.external_id) {
          return true;
        }
        const distBetween = haversineDistanceKm(e.placeItem.lat, e.placeItem.lng, candidate.lat, candidate.lng);
        return distBetween <= 0.04 && normalizeName(e.placeItem.name) === candNorm;
      });
    };

    for (const p of internalCandidates) {
      const dbEvidences = evidenceMap.get(p.id) || [];
      const fallbackPolicy = petCompatibilityService.extractInternalPolicy(p);
      const evidenceList = dbEvidences.length > 0 ? dbEvidences : [fallbackPolicy];

      entries.push({
        placeItem: {
          id: p.id,
          id_type: 'internal',
          internal_id: p.id,
          external_id: p.attributes_metadata?.google_place_id || null,
          provider: 'gotox_internal',
          name: p.name,
          category: p.category,
          address: p.address || null,
          lat: p.lat,
          lng: p.lng,
          distance_km: p.distance_km,
          photo: null,
          source_url: null,
        },
        evidenceList,
      });
    }

    for (const g of googleItems) {
      const distKm = haversineDistanceKm(params.lat, params.lng, g.lat, g.lng);
      if (distKm * 1000 > params.radius) continue;

      const ev = this._buildGoogleEvidence(g);
      const match = findMatchingEntry(g);
      if (match) {
        match.evidenceList.push(ev);
        if (!match.placeItem.external_id) match.placeItem.external_id = g.external_id;
        if (g.photo_ref && !match.placeItem.photo) {
          match.placeItem.photo = {
            resolve_endpoint: `/api/places/google-photo?name=${encodeURIComponent(g.photo_ref.name)}`,
            author_attributions: g.photo_ref.author_attributions,
          };
        }
      } else {
        entries.push({
          placeItem: {
            id: g.external_id,
            id_type: 'external',
            internal_id: null,
            external_id: g.external_id,
            provider: 'google_places',
            name: g.name,
            category: g.category,
            address: g.address,
            lat: g.lat,
            lng: g.lng,
            distance_km: distKm,
            photo: g.photo_ref
              ? {
                  resolve_endpoint: `/api/places/google-photo?name=${encodeURIComponent(g.photo_ref.name)}`,
                  author_attributions: g.photo_ref.author_attributions,
                }
              : null,
            source_url: g.source_url,
          },
          evidenceList: [ev],
        });
      }
    }

    for (const o of osmItems) {
      const distKm = haversineDistanceKm(params.lat, params.lng, o.lat, o.lng);
      if (distKm * 1000 > params.radius) continue;

      const ev = this._buildOsmEvidence(o);
      const match = findMatchingEntry(o);
      if (match) {
        match.evidenceList.push(ev);
      } else {
        entries.push({
          placeItem: {
            id: o.id,
            id_type: 'external',
            internal_id: null,
            external_id: o.external_id || o.id,
            provider: o.source || 'openstreetmap',
            name: o.name,
            category: o.category,
            address: o.address,
            lat: o.lat,
            lng: o.lng,
            distance_km: distKm,
            photo: null,
            source_url: o.source_url || null,
          },
          evidenceList: [ev],
        });
      }
    }

    // 4. Evaluar compatibilidad por reglas
    const evaluated = entries
      .map(({ placeItem, evidenceList }) =>
        petCompatibilityService.evaluateRestaurant(placeItem, evidenceList, params, now)
      )
      .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));

    const compatible = evaluated.filter((r) => r.compatibility === 'compatible').slice(0, params.limit);
    const needsConfirmation =
      params.verification === 'confirmed'
        ? []
        : evaluated.filter((r) => r.compatibility === 'needs_confirmation').slice(0, params.limit);
    const incompatible = evaluated.filter((r) => r.compatibility === 'incompatible').slice(0, params.limit);

    let message = null;
    if (params.verification === 'confirmed' && compatible.length === 0) {
      message =
        'No se encontraron restaurantes confirmados que cumplan todas las condiciones solicitadas dentro del radio.';
    } else if (compatible.length === 0 && needsConfirmation.length === 0 && incompatible.length === 0) {
      message = 'No se encontraron restaurantes en el área consultada.';
    }

    return {
      compatible,
      needs_confirmation: needsConfirmation,
      incompatible,
      summary: {
        compatible_count: compatible.length,
        needs_confirmation_count: needsConfirmation.length,
        incompatible_count: incompatible.length,
        verification_mode: params.verification,
        message,
      },
      search_params: params,
      providers_status: providersStatus,
    };
  }
}

module.exports = new PetFriendlyRestaurantsService();
module.exports.PetFriendlyRestaurantsService = PetFriendlyRestaurantsService;
