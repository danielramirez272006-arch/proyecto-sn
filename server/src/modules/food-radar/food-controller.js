const foodService = require('./food-service');
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

  getCoffeePairing(req, res) {
    const pairings = foodService.getCoffeePairings();
    return success(res, pairings);
  }

  getZeroWasteDiscounts(req, res) {
    return success(res, [
      {
        place_name: 'Café Aromas del Valle',
        discount: '30% en repostería del día después de las 5:00 PM',
        zero_waste_badge: true,
      }
    ]);
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

