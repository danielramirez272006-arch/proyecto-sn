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

  getCoffeePairings() {
    return [
      {
        method: 'V60 Pour Over',
        roast: 'Tueste Claro (Tarrazú / Geisha)',
        recommended_pairing: 'Queque de zanahoria con especias o galleta de avena',
        tasting_notes: 'Cítrico, jazmín, miel residual'
      },
      {
        method: 'Chemex',
        roast: 'Tueste Medio (Naranjo / Caturra)',
        recommended_pairing: 'Tarta de manzana o repostería hojaldrada',
        tasting_notes: 'Cuerpo balanceado, manzana roja, caramelo'
      },
      {
        method: 'Espresso Romano',
        roast: 'Tueste Oscuro (Tres Ríos)',
        recommended_pairing: 'Brownie de chocolate amargo 70%',
        tasting_notes: 'Intenso, cacao puro, final prolongado'
      }
    ];
  }

  calculateRealCostPlus23(menuItemPriceCrc = 0) {
    return haciendaClient.calculateTaxes(menuItemPriceCrc, true, true);
  }
}

module.exports = new FoodRadarService();

