const crypto = require('node:crypto');
const sseBroadcaster = require('../../shared/realtime/sse-broadcaster');
const placesRepository = require('../places/places-repository');

class UrbanRescueService {
  constructor() {
    this.inMemorySosReports = [];
  }

  createSosReport(reportData = {}) {
    const newReport = {
      id: `sos_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      type: reportData.type || 'roadside_hazard',
      title: reportData.title || 'Alerta de auxilio ciudadano',
      description: reportData.description || '',
      lat: Number(reportData.lat) || 9.9150,
      lng: Number(reportData.lng) || -84.2430,
      status: 'open',
      contact_phone: reportData.contact_phone || '',
      created_at: new Date().toISOString()
    };

    this.inMemorySosReports.unshift(newReport);

    // Difundir en tiempo real vía Server-Sent Events (SSE)
    sseBroadcaster.broadcast('SOS_ALERT', {
      report: newReport,
      message: `Nueva alerta ciudadana S.O.S.: ${newReport.title}`
    });

    return newReport;
  }

  listSosReports({ limit = 20 } = {}) {
    return this.inMemorySosReports.slice(0, limit);
  }

  async getRoadsideAssistance() {
    // 1. Consultar talleres y servicios viales en la base de datos real
    try {
      const places = await placesRepository.findAll({ limit: 30 });
      const workshops = places.filter(p => p.category === 'taller' || p.category === 'servicios');
      if (workshops.length > 0) {
        return workshops.map(w => ({
          name: w.name,
          phone: w.phone || '+506 2200-0000',
          service_types: ['auxilio_vial', 'mecanica_rapida'],
          coverage: w.canton ? `${w.canton}, Costa Rica` : 'Valle Central',
          source: 'database_app_private'
        }));
      }
    } catch (_) {}

    // 2. Líneas de emergencia públicas oficiales de Costa Rica (911 / Bomberos / Cruz Roja)
    return [
      {
        name: 'Sistema de Emergencias 9-1-1 Costa Rica',
        phone: '911',
        service_types: ['policia', 'bomberos', 'cruz_roja', 'transito'],
        coverage: 'Nacional 100% Costa Rica',
        source: 'gobierno_cr'
      },
      {
        name: 'Cruz Roja Costarricense',
        phone: '1027',
        service_types: ['ambulancia', 'paramedicos', 'rescate_urbano'],
        coverage: 'Nacional 100% Costa Rica',
        source: 'cruz_roja_cr'
      }
    ];
  }
}

module.exports = new UrbanRescueService();
