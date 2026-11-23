const petVisionTriageService = require('../services/pet-vision-triage-service');
const { success, badRequest, notFound, failure } = require('../shared/utils/http-response');

class PetVisionController {
  getFocusAreas(req, res) {
    const areas = petVisionTriageService.getSupportedFocusAreas();
    return success(res, { focus_areas: areas, total: areas.length });
  }

  async analyzePhoto(req, res, next) {
    try {
      const result = await petVisionTriageService.analyzePetPhoto(req.body || {}, req.user || null);
      return success(res, result);
    } catch (err) {
      if (err.status === 400) {
        return badRequest(res, err.message, { code: err.code || 'BAD_REQUEST' });
      }
      if (err.status === 413) {
        return failure(res, err.message, err.code || 'IMAGE_TOO_LARGE', null, 413);
      }
      next(err);
    }
  }

  async compareFollowUp(req, res, next) {
    try {
      const result = await petVisionTriageService.compareFollowUpPhoto(req.body || {}, req.user || null);
      return success(res, result);
    } catch (err) {
      if (err.status === 400) {
        return badRequest(res, err.message, { code: err.code || 'BAD_REQUEST' });
      }
      if (err.status === 413) {
        return failure(res, err.message, err.code || 'IMAGE_TOO_LARGE', null, 413);
      }
      next(err);
    }
  }

  async listHistory(req, res, next) {
    try {
      const history = await petVisionTriageService.getRecentAnalyses({
        actor: req.user || null,
        limit: req.query.limit
      });
      return success(res, { analyses: history, total: history.length });
    } catch (err) {
      next(err);
    }
  }

  getAnalysisById(req, res) {
    const item = petVisionTriageService.getAnalysisById(req.params.analysisId);
    if (!item) {
      return notFound(res, `No se encontró el reporte de triaje visual con ID: ${req.params.analysisId}`);
    }
    return success(res, item);
  }
}

module.exports = new PetVisionController();
