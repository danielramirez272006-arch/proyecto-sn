const weatherService = require('./weather-service');
const { success } = require('../../shared/utils/http-response');

class WeatherActivitiesController {
  async getForecast(req, res, next) {
    try {
      const { lat, lng } = req.query;
      const data = await weatherService.getFullForecast(lat, lng);
      return success(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getDoppler(req, res, next) {
    try {
      const data = await weatherService.getDopplerRadar();
      return success(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getIndices(req, res, next) {
    try {
      const { lat, lng } = req.query;
      const data = await weatherService.getEnvironmentalIndices(lat, lng);
      return success(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getMarineHazards(req, res, next) {
    try {
      const data = await weatherService.getMarineHazards();
      return success(res, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WeatherActivitiesController();

