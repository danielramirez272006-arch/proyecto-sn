const placesRepository = require('../places/places-repository');
const sseBroadcaster = require('../../shared/realtime/sse-broadcaster');

class LiveMapService {
  constructor() {
    this.communityReports = [];
    this.utilityOutages = [
      {
        id: 'outage_aya_1',
        utility: 'AyA Acueductos',
        service_type: 'corte_de_agua',
        location: 'Santa Ana y Pozos',
        status: 'en_reparacion',
        estimated_restoration: '16:00',
        coords: { lat: 9.9320, lng: -84.1820 }
      }
    ];
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
    return this.utilityOutages;
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

