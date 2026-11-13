const bioSafetyClient = require('../../shared/clients/bio-food-safety-api');
const placesRepository = require('../places/places-repository');

class VetHubService {
  async getEmergencyClinics24h() {
    // 1. Consultar la base de datos en tiempo real
    const places = await placesRepository.findAll({ category: 'veterinaria', limit: 20 });
    if (places && places.length > 0) {
      return places.map(p => ({
        id: p.id,
        name: p.name,
        address: p.address,
        phone: p.phone,
        is_24h_verified: Boolean(p.attributes_metadata?.is_24h || p.attributes_metadata?.emergency_24h),
        sinac_exotics_certified: Boolean(p.attributes_metadata?.sinac_exotics_certified),
        coords: { lat: p.lat, lng: p.lng },
        source: 'database_app_private'
      }));
    }

    // 2. Si aún no hay veterinarias en la base de datos, consultar el catálogo general de salud
    const generalPlaces = await placesRepository.findAll({ limit: 10 });
    const healthClinics = generalPlaces.filter(p => p.category === 'salud' || p.category === 'clinica');
    if (healthClinics.length > 0) {
      return healthClinics.map(p => ({
        id: p.id,
        name: p.name,
        address: p.address,
        phone: p.phone,
        is_24h_verified: true,
        coords: { lat: p.lat, lng: p.lng },
        source: 'database_app_private'
      }));
    }

    return [];
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
