const crypto = require('node:crypto');
const sseBroadcaster = require('../../shared/realtime/sse-broadcaster');

class UrbanRescueService {
  constructor() {
    this.inMemorySosReports = [
      {
        id: 'sos_demo_1',
        type: 'pet_rescue',
        title: 'Perro extraviado raza Schnauzer cerca de la plaza',
        description: 'Visto cruzando la calle principal, collar rojo con plaquita.',
        lat: 9.9145,
        lng: -84.2435,
        status: 'open',
        contact_phone: '+506 8800-1122',
        created_at: new Date().toISOString()
      }
    ];
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

  getRoadsideAssistance() {
    return [
      {
        name: 'Llantera y Auxilio Móvil 24h El Cruce',
        phone: '+506 8877-3322',
        service_types: ['cambio_llanta', 'paso_corriente', 'gasolina_emergencia'],
        coverage: 'Ruta 27 y cantones del oeste de San José'
      },
      {
        name: 'Grúas del Valle Central 24/7',
        phone: '+506 2222-9911',
        service_types: ['grua_plataforma', 'rescate_barranco'],
        coverage: 'Gran Área Metropolitana'
      }
    ];
  }

  getSurvivalStops() {
    return [
      {
        name: 'Baños Adaptados 7600 y Cajero Automático BN',
        address: 'Costado Sur del Parque Central',
        open_24h: true,
        has_wheelchair_ramp: true,
        atm_has_sinpe: true
      }
    ];
  }

  getEvChargers() {
    return [
      {
        operator: 'CNFL / ICE',
        name: 'Electrolinera Rápida CCS2 / ChaDeMo',
        address: 'Plaza Mayor Rohrmoser',
        power_kw: 50,
        status: 'available'
      }
    ];
  }
}

module.exports = new UrbanRescueService();
