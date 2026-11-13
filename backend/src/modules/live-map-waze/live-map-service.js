const placesRepository = require('../places/places-repository');
const sseBroadcaster = require('../../shared/realtime/sse-broadcaster');
const { generateNavigationLinks } = require('../../shared/utils/navigation-links');

const CATEGORY_STYLE = {
  restaurant: { color: '#501228', icon: 'utensils', height_m: 18, label: 'Restaurante' },
  cafe: { color: '#8B3A52', icon: 'coffee', height_m: 14, label: 'Café Pet-Friendly' },
  park: { color: '#10B981', icon: 'trees', height_m: 6, label: 'Parque Urbano' },
  vet: { color: '#2563EB', icon: 'heart-pulse', height_m: 20, label: 'Veterinaria' },
  bar: { color: '#7C3AED', icon: 'wine', height_m: 16, label: 'Gastrobar' },
  default: { color: '#501228', icon: 'map-pin', height_m: 12, label: 'Lugar' }
};

function parseMetadata(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function buildFootprintPolygon(lat, lng, delta = 0.00018) {
  return [[
    [lng - delta, lat - delta],
    [lng + delta, lat - delta],
    [lng + delta, lat + delta],
    [lng - delta, lat + delta],
    [lng - delta, lat - delta]
  ]];
}

class LiveMapService {
  constructor() {
    this.communityReports = [];
    this.utilityOutages = [];
  }

  _enrichPlaceForMap(place) {
    const meta = parseMetadata(place.attributes_metadata);
    const catKey = String(place.category || 'default').toLowerCase();
    const style = CATEGORY_STYLE[catKey] || CATEGORY_STYLE.default;
    const lat = Number(place.lat) || 9.9333;
    const lng = Number(place.lng) || -84.0833;
    const heightM = Number(meta.building_height_m) || style.height_m;

    return {
      id: place.id,
      name: place.name,
      category: place.category || 'restaurant',
      category_label: style.label,
      lat,
      lng,
      address: place.address || meta.address || 'San José, GAM, Costa Rica',
      verified: Boolean(place.verified_by_admin),
      rating: Number(meta.rating) || 4.7,
      price_range: meta.price_range || '₡₡',
      open_now: meta.open_now !== undefined ? Boolean(meta.open_now) : true,
      pet_friendly: meta.pet_friendly !== undefined ? Boolean(meta.pet_friendly) : true,
      terrace_noise_db: Number(meta.terrace_noise_db || meta.noise_db) || 46,
      water_bowl: meta.water_bowl !== undefined ? Boolean(meta.water_bowl) : true,
      cuisine: meta.cuisine || meta.specialty || 'Gastronomía Urbana',
      image_url: meta.image_url || null,
      navigation_links: generateNavigationLinks(lat, lng, place.name),
      style_3d: {
        color: style.color,
        icon: style.icon,
        height_m: heightM,
        base_height_m: 0,
        footprint_polygon: buildFootprintPolygon(lat, lng)
      },
      attributes: meta
    };
  }

  async getMapPins({ lat, lng, radiusKm = 10 } = {}) {
    const places = await placesRepository.findAll({ limit: 50 });
    return places.map(p => this._enrichPlaceForMap(p));
  }

  async getMapScene({ mode = '3d', category, lat, lng, radiusKm } = {}) {
    const is3d = String(mode).toLowerCase() !== '2d';
    const centerLat = lat ? Number(lat) : 9.9333;
    const centerLng = lng ? Number(lng) : -84.0833;

    const places = await placesRepository.findAll({
      category: category && category !== 'all' ? category : undefined,
      limit: 100
    });
    const enriched = places.map(p => this._enrichPlaceForMap(p));

    const features = enriched.map(item => ({
      type: 'Feature',
      id: item.id,
      geometry: {
        type: 'Point',
        coordinates: [item.lng, item.lat]
      },
      properties: item
    }));

    const extrusions = enriched.map(item => ({
      type: 'Feature',
      id: `${item.id}_extrusion`,
      geometry: {
        type: 'Polygon',
        coordinates: item.style_3d.footprint_polygon
      },
      properties: {
        id: item.id,
        name: item.name,
        category: item.category,
        color: item.style_3d.color,
        height_m: item.style_3d.height_m,
        base_height_m: item.style_3d.base_height_m
      }
    }));

    return {
      mode: is3d ? '3d' : '2d',
      camera: {
        center: [centerLng, centerLat],
        zoom: is3d ? 15.2 : 13.8,
        pitch: is3d ? 55 : 0,
        bearing: is3d ? -18 : 0
      },
      layers: {
        markers_2d: { type: 'FeatureCollection', features },
        buildings_3d: { type: 'FeatureCollection', features: extrusions }
      },
      places: enriched,
      community_reports: this.getRecentReports(),
      outages: this.getOutages(),
      total_places: enriched.length
    };
  }

  async getPlaceDetail(id) {
    const places = await placesRepository.findAll({ limit: 200 });
    const found = places.find(p => String(p.id) === String(id));
    if (!found) return null;
    return this._enrichPlaceForMap(found);
  }

  getOutages() {
    // Retornar solo reportes activos no vencidos
    const now = Date.now();
    return this.utilityOutages.filter(o => !o.expires_at || o.expires_at > now);
  }

  reportOutage({ utility = 'AyA Acueductos', service_type = 'corte_de_agua', location, coords, note }) {
    const outage = {
      id: `outage_${Date.now()}`,
      utility,
      service_type,
      location: location || 'Área Metropolitana',
      status: 'reportado',
      coords: coords || { lat: 9.9320, lng: -84.1820 },
      note: note || '',
      reported_at: new Date().toISOString(),
      expires_at: Date.now() + (6 * 60 * 60 * 1000) // Válido por 6 horas
    };

    this.utilityOutages.unshift(outage);
    if (this.utilityOutages.length > 50) this.utilityOutages.pop();

    sseBroadcaster.broadcast('live-map', 'UTILITY_OUTAGE', outage);
    return outage;
  }

  addReport({ type, lat, lng, note, reportedBy = 'anonymous' }) {
    const report = {
      id: `rep_${Date.now()}`,
      type: type || 'trafico_presa',
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      note: note || '',
      reported_by: reportedBy,
      reported_at: new Date().toISOString(),
      confidence_votes: 1
    };
    this.communityReports.unshift(report);
    if (this.communityReports.length > 100) this.communityReports.pop();

    sseBroadcaster.broadcast('live-map', 'NEW_REPORT', report);
    return report;
  }

  getRecentReports() {
    return this.communityReports;
  }
}

module.exports = new LiveMapService();
