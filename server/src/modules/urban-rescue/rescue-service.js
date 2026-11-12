class UrbanRescueService {
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

