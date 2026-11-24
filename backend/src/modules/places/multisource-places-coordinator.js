const crypto = require('crypto');
const env = require('../../shared/config/env-config');
const { query, execute } = require('../../shared/config/database');
const { haversineDistanceKm } = require('../../shared/utils/geo-math');
const { ProviderRateGuard } = require('../../shared/utils/provider-rate-guard');
const placesRepository = require('./places-repository');
const overpassPlacesService = require('./overpass-places-service');
const petCompatibilityService = require('./pet-compatibility-service');
const geoapifyPlacesClient = require('../../shared/clients/geoapify-places-client');
const foursquarePlacesClient = require('../../shared/clients/foursquare-places-client');
const wikimediaPlacesClient = require('../../shared/clients/wikimedia-places-client');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-8) : '';
}

function namesSimilar(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = new Set(na.split(' ').filter((w) => w.length >= 3));
  const tb = new Set(nb.split(' ').filter((w) => w.length >= 3));
  if (ta.size === 0 || tb.size === 0) return false;
  let hits = 0;
  for (const w of ta) {
    if (tb.has(w)) hits += 1;
  }
  return hits / Math.min(ta.size, tb.size) >= 0.6;
}

class MultisourcePlacesCoordinator {
  constructor() {
    this.guards = {
      osm: new ProviderRateGuard({ name: 'openstreetmap', ...(env.osmPlaces || {}) }),
      geoapify: new ProviderRateGuard({ name: 'geoapify', ...(env.geoapify || {}) }),
      foursquare: new ProviderRateGuard({ name: 'foursquare', ...(env.foursquare || {}) }),
      wikimedia: new ProviderRateGuard({ name: 'wikimedia_commons', ...(env.wikimedia || {}) }),
    };
  }

  async _emitAutomationEvent(eventType, placeId, payload, idempotencyKey) {
    try {
      const existing = await query('SELECT id FROM automation_events WHERE idempotency_key = ?', [idempotencyKey]);
      if (existing && existing.length > 0) {
        return { created: false, id: existing[0].id };
      }
      const id = `evt_${crypto.randomBytes(8).toString('hex')}`;
      await execute(
        `INSERT INTO automation_events (id, event_type, place_id, payload_json, idempotency_key, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [id, eventType, placeId || null, JSON.stringify(payload || {}), idempotencyKey]
      );
      return { created: true, id };
    } catch {
      return { created: false, id: null };
    }
  }

  async _loadApprovedPhotosMap(placeIds = []) {
    const map = new Map();
    if (!placeIds || placeIds.length === 0) return map;
    try {
      const placeholders = placeIds.map(() => '?').join(',');
      const rows = await query(
        `SELECT * FROM place_photos WHERE place_id IN (${placeholders}) AND approval_status = 'approved' ORDER BY is_cover DESC, created_at DESC`,
        placeIds
      );
      for (const row of rows || []) {
        if (!map.has(row.place_id)) map.set(row.place_id, []);
        map.get(row.place_id).push(row);
      }
    } catch {
      // Tabla puede no existir aún en entornos sin migrar
    }
    return map;
  }

  async _loadEvidenceMap(placeIds = []) {
    const map = new Map();
    if (!placeIds || placeIds.length === 0) return map;
    try {
      const placeholders = placeIds.map(() => '?').join(',');
      const rows = await query(
        `SELECT * FROM place_pet_evidence WHERE place_id IN (${placeholders}) AND status = 'active' ORDER BY checked_at DESC`,
        placeIds
      );
      for (const row of rows || []) {
        let conditions = {};
        try {
          conditions = typeof row.conditions_json === 'string' ? JSON.parse(row.conditions_json) : row.conditions_json || {};
        } catch {
          conditions = {};
        }
        if (!map.has(row.place_id)) map.set(row.place_id, []);
        map.get(row.place_id).push({ ...row, conditions });
      }
    } catch {
      // Ignorar si no existe la tabla
    }
    return map;
  }

  async _loadExternalLinksMap(placeIds = []) {
    const map = new Map();
    if (!placeIds || placeIds.length === 0) return map;
    try {
      const placeholders = placeIds.map(() => '?').join(',');
      const rows = await query(
        `SELECT * FROM place_external_links WHERE place_id IN (${placeholders}) AND match_status != 'rejected'`,
        placeIds
      );
      for (const row of rows || []) {
        if (!map.has(row.place_id)) map.set(row.place_id, []);
        map.get(row.place_id).push(row);
      }
    } catch {
      // Ignorar si no existe la tabla
    }
    return map;
  }

  _matchCandidateToGroup(candidate, group) {
    const distKm = haversineDistanceKm(candidate.lat, candidate.lng, group.lat, group.lng);
    const sameName = namesSimilar(candidate.name, group.name);
    if (!sameName) return 'no_match';

    // Coincidencia explícita por OSM ID compartido (ej. OSM + Geoapify)
    if (candidate.osm_id && group.osm_ids.has(String(candidate.osm_id))) {
      return 'same_branch';
    }

    // Teléfono igual dentro de 350m
    const candPhone = normalizePhone(candidate.phone);
    if (candPhone && group.phones.has(candPhone) && distKm <= 0.35) {
      return 'same_branch';
    }

    // Misma sucursal si está a <= 180m
    if (distKm <= 0.18) {
      return 'same_branch';
    }

    // Zona dudosa (180m - 600m) con mismo nombre: marcar ambiguo para revisión admin
    if (distKm <= 0.6) {
      return 'ambiguous';
    }

    // > 600m con mismo nombre = otra sucursal de la cadena
    return 'separate_branch';
  }

  _buildProvenance(entry) {
    const prov = {};
    if (entry.name) prov.name = { value: entry.name, source: entry.primary_source, checked_at: entry.queried_at };
    if (entry.address) prov.address = { value: entry.address, source: entry.primary_source, checked_at: entry.queried_at };
    if (entry.phone) prov.phone = { value: entry.phone, source: entry.phone_source || entry.primary_source, checked_at: entry.queried_at };
    if (entry.outdoor_seating !== null && entry.outdoor_seating !== undefined) {
      prov.outdoor_seating = { value: entry.outdoor_seating, source: entry.seating_source || entry.primary_source, checked_at: entry.queried_at };
    }
    prov.pet_access_status = {
      value: entry.compatibility.access_status,
      source: entry.evidence.map((e) => e.provider_name).join(', ') || entry.primary_source,
      checked_at: entry.queried_at,
    };
    return prov;
  }

  async search(rawParams = {}, deps = {}) {
    // 1. Validación estricta reutilizando PetCompatibilityService
    const params = petCompatibilityService.validateSearchParams(rawParams);
    const categoryFilter = rawParams.category ? String(rawParams.category).trim().toLowerCase() : null;
    const textQuery = rawParams.q ? String(rawParams.q).trim().toLowerCase() : '';
    const dbOnlyMode =
      rawParams.source === 'db' ||
      rawParams.source === 'database' ||
      rawParams.db_only === 'true' ||
      rawParams.db_only === true;
    const now = deps.now || new Date();
    const queriedAt = now.toISOString();

    const repo = deps.placesRepo || placesRepository;
    const osmSvc = deps.osmService || overpassPlacesService;
    const geoClient = deps.geoapifyClient || geoapifyPlacesClient;
    const fsqClient = deps.foursquareClient || foursquarePlacesClient;
    const wikiClient = deps.wikimediaClient || wikimediaPlacesClient;

    const providersStatus = {
      internal_catalog: { status: 'ok', count: 0, queried_at: queriedAt },
      openstreetmap: { status: !dbOnlyMode && env.osmPlaces?.enabled !== false ? 'pending' : 'disabled', count: 0 },
      geoapify: { status: !dbOnlyMode && geoClient.isEnabledAndConfigured() ? 'pending' : 'not_configured', count: 0 },
      foursquare: { status: !dbOnlyMode && fsqClient.isEnabledAndConfigured() ? 'pending' : 'not_configured', count: 0, paid_operations: 'disabled' },
      wikimedia_commons: { status: !dbOnlyMode && env.wikimedia?.enabled !== false ? 'on_demand' : 'disabled', count: 0 },
    };

    // 2. Consultar catálogo propio primero
    let internalPlaces = [];
    try {
      const allInternal = await repo.findAll({ limit: 150 });
      const foodCategories = new Set(['restaurant', 'restaurante', 'cafe', 'bar', 'bakery', 'bistro', 'gastronomia']);
      internalPlaces = (allInternal || [])
        .filter((p) => {
          if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
          const distKm = haversineDistanceKm(params.lat, params.lng, p.lat, p.lng);
          if (distKm * 1000 > params.radius) return false;
          const cat = String(p.category || '').toLowerCase();
          if (categoryFilter && !cat.includes(categoryFilter)) return false;
          if (textQuery && !String(p.name || '').toLowerCase().includes(textQuery)) return false;
          return foodCategories.has(cat) || cat.includes('caf') || cat.includes('rest');
        })
        .map((p) => ({
          ...p,
          distance_km: haversineDistanceKm(params.lat, params.lng, p.lat, p.lng),
        }));
      providersStatus.internal_catalog = {
        status: internalPlaces.length > 0 ? 'ok' : 'empty',
        count: internalPlaces.length,
        queried_at: queriedAt,
      };
    } catch {
      providersStatus.internal_catalog = { status: 'error', count: 0 };
    }

    const internalIds = internalPlaces.map((p) => p.id);
    const [evidenceMap, approvedPhotosMap, externalLinksMap] = await Promise.all([
      deps.loadEvidence ? deps.loadEvidence(internalIds) : this._loadEvidenceMap(internalIds),
      deps.loadPhotos ? deps.loadPhotos(internalIds) : this._loadApprovedPhotosMap(internalIds),
      deps.loadExternalLinks ? deps.loadExternalLinks(internalIds) : this._loadExternalLinksMap(internalIds),
    ]);

    // 3. Consultar fuentes externas habilitadas (omitido si source=db para 0 dependencia de APIs externas)
    const externalRaw = [];
    const tasks = [];

    if (!dbOnlyMode && env.osmPlaces?.enabled !== false) {
      tasks.push(
        this.guards.osm
          .run(() => osmSvc.searchNearbyRestaurants({ lat: params.lat, lng: params.lng, radius: params.radius, limit: params.limit }))
          .then((res) => {
            const list = Array.isArray(res?.restaurants) ? res.restaurants : [];
            providersStatus.openstreetmap = { status: list.length > 0 ? 'ok' : 'empty', count: list.length };
            for (const r of list) {
              externalRaw.push({
                provider: 'openstreetmap',
                external_id: String(r.external_id || r.id),
                osm_id: r.external_id ? String(r.external_id) : null,
                shared_origin: null,
                name: r.name,
                address: r.address || null,
                category: r.category || 'restaurant',
                lat: r.lat,
                lng: r.lng,
                phone: r.phone || null,
                website: r.website || null,
                outdoor_seating: r.outdoor_seating ?? null,
                pet_access_status: r.pet_access_status || 'unknown',
                leash_required: r.leash_required ?? null,
                source_url: r.source_url || null,
                queried_at: queriedAt,
              });
            }
          })
          .catch((err) => {
            providersStatus.openstreetmap = { status: err?.status === 429 ? 'quota_exceeded' : 'error', code: err?.code || 'OSM_ERROR', count: 0 };
          })
      );
    }

    if (!dbOnlyMode && geoClient.isEnabledAndConfigured()) {
      tasks.push(
        this.guards.geoapify
          .run(() =>
            geoClient.searchRestaurants({
              lat: params.lat,
              lng: params.lng,
              radius: params.radius,
              limit: params.limit,
              name: textQuery,
              category: categoryFilter || '',
            })
          )
          .then((res) => {
            const list = Array.isArray(res?.places) ? res.places : [];
            providersStatus.geoapify = { status: list.length > 0 ? 'ok' : 'empty', count: list.length };
            for (const r of list) externalRaw.push(r);
          })
          .catch((err) => {
            providersStatus.geoapify = { status: err?.status === 429 ? 'quota_exceeded' : 'error', code: err?.code || 'GEOAPIFY_ERROR', count: 0 };
          })
      );
    }

    if (!dbOnlyMode && fsqClient.isEnabledAndConfigured()) {
      tasks.push(
        this.guards.foursquare
          .run(() =>
            fsqClient.searchPlaces({
              query: textQuery || categoryFilter || 'restaurant',
              lat: params.lat,
              lng: params.lng,
              radiusMeters: params.radius,
              limit: Math.min(params.limit, 10),
            })
          )
          .then((list) => {
            const arr = Array.isArray(list) ? list : [];
            providersStatus.foursquare = { status: arr.length > 0 ? 'ok' : 'empty', count: arr.length, paid_operations: 'disabled' };
            for (const r of arr) {
              const dKm = haversineDistanceKm(params.lat, params.lng, r.lat, r.lng);
              if (dKm * 1000 > params.radius) continue;
              externalRaw.push({
                provider: 'foursquare',
                external_id: String(r.external_id),
                osm_id: null,
                shared_origin: null,
                name: r.name,
                address: r.address || null,
                category: categoryFilter || 'restaurant',
                lat: r.lat,
                lng: r.lng,
                phone: null,
                website: null,
                outdoor_seating: null,
                pet_access_status: 'unknown',
                leash_required: null,
                source_url: r.source_url || null,
                queried_at: queriedAt,
              });
            }
          })
          .catch((err) => {
            providersStatus.foursquare = { status: err?.status === 429 ? 'quota_exceeded' : 'error', code: err?.code || 'FOURSQUARE_ERROR', count: 0, paid_operations: 'disabled' };
          })
      );
    }

    await Promise.allSettled(tasks);

    // 4. Unificar por sucursal (evitar duplicados sin mezclar sucursales ni contar OSM+Geoapify como doble confirmación)
    const groups = [];

    for (const p of internalPlaces) {
      const links = externalLinksMap.get(p.id) || [];
      const osmIds = new Set(links.filter((l) => l.provider === 'openstreetmap' || l.shared_origin === 'openstreetmap').map((l) => String(l.external_id)));
      const phones = new Set();
      const normPhone = normalizePhone(p.attributes_metadata?.phone);
      if (normPhone) phones.add(normPhone);

      const internalEv = petCompatibilityService.extractInternalPolicy(p);
      const dbEv = evidenceMap.get(p.id) || [];

      groups.push({
        id: p.id,
        id_type: 'internal',
        primary_source: 'internal_catalog',
        name: p.name,
        address: p.address || null,
        category: p.category || 'restaurant',
        lat: p.lat,
        lng: p.lng,
        distance_km: p.distance_km,
        phone: p.attributes_metadata?.phone || null,
        phone_source: p.attributes_metadata?.phone ? 'internal_catalog' : null,
        outdoor_seating: p.attributes_metadata?.pet_policy?.outdoor_seating ?? null,
        seating_source: 'internal_catalog',
        external_references: links.map((l) => ({ provider: l.provider, external_id: l.external_id, shared_origin: l.shared_origin || null })),
        osm_ids: osmIds,
        phones,
        evidence: [...(internalEv ? [internalEv] : []), ...dbEv],
        identity_status: 'verified_internal',
        shared_origin_detected: false,
        queried_at: queriedAt,
      });
    }

    for (const ext of externalRaw) {
      if (categoryFilter && ext.category && !String(ext.category).toLowerCase().includes(categoryFilter)) continue;
      if (textQuery && !String(ext.name || '').toLowerCase().includes(textQuery)) continue;
      const distKm = haversineDistanceKm(params.lat, params.lng, ext.lat, ext.lng);
      if (distKm * 1000 > params.radius) continue;

      let matchedGroup = null;
      let ambiguousMatch = false;

      for (const g of groups) {
        const rel = this._matchCandidateToGroup(ext, g);
        if (rel === 'same_branch') {
          matchedGroup = g;
          break;
        }
        if (rel === 'ambiguous') {
          ambiguousMatch = true;
          matchedGroup = g;
        }
      }

      const extEvidence = {
        source_type: 'external_provider',
        provider_name: ext.shared_origin === 'openstreetmap' ? 'openstreetmap' : ext.provider,
        external_place_id: ext.external_id,
        access_status: ext.pet_access_status || 'unknown',
        conditions: {
          species: ext.pet_access_status === 'allowed' ? ['dog'] : null,
          outdoor_seating: ext.outdoor_seating,
          indoor_seating: null,
          leash_required: ext.leash_required,
          reservation_required: null,
          max_pets: null,
          size_limit: null,
        },
        evidence_ref: ext.source_url,
        checked_at: ext.queried_at,
        expires_at: null,
        status: 'active',
      };

      if (matchedGroup && !ambiguousMatch) {
        matchedGroup.external_references.push({
          provider: ext.provider,
          external_id: ext.external_id,
          shared_origin: ext.shared_origin || null,
          source_url: ext.source_url || null,
        });
        if (ext.osm_id) matchedGroup.osm_ids.add(String(ext.osm_id));
        const extPhone = normalizePhone(ext.phone);
        if (extPhone) matchedGroup.phones.add(extPhone);
        if (!matchedGroup.address && ext.address) matchedGroup.address = ext.address;
        if (!matchedGroup.phone && ext.phone) {
          matchedGroup.phone = ext.phone;
          matchedGroup.phone_source = ext.provider;
        }
        if (matchedGroup.outdoor_seating === null && ext.outdoor_seating !== null) {
          matchedGroup.outdoor_seating = ext.outdoor_seating;
          matchedGroup.seating_source = ext.provider;
        }

        // Evitar contar OSM y Geoapify (mismo origen OSM) como dos confirmaciones independientes
        const alreadyHasOsmOrigin =
          ext.shared_origin === 'openstreetmap' &&
          matchedGroup.evidence.some((e) => e.provider_name === 'openstreetmap');
        if (alreadyHasOsmOrigin) {
          matchedGroup.shared_origin_detected = true;
        } else {
          matchedGroup.evidence.push(extEvidence);
        }
      } else {
        const newGroup = {
          id: `${ext.provider}:${ext.external_id}`,
          id_type: 'external',
          primary_source: ext.provider,
          name: ext.name,
          address: ext.address,
          category: ext.category || 'restaurant',
          lat: ext.lat,
          lng: ext.lng,
          distance_km: distKm,
          phone: ext.phone,
          phone_source: ext.phone ? ext.provider : null,
          outdoor_seating: ext.outdoor_seating,
          seating_source: ext.outdoor_seating !== null ? ext.provider : null,
          external_references: [
            {
              provider: ext.provider,
              external_id: ext.external_id,
              shared_origin: ext.shared_origin || null,
              source_url: ext.source_url || null,
            },
          ],
          osm_ids: new Set(ext.osm_id ? [String(ext.osm_id)] : []),
          phones: new Set(normalizePhone(ext.phone) ? [normalizePhone(ext.phone)] : []),
          evidence: [extEvidence],
          identity_status: ambiguousMatch ? 'ambiguous_review_required' : 'external_only',
          shared_origin_detected: false,
          queried_at: ext.queried_at,
        };
        groups.push(newGroup);

        if (ambiguousMatch) {
          await this._emitAutomationEvent(
            'ambiguous_match_pending',
            matchedGroup.id_type === 'internal' ? matchedGroup.id : null,
            { candidate: { provider: ext.provider, external_id: ext.external_id, name: ext.name, lat: ext.lat, lng: ext.lng } },
            `ambiguous:${ext.provider}:${ext.external_id}`
          );
        }
      }
    }

    // 5. Evaluar compatibilidad y resolver fotografías auténticas
    const results = [];
    for (const g of groups.slice(0, params.limit)) {
      const compatibility = petCompatibilityService.evaluateRestaurant(g, g.evidence, params, now);

      if (params.verification === 'confirmed' && compatibility.compatibility !== 'compatible') {
        continue;
      }

      // Prioridad 1: Fotos aprobadas del catálogo propio
      let photo = null;
      let photoReason = 'Sin fotografía disponible.';
      const approved = g.id_type === 'internal' ? approvedPhotosMap.get(g.id) || [] : [];

      if (approved.length > 0) {
        const cover = approved[0];
        photo = {
          provider: cover.provider,
          url: cover.photo_url,
          alt_text: cover.alt_text || `${g.name} - ${cover.photo_type || 'fotografía'}`,
          restaurant_name: g.name,
          author: cover.author || null,
          credit: cover.attribution_text || cover.author || null,
          source_page_url: cover.source_page_url || null,
          license: cover.license || 'Autorización del establecimiento',
          license_url: cover.license_url || null,
          width: cover.width || null,
          height: cover.height || null,
          photo_type: cover.photo_type || 'otro',
          captured_at: cover.captured_at || null,
          approval_status: cover.approval_status,
          is_cover: Boolean(cover.is_cover),
          reviewed_at: cover.reviewed_at || null,
          gallery: approved.map((p) => ({
            url: p.photo_url,
            alt_text: p.alt_text || `${g.name} - ${p.photo_type || 'fotografía'}`,
            author: p.author || null,
            credit: p.attribution_text || p.author || null,
            license: p.license || null,
            source_page_url: p.source_page_url || null,
            width: p.width || null,
            height: p.height || null,
            photo_type: p.photo_type || 'otro',
          })),
        };
        photoReason = null;
      } else if (!dbOnlyMode && env.wikimedia?.enabled !== false && wikiClient) {
        // Prioridad 2: Wikimedia Commons con licencia obligatoria
        try {
          const wikiHit = await this.guards.wikimedia.run(() =>
            wikiClient.findPlacePhoto({ name: g.name, lat: g.lat, lng: g.lng })
          );
          if (wikiHit && wikiHit.photo_url) {
            if (wikiHit.license) {
              photo = {
                provider: 'wikimedia_commons',
                url: wikiHit.photo_url,
                author: wikiHit.author || null,
                source_page_url: wikiHit.source_url || null,
                license: wikiHit.license,
                approval_status: 'verified_license',
                is_cover: true,
                reviewed_at: queriedAt,
              };
              photoReason = null;
              providersStatus.wikimedia_commons.count += 1;
            } else {
              photoReason = 'Imagen en Wikimedia Commons sin licencia verificable; requiere revisión.';
              await this._emitAutomationEvent(
                'photo_review_pending',
                g.id_type === 'internal' ? g.id : null,
                { place_name: g.name, photo_url: wikiHit.photo_url, source_url: wikiHit.source_url },
                `photo_pending:${g.id}`
              );
            }
          }
        } catch {
          // Mantener photo: null si falla Wikimedia
        }
      }

      if (compatibility.access_status === 'conflicting') {
        await this._emitAutomationEvent(
          'conditions_review_required',
          g.id_type === 'internal' ? g.id : null,
          { place_name: g.name, missing_conditions: compatibility.unknown_fields },
          `conflict:${g.id}`
        );
      }

      const item = {
        id: g.id,
        id_type: g.id_type,
        external_references: g.external_references,
        identity_status: g.identity_status,
        shared_origin_detected: g.shared_origin_detected,
        name: g.name,
        address: g.address,
        category: g.category,
        lat: g.lat,
        lng: g.lng,
        distance_km: Number(g.distance_km.toFixed(3)),
        compatibility: compatibility.compatibility,
        access_status: compatibility.access_status,
        verification_level: compatibility.verification_level,
        known_conditions: compatibility.conditions,
        missing_conditions: compatibility.unknown_fields,
        conflicts: compatibility.conflicts,
        explanation: compatibility.explanation,
        evidence: g.evidence,
        photo,
        photo_reason: photoReason,
        queried_at: g.queried_at,
      };
      item.provenance = {
        ...this._buildProvenance({ ...g, compatibility }),
        ...(compatibility.provenance || {}),
      };
      results.push(item);
    }

    const partialResult = Object.values(providersStatus).some(
      (s) => s.status === 'error' || s.status === 'quota_exceeded'
    );

    return {
      places: results,
      summary: {
        total: results.length,
        compatible: results.filter((r) => r.compatibility === 'compatible').length,
        needs_confirmation: results.filter((r) => r.compatibility === 'needs_confirmation').length,
        incompatible: results.filter((r) => r.compatibility === 'incompatible').length,
        ambiguous_identities: results.filter((r) => r.identity_status === 'ambiguous_review_required').length,
      },
      partial_result: partialResult,
      providers_status: providersStatus,
      rate_limit_scope: {
        osm: this.guards.osm.getLimitsInfo(),
        geoapify: this.guards.geoapify.getLimitsInfo(),
        foursquare: this.guards.foursquare.getLimitsInfo(),
        wikimedia: this.guards.wikimedia.getLimitsInfo(),
      },
      queried_at: queriedAt,
    };
  }
}

module.exports = new MultisourcePlacesCoordinator();
module.exports.MultisourcePlacesCoordinator = MultisourcePlacesCoordinator;
