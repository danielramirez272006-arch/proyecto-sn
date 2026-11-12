const synergyService = require('./synergy-service');
const { success } = require('../../shared/utils/http-response');

class SynergyController {
  async getComboRoute(req, res, next) {
    try {
      const { lat, lng } = req.query;
      const data = await synergyService.calculateComboRoute(lat, lng);
      return success(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getTripCost(req, res, next) {
    try {
      const { distance_km, meal_cost_crc, parking_hours, fuel_type } = req.query;
      const data = await synergyService.estimateTotalTripCost({
        distanceKm: distance_km ? parseFloat(distance_km) : 25,
        mealCostCrc: meal_cost_crc ? parseInt(meal_cost_crc, 10) : 12000,
        parkingHours: parking_hours ? parseInt(parking_hours, 10) : 2,
        fuelType: fuel_type || 'super',
      });
      return success(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getShelter(req, res, next) {
    try {
      const { lat, lng } = req.query;
      const data = await synergyService.findClimateShelter(lat, lng);
      return success(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getHolidayEscape(req, res, next) {
    try {
      const data = await synergyService.getHolidayEscape();
      return success(res, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SynergyController();

