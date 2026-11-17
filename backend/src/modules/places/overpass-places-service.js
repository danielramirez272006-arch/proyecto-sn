const CACHE_TTL_MS = 5 * 60 * 1000;
const NOMINATIM_URL = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';

function distanceMeters(lat1, lng1, lat2, lng2) {
  const rad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

    return {
      id: `osm_${item.osm_type || 'n'}_${item.osm_id || `${lat}_${lng}`}`,
      name,
      category,
      cuisine: extra.cuisine ? String(extra.cuisine).replace(/;/g, ', ') : null,
      lat,
      lng,
      address: addressParts.length > 0 ? addressParts.join(', ') : (item.display_name || 'Costa Rica'),
      phone: extra.phone || extra['contact:phone'] || null,
      opening_hours: extra.opening_hours || null,
      outdoor_seating: extra.outdoor_seating === 'yes',
      pet_friendly: extra.dog === 'yes' ? 'si' : extra.dog === 'no' ? 'no' : 'consultar',
      wheelchair: extra.wheelchair === 'yes',
      website: extra.website || extra['contact:website'] || null,
      source: 'nominatim_osm',
    };
  }

  async _queryNominatim(term, viewbox, limit = 25) {
    const url = `${NOMINATIM_URL}/search?format=jsonv2&addressdetails=1&extratags=1&bounded=1&viewbox=${encodeURIComponent(viewbox)}&limit=${limit}&q=${encodeURIComponent(term)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SinergiaUrbanaGoToX/1.0',
        'Accept-Language': 'es,en;q=0.8',
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async _queryPhoton(term, lat, lng, maxMeters = 4500, limit = 25) {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(term)}&lat=${lat}&lon=${lng}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SinergiaUrbanaGoToX/1.0' },
      signal: AbortSignal.timeout(6500),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const features = Array.isArray(data?.features) ? data.features : [];
    return features
      .map((f) => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates || [];
        const fLng = Number(coords[0]);
        const fLat = Number(coords[1]);
        if (!p.name || !Number.isFinite(fLat) || !Number.isFinite(fLng)) return null;
        if (distanceMeters(lat, lng, fLat, fLng) > maxMeters) return null;

        const val = String(p.osm_value || '').toLowerCase();
        const category = val.includes('cafe') ? 'cafe' : val.includes('bar') || val.includes('pub') ? 'bar' : 'restaurant';
        return {
          id: `photon_${p.osm_type || 'n'}_${p.osm_id || `${fLat}_${fLng}`}`,
          name: p.name,
          category,
          cuisine: null,
          lat: fLat,
          lng: fLng,
          address: [p.street, p.district, p.city || p.state].filter(Boolean).join(', ') || 'Costa Rica',
          phone: null,
          opening_hours: null,
          outdoor_seating: false,
          pet_friendly: 'consultar',
          wheelchair: false,
          website: null,
          source: 'photon_osm',
        };
      })
      .filter(Boolean);
  }

  async _fetchAndMerge(numLat, numLng, safeRadius, cacheKey) {
    const dLat = safeRadius / 111320;
    const dLng = safeRadius / (111320 * Math.max(0.2, Math.cos((numLat * Math.PI) / 180)));
    const viewbox = `${(numLng - dLng).toFixed(5)},${(numLat + dLat).toFixed(5)},${(numLng + dLng).toFixed(5)},${(numLat - dLat).toFixed(5)}`;
    const maxPhotonMeters = Math.max(safeRadius * 2, 4500);

    const [nomRest, photonRest, photonCafe] = await Promise.allSettled([
      this._queryNominatim('restaurante', viewbox, 25),
      this._queryPhoton('restaurante', numLat, numLng, maxPhotonMeters, 25),
      this._queryPhoton('cafe', numLat, numLng, maxPhotonMeters, 15),
    ]);

    const combined = [];
    if (nomRest.status === 'fulfilled') {
      for (const item of nomRest.value) {
        const norm = this._normalizeNominatimItem(item, 'restaurant');
        if (norm) combined.push(norm);
      }
    }
    if (photonRest.status === 'fulfilled') {
      combined.push(...photonRest.value);
    }
    if (photonCafe.status === 'fulfilled') {
      combined.push(...photonCafe.value);
    }

    const seen = new Set();
    const restaurants = [];
    for (const r of combined) {
      const key = `${r.name.toLowerCase()}@${r.lat.toFixed(3)},${r.lng.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      restaurants.push(r);
    }

    // Ordenar por cercanía al punto consultado
    restaurants.sort(
      (a, b) => distanceMeters(numLat, numLng, a.lat, a.lng) - distanceMeters(numLat, numLng, b.lat, b.lng)
    );

    if (restaurants.length >= 3) {
      this.cache.set(cacheKey, { timestamp: Date.now(), restaurants });
    }

    return restaurants;
  }

  /**
   * Consulta restaurantes y cafeterías reales cercanos usando OpenStreetMap (Nominatim + Photon).
   */
  async findNearbyRestaurants({ lat, lng, radius = 2200, limit = 35 } = {}) {
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
      throw new Error('INVALID_COORDINATES');
    }

    const safeRadius = Math.max(500, Math.min(5000, Math.round(Number(radius) || 2200)));
    const safeLimit = Math.max(5, Math.min(60, Math.round(Number(limit) || 35)));
    const cacheKey = `${numLat.toFixed(3)}:${numLng.toFixed(3)}:${safeRadius}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        restaurants: cached.restaurants.slice(0, safeLimit),
        total: cached.restaurants.length,
        center: { lat: numLat, lng: numLng },
        radius_m: safeRadius,
        source: 'openstreetmap',
        cached: true,
        degraded: false,
      };
    }

    try {
      let promise = this.inFlight.get(cacheKey);
      if (!promise) {
        promise = this._fetchAndMerge(numLat, numLng, safeRadius, cacheKey).finally(() => {
          this.inFlight.delete(cacheKey);
        });
        this.inFlight.set(cacheKey, promise);
      }

      const restaurants = await promise;
      return {
        restaurants: restaurants.slice(0, safeLimit),
        total: restaurants.length,
        center: { lat: numLat, lng: numLng },
        radius_m: safeRadius,
        source: 'openstreetmap',
        cached: false,
        degraded: restaurants.length === 0,
      };
    } catch (err) {
      return {
        restaurants: [],
        total: 0,
        center: { lat: numLat, lng: numLng },
        radius_m: safeRadius,
        source: 'openstreetmap',
        cached: false,
        degraded: true,
      };
    }
  }
}

module.exports = new OverpassPlacesService();
