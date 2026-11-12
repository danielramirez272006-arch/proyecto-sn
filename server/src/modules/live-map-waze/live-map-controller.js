const liveMapService = require('./live-map-service');
const { success, created, badRequest } = require('../../shared/utils/http-response');
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

