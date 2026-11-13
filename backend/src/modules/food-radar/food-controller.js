const foodService = require('./food-service');
const placesRepository = require('../places/places-repository');
const { success } = require('../../shared/utils/http-response');

class FoodRadarController {
  async getPlaces(req, res, next) {
    try {
      const { craving, pet_friendly, specialty_coffee } = req.query;
      const places = await foodService.getFoodPlaces({
        craving,
        petFriendly: pet_friendly === 'true',
        specialtyCoffee: specialty_coffee === 'true',
      });
      return success(res, places);
    } catch (err) {
      next(err);
    }
  }

  async getCoffeePairing(req, res, next) {
    try {
      const pairings = await foodService.getCoffeePairings();
      return success(res, pairings);
    } catch (err) {
      next(err);
    }
  }

  async getZeroWasteDiscounts(req, res, next) {
    try {
      const places = await placesRepository.findAll({ limit: 20 });
      const discounts = places
        .filter(p => p.attributes_metadata?.zero_waste || p.category === 'cafe' || p.category === 'feria')
        .map(p => ({
          place_id: p.id,
          place_name: p.name,
          discount: 'Descuento solidario de fin de tarde / productos locales frescos',
          zero_waste_badge: Boolean(p.attributes_metadata?.zero_waste),
          verified: p.verified_by_admin
        }));
      return success(res, discounts);
    } catch (err) {
      next(err);
    }
  }

  async checkMenuRealPrice(req, res, next) {
    try {
      const { price_crc } = req.body;
      const data = foodService.calculateRealCostPlus23(Number(price_crc) || 0);
      return success(res, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FoodRadarController();
