const rescueService = require('./rescue-service');
const { success, created, badRequest } = require('../../shared/utils/http-response');

class UrbanRescueController {
  async getRoadside(req, res) {
    const data = await rescueService.getRoadsideAssistance();
    return success(res, data);
  }

  getSurvivalStops(req, res) {
    return success(res, rescueService.getSurvivalStops());
  }

  getEvChargers(req, res) {
    return success(res, rescueService.getEvChargers());
  }

  getSosReports(req, res) {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    return success(res, rescueService.listSosReports({ limit }));
  }

  createSosReport(req, res, next) {
    try {
      const { title, type } = req.body || {};
      if (!title) {
        return badRequest(res, 'El título o descripción breve del auxilio es obligatorio.');
      }
      const report = rescueService.createSosReport(req.body);
      return created(res, report);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UrbanRescueController();
