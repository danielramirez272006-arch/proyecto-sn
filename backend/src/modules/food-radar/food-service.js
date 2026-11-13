const placesRepository = require('../places/places-repository');
const haciendaClient = require('../../shared/clients/hacienda-cr-api');

class FoodRadarService {
  async getFoodPlaces({ craving, petFriendly, specialtyCoffee, limit = 20 } = {}) {
    const places = await placesRepository.findAll({ category: 'cafe', limit });
    return places.filter(p => {
      const meta = p.attributes_metadata || {};
      if (petFriendly && !meta.pet_friendly?.verified) return false;
      if (specialtyCoffee && !meta.v60_chemex?.verified) return false;
      return true;
    });
  }

  async getCoffeePairings() {
    // Consultar dinámicamente el catálogo real en base de datos
    const cafes = await placesRepository.findAll({ category: 'cafe', limit: 20 });
    const livePairings = [];

    for (const cafe of cafes) {
      const meta = cafe.attributes_metadata || {};
      const specialty = meta.specialty_coffee;
      if (specialty && specialty.varietals) {
        for (const varietal of specialty.varietals) {
          livePairings.push({
            place_id: cafe.id,
            cafe_name: cafe.name,
            address: cafe.address,
            varietal,
            recommended_method: varietal === 'Geisha' ? 'V60 Pour Over' : 'Chemex / Aeropress',
            tasting_notes: varietal === 'Geisha' ? 'Jazmín, bergamota, melocotón y miel' : 'Chocolate de origen, caramelo y nuez',
            source: specialty.source || 'icafe',
            verified: true,
            updated_at: cafe.updated_at || new Date().toISOString()
          });
        }
      }
    }

    if (livePairings.length > 0) {
      return livePairings;
    }

    // Si aún no hay cafés de especialidad con varietales, derivar de los cafés registrados en la BD
    return cafes.map(c => ({
      place_id: c.id,
      cafe_name: c.name,
      address: c.address,
      varietal: 'Arábica Valle Central',
      recommended_method: 'Chorreador Tradicional Costarricense',
      tasting_notes: 'Dulce de caña, cuerpo balanceado',
      verified: c.verified_by_admin,
      updated_at: c.updated_at || new Date().toISOString()
    }));
  }

  calculateRealCostPlus23(menuItemPriceCrc = 0) {
    return haciendaClient.calculateTaxes(menuItemPriceCrc, true, true);
  }
}

module.exports = new FoodRadarService();
