const env = require('../config/env-config');
const { haversineDistanceKm } = require('../utils/geo-math');

const GEOAPIFY_BASE_URL = 'https://api.geoapify.com/v2/places';

class GeoapifyPlacesClient {
  constructor(config = env.geoapify || {}) {
    this.enabled = Boolean(config.enabled);
    this.apiKey = config.apiKey || '';
    this.timeoutMs = Number(config.timeoutMs) || 7000;
  }

  isEnabledAndConfigured() {
    return Boolean(this.enabled && this.apiKey && String(this.apiKey).trim().length > 0);
  }

  _sanitizeError(code, message, status = 502) {
    const err = new Error(message);
    err.code = code;
    err.status = status;
    return err;
  }

  async searchRestaurants({
    lat,
    lng,
    radius = 2200,
    limit = 20,
    name = '',
    category = '',
    fetchImpl = fetch,
  } = {}) {
    if (!this.enabled) {
      throw this._sanitizeError('GEOAPIFY_DISABLED', 'Geoapify está deshabilitado por configuración.', 503);
    }
    if (!this.apiKey || String(this.apiKey).trim().length === 0) {
      throw this._sanitizeError('GEOAPIFY_NOT_CONFIGURED', 'GEOAPIFY_API_KEY no está configurada.', 503);
    }

    const safeRadius = Math.max(300, Math.min(10000, Math.round(Number(radius) || 2200)));
    const safeLimit = Math.max(1, Math.min(50, Math.round(Number(limit) || 20)));

    const catMap = {
      cafe: 'catering.cafe',
      bar: 'catering.bar,catering.pub',
      restaurant: 'catering.restaurant',
    };
    const categories = catMap[String(category || '').toLowerCase()] || 'catering.restaurant,catering.cafe,catering.bar';

    const params = new URLSearchParams({
      categories,
      filter: `circle:${Number(lng)},${Number(lat)},${safeRadius}`,
      bias: `proximity:${Number(lng)},${Number(lat)}`,
      limit: String(safeLimit),
      apiKey: this.apiKey,
    });

    if (name && String(name).trim()) {
      params.set('name', String(name).trim());
    }

    let resp;
    try {
      resp = await fetchImpl(`${GEOAPIFY_BASE_URL}?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      throw this._sanitizeError(
        isTimeout ? 'GEOAPIFY_TIMEOUT' : 'GEOAPIFY_UNAVAILABLE',
        isTimeout ? 'Tiempo de espera agotado consultando Geoapify.' : 'No fue posible conectar con Geoapify.',
        isTimeout ? 504 : 502
      );
    }

    if (resp.status === 429) {
      throw this._sanitizeError('GEOAPIFY_QUOTA_EXCEEDED', 'Cuota de Geoapify agotada.', 429);
    }
    if (resp.status === 401 || resp.status === 403) {
      throw this._sanitizeError('GEOAPIFY_AUTH_ERROR', 'Credenciales de Geoapify rechazadas.', 403);
    }
    if (!resp.ok) {
      throw this._sanitizeError('GEOAPIFY_UNAVAILABLE', `Geoapify respondió con estado ${resp.status}.`, 502);
    }

    const json = await resp.json().catch(() => null);
    const features = Array.isArray(json?.features) ? json.features : [];
    const queriedAt = new Date().toISOString();

    const places = [];
    for (const f of features) {
      const props = f?.properties || {};
      const coords = Array.isArray(f?.geometry?.coordinates) ? f.geometry.coordinates : [];
      const pLng = Number(props.lon ?? coords[0]);
      const pLat = Number(props.lat ?? coords[1]);
      if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) continue;

      const distKm = haversineDistanceKm(Number(lat), Number(lng), pLat, pLng);
      if (distKm * 1000 > safeRadius) continue;

      const placeName = String(props.name || props.address_line1 || '').trim();
      if (!placeName) continue;

      const rawOsm = props.datasource?.raw || {};
      const sourceName = String(props.datasource?.sourcename || '').toLowerCase();
      const osmId = rawOsm.osm_id ? String(rawOsm.osm_id) : null;
      const dogRaw = rawOsm.dog ? String(rawOsm.dog).toLowerCase() : null;
      const petsRaw = rawOsm.pets ? String(rawOsm.pets).toLowerCase() : null;
      const effectivePet = dogRaw || petsRaw;

      const petAccessStatus =
        effectivePet === 'yes' || effectivePet === 'leashed'
          ? 'allowed'
          : effectivePet === 'no'
          ? 'not_allowed'
          : 'unknown';

      places.push({
        external_id: String(props.place_id || osmId || `${pLat}_${pLng}`),
        provider: 'geoapify',
        shared_origin: sourceName.includes('openstreetmap') || osmId ? 'openstreetmap' : null,
        osm_id: osmId,
        name: placeName,
        address: props.formatted || props.address_line2 || null,
        category: Array.isArray(props.categories) && props.categories.some((c) => c.includes('cafe'))
          ? 'cafe'
          : 'restaurant',
        lat: pLat,
        lng: pLng,
        distance_km: distKm,
        phone: props.contact?.phone || rawOsm.phone || null,
        website: props.website || rawOsm.website || null,
        outdoor_seating: rawOsm.outdoor_seating === 'yes' ? true : rawOsm.outdoor_seating === 'no' ? false : null,
        pet_access_status: petAccessStatus,
        leash_required: effectivePet === 'leashed' ? true : null,
        source_url: osmId ? `https://www.openstreetmap.org/node/${osmId}` : null,
        queried_at: queriedAt,
      });
    }

    return {
      places,
      provider: 'geoapify',
      queried_at: queriedAt,
    };
  }
}

module.exports = new GeoapifyPlacesClient();
module.exports.GeoapifyPlacesClient = GeoapifyPlacesClient;
