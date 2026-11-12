const rescueService = require('./rescue-service');
const { success } = require('../../shared/utils/http-response');

class UrbanRescueController {
  getRoadside(req, res) {
    return success(res, rescueService.getRoadsideAssistance());
  }

  getSurvivalStops(req, res) {
    return success(res, rescueService.getSurvivalStops());
  }

  getEvChargers(req, res) {
    return success(res, rescueService.getEvChargers());
  }
}

module.exports = new UrbanRescueController();

