const a11yService = require('./a11y-service');
const { success, created, badRequest } = require('../../shared/utils/http-response');

class AccessibilityController {
  async getFlatRoute(req, res, next) {
    try {
      const { lat, lng } = req.query;
      const data = await a11yService.getFlatRoutes(lat, lng);
      return success(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getSensoryPlaces(req, res, next) {
    try {
      const places = await a11yService.getSensoryPlaces();
      return success(res, places);
    } catch (err) {
      next(err);
    }
  }

  async reportBarrier(req, res, next) {
    try {
      const { lat, lng, barrier_type, description, photo_url } = req.body;
      if (!lat || !lng) return badRequest(res, 'lat y lng son requeridos');

      const result = await a11yService.reportBarrier({ lat, lng, barrier_type, description, photo_url });
      return created(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AccessibilityController();

