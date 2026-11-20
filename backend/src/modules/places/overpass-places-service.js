const { haversineDistanceKm } = require('../../shared/utils/geo-math');

const CACHE_TTL_MS = 5 * 60 * 1000;
const NOMINATIM_URL = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';

function parseCoordinate(raw, min, max, label) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    const err = new Error(`${label} es requerido y no puede estar vacío`);
    err.code = 'INVALID_COORDINATES';
    throw err;
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || num < min || num > max) {
    const err = new Error(`${label} debe ser un número válido entre ${min} y ${max}`);
    err.code = 'INVALID_COORDINATES';
    throw err;
  }
  return num;
}

function parseRangeInt(raw, defaultVal, min, max, code, label) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return defaultVal;
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || num < min || num > max) {
    const err = new Error(`${label} debe estar entre ${min} y ${max}`);
    err.code = code;
    throw err;
  }
  return Math.round(num);
}

class OverpassPlacesService {
  constructor() {
    this.cache = new Map();
    this.inFlight = new Map();
  }

  _normalizeNominatimItem(item, fallbackCategory = 'restaurant') {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const name = String(item.name || item.display_name?.split(',')[0] || '').trim();
    if (!name) return null;

    const addr = item.address || {};
    const extra = item.extratags || {};
    const addressParts = [
      addr.road,
      addr.neighbourhood || addr.suburb,
      addr.city || addr.town || addr.county,
    ].filter(Boolean);

    const rawType = String(item.type || fallbackCategory).toLowerCase();
    const category = rawType.includes('cafe') || rawType.includes('coffee')
      ? 'cafe'
      : rawType.includes('bar') || rawType.includes('pub')
      ? 'bar'
      : 'restaurant';

    const dogTag = extra.dog ? String(extra.dog).toLowerCase() : null;
    const petsTag = extra.pets ? String(extra.pets).toLowerCase() : null;
    const effectiveDog = dogTag || petsTag;

    const petAccessStatus = effectiveDog === 'yes' || effectiveDog === 'leashed'
      ? 'allowed'
      : effectiveDog === 'no'
      ? 'not_allowed'
      : 'unknown';

    return {
      id: `osm_${item.osm_type || 'n'}_${item.osm_id || `${lat}_${lng}`}`,
      external_id: String(item.osm_id || `${item.osm_type || 'n'}_${lat}_${lng}`),
      name,
      category,
      cuisine: extra.cuisine ? String(extra.cuisine).replace(/;/g, ', ') : null,
      lat,
      lng,
      address: addressParts.length > 0 ? addressParts.join(', ') : (item.display_name || 'Costa Rica'),
      phone: extra.phone || extra['contact:phone'] || null,
      opening_hours: extra.opening_hours || null,
      outdoor_seating: extra.outdoor_seating === 'yes' ? true : extra.outdoor_seating === 'no' ? false : null,
      pet_friendly: petAccessStatus === 'allowed' ? 'si' : petAccessStatus === 'not_allowed' ? 'no' : 'consultar',
      pet_access_status: petAccessStatus,
      leash_required: effectiveDog === 'leashed' ? true : null,
      wheelchair: extra.wheelchair === 'yes' ? true : extra.wheelchair === 'no' ? false : null,
      website: extra.website || extra['contact:website'] || null,
      source_url: item.osm_type && item.osm_id ? `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}` : null,
      source: 'nominatim_osm',
    };
  }

  async _queryNominatim(term, viewbox, limit = 25, fetchImpl = fetch) {
    const url = `${NOMINATIM_URL}/search?format=jsonv2&addressdetails=1&extratags=1&bounded=1&viewbox=${encodeURIComponent(viewbox)}&limit=${limit}&q=${encodeURIComponent(term)}`;
    const res = await fetchImpl(url, {
      headers: {
        'User-Agent': 'SinergiaUrbanaGoToX/1.0',
        'Accept-Language': 'es,en;q=0.8',
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) {
      const err = new Error(`NOMINATIM_HTTP_${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async _queryPhoton(term, lat, lng, radiusMeters, limit = 25, fetchImpl = fetch) {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(term)}&lat=${lat}&lon=${lng}&limit=${limit}`;
    const res = await fetchImpl(url, {
      headers: { 'User-Agent': 'SinergiaUrbanaGoToX/1.0' },
      signal: AbortSignal.timeout(6500),
    });
    if (!res.ok) {
      const err = new Error(`PHOTON_HTTP_${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    const features = Array.isArray(data?.features) ? data.features : [];
    return features
      .map((f) => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates || [];
        const fLng = Number(coords[0]);
        const fLat = Number(coords[1]);
        if (!p.name || !Number.isFinite(fLat) || !Number.isFinite(fLng)) return null;

        const distKm = haversineDistanceKm(lat, lng, fLat, fLng);
        if (distKm * 1000 > radiusMeters) return null;

        const val = String(p.osm_value || '').toLowerCase();
        const category = val.includes('cafe') ? 'cafe' : val.includes('bar') || val.includes('pub') ? 'bar' : 'restaurant';
        return {
          id: `photon_${p.osm_type || 'n'}_${p.osm_id || `${fLat}_${fLng}`}`,
          external_id: String(p.osm_id || `${fLat}_${fLng}`),
          name: p.name,
          category,
          cuisine: null,
          lat: fLat,
          lng: fLng,
          address: [p.street, p.district, p.city || p.state].filter(Boolean).join(', ') || 'Costa Rica',
          phone: null,
          opening_hours: null,
          outdoor_seating: null,
          pet_friendly: 'consultar',
          pet_access_status: 'unknown',
          leash_required: null,
          wheelchair: null,
          website: null,
          source_url: p.osm_type && p.osm_id ? `https://www.openstreetmap.org/${p.osm_type === 'W' ? 'way' : 'node'}/${p.osm_id}` : null,
          source: 'photon_osm',
        };
      })
      .filter(Boolean);
  }

  async _fetchAndMerge(numLat, numLng, safeRadius, cacheKey, fetchImpl) {
    const dLat = safeRadius / 111320;
    const dLng = safeRadius / (111320 * Math.max(0.2, Math.cos((numLat * Math.PI) / 180)));
    const viewbox = `${(numLng - dLng).toFixed(5)},${(numLat + dLat).toFixed(5)},${(numLng + dLng).toFixed(5)},${(numLat - dLat).toFixed(5)}`;

    const [nomRest, photonRest, photonCafe] = await Promise.allSettled([
      this._queryNominatim('restaurante', viewbox, 25, fetchImpl),
      this._queryPhoton('restaurante', numLat, numLng, safeRadius, 25, fetchImpl),
      this._queryPhoton('cafe', numLat, numLng, safeRadius, 15, fetchImpl),
    ]);

    let anySuccess = false;
    let anyTimeout = false;
    const providerStatuses = {};

    const classifyResult = (key, settled) => {
      if (settled.status === 'fulfilled') {
        anySuccess = true;
        providerStatuses[key] = settled.value.length > 0 ? 'ok' : 'empty';
      } else {
        const msg = String(settled.reason?.name || settled.reason?.message || '');
        const isTimeout = msg.includes('Timeout') || msg.includes('Abort');
        if (isTimeout) anyTimeout = true;
        providerStatuses[key] = isTimeout ? 'timeout' : 'error';
      }
    };

    classifyResult('nominatim_restaurant', nomRest);
    classifyResult('photon_restaurant', photonRest);
    classifyResult('photon_cafe', photonCafe);

    const combined = [];
    if (nomRest.status === 'fulfilled') {
      for (const item of nomRest.value) {
        const norm = this._normalizeNominatimItem(item, 'restaurant');
        if (norm) combined.push(norm);
      }
    }
    if (photonRest.status === 'fulfilled') combined.push(...photonRest.value);
    if (photonCafe.status === 'fulfilled') combined.push(...photonCafe.value);

    // Aplicar el radio exacto al resultado final de todos los proveedores y conservar sucursales distintas
    const seen = new Set();
    const restaurants = [];
    for (const r of combined) {
      const distKm = haversineDistanceKm(numLat, numLng, r.lat, r.lng);
      if (distKm * 1000 > safeRadius) continue;

      const dedupKey = `${r.name.toLowerCase()}@${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      restaurants.push({
        ...r,
        distance_km: distKm,
      });
    }

    restaurants.sort((a, b) => a.distance_km - b.distance_km);

    const degraded = !anySuccess;
    if (!degraded && restaurants.length >= 3) {
      this.cache.set(cacheKey, { timestamp: Date.now(), restaurants, providerStatuses });
    }

    return {
      restaurants,
      degraded,
      provider_status: degraded ? (anyTimeout ? 'timeout' : 'error') : restaurants.length === 0 ? 'empty' : 'ok',
      providers: providerStatuses,
    };
  }

  /**
   * Consulta restaurantes y cafeterías reales cercanos usando OpenStreetMap (Nominatim + Photon).
   */
  async findNearbyRestaurants({ lat, lng, radius = 2200, limit = 35, fetchImpl = fetch, bypassCache = false } = {}) {
    const numLat = parseCoordinate(lat, -90, 90, 'lat');
    const numLng = parseCoordinate(lng, -180, 180, 'lng');
    const safeRadius = parseRangeInt(radius, 2200, 300, 10000, 'INVALID_RADIUS', 'radius');
    const safeLimit = parseRangeInt(limit, 35, 1, 60, 'INVALID_LIMIT', 'limit');
    const cacheKey = `${numLat.toFixed(3)}:${numLng.toFixed(3)}:${safeRadius}`;

    if (!bypassCache && fetchImpl === fetch) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return {
          restaurants: cached.restaurants.slice(0, safeLimit),
          total: cached.restaurants.length,
          center: { lat: numLat, lng: numLng },
          radius_m: safeRadius,
          source: 'openstreetmap',
          provider_status: cached.restaurants.length === 0 ? 'empty' : 'ok',
          providers: cached.providerStatuses || {},
          cached: true,
          degraded: false,
        };
      }
    }

    let promise = !bypassCache && fetchImpl === fetch ? this.inFlight.get(cacheKey) : null;
    if (!promise) {
      promise = this._fetchAndMerge(numLat, numLng, safeRadius, cacheKey, fetchImpl).finally(() => {
        if (fetchImpl === fetch) this.inFlight.delete(cacheKey);
      });
      if (!bypassCache && fetchImpl === fetch) {
        this.inFlight.set(cacheKey, promise);
      }
    }

    const result = await promise;
    return {
      restaurants: result.restaurants.slice(0, safeLimit),
      total: result.restaurants.length,
      center: { lat: numLat, lng: numLng },
      radius_m: safeRadius,
      source: 'openstreetmap',
      provider_status: result.provider_status,
      providers: result.providers,
      cached: false,
      degraded: result.degraded,
    };
  }
}

module.exports = new OverpassPlacesService();
module.exports.OverpassPlacesService = OverpassPlacesService;
