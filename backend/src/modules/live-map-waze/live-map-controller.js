const liveMapService = require('./live-map-service');
const { success, created, badRequest, notFound } = require('../../shared/utils/http-response');
const sseBroadcaster = require('../../shared/realtime/sse-broadcaster');

class LiveMapController {
  async getPins(req, res, next) {
    try {
      const { lat, lng } = req.query;
      const pins = await liveMapService.getMapPins({ lat, lng });
      return success(res, pins);
    } catch (err) {
      next(err);
    }
  }

  async getMapScene(req, res, next) {
    try {
      const { mode, category, lat, lng, radius_km } = req.query;
      const scene = await liveMapService.getMapScene({
        mode: mode || '3d',
        category,
        lat,
        lng,
        radiusKm: radius_km ? Number(radius_km) : undefined
      });
      return success(res, scene);
    } catch (err) {
      next(err);
    }
  }

  async getPlaceDetail(req, res, next) {
    try {
      const detail = await liveMapService.getPlaceDetail(req.params.id);
      if (!detail) return notFound(res, 'Lugar o restaurante no encontrado');
      return success(res, detail);
    } catch (err) {
      next(err);
    }
  }

  getOutages(req, res) {
    return success(res, liveMapService.getOutages());
  }

  postReport(req, res) {
    const { type, lat, lng, note } = req.body;
    if (!lat || !lng) return badRequest(res, 'lat y lng requeridos');

    const rep = liveMapService.addReport({
      type,
      lat,
      lng,
      note,
      reportedBy: req.user?.id || 'anonymous_user'
    });
    return created(res, rep);
  }

  subscribeStream(req, res) {
    sseBroadcaster.subscribe('live-map', res);
  }
}

module.exports = new LiveMapController();

