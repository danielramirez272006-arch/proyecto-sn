const placesRepository = require('../places/places-repository');
const sseBroadcaster = require('../../shared/realtime/sse-broadcaster');

class LiveMapService {
  constructor() {
    this.communityReports = [];
    this.utilityOutages = [];
  }

  async getMapPins({ lat, lng, radiusKm = 10 } = {}) {
    const places = await placesRepository.findAll({ limit: 50 });
    return places.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      lat: p.lat,
      lng: p.lng,
      verified: p.verified_by_admin,
      attributes: p.attributes_metadata
    }));
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
