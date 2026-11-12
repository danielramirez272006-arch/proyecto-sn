const bioSafetyClient = require('../../shared/clients/bio-food-safety-api');
const placesRepository = require('../places/places-repository');

class VetHubService {
  async getEmergencyClinics24h() {
    return [
      {
        id: 'vet_emergencia_1',
        name: 'Hospital Veterinario 24/7 San Antonio',
        address: 'Escazú Centro, 200m Sur de la Iglesia',
        phone: '+506 2289-5566',
        is_24h_verified: true,
        sinac_exotics_certified: true,
        coords: { lat: 9.9180, lng: -84.1410 }
      },
      {
        id: 'vet_emergencia_2',
        name: 'Clínica Veterinaria Santa Ana Nocturna',
        address: 'Santa Ana, frente a la Cruz Roja',
        phone: '+506 2282-4411',
        is_24h_verified: true,
        sinac_exotics_certified: false,
        coords: { lat: 9.9320, lng: -84.1820 }
      }
    ];
  }

  triageIngestion(substance) {
    return bioSafetyClient.triageSubstance(substance);
  }

  async scanPetFoodBarcode(barcode) {
    return await bioSafetyClient.checkPetFoodBarcode(barcode);
  }

  getSenasaRequirements(destination = 'ferry') {
    return {
      destination,
      vaccines_required: ['Rabia al día (mínimo 30 días antes)', 'Múltiple Canina / Felina', 'Desparasitación interna y externa'],
      health_certificate: 'Emitido por médico veterinario colegiado (máximo 15 días antes del viaje)',
      ferry_rules: 'Mascota debe viajar en canil o con correa y bozal en áreas señaladas.',
      source: 'SENASA Costa Rica'
    };
  }
}

module.exports = new VetHubService();

