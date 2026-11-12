const vetService = require('./vet-service');
const { success, badRequest } = require('../../shared/utils/http-response');

class VetHubController {
  async getSosClinics(req, res, next) {
    try {
      const clinics = await vetService.getEmergencyClinics24h();
      return success(res, clinics);
    } catch (err) {
      next(err);
    }
  }

  triage(req, res, next) {
    try {
      const { substance } = req.body;
      if (!substance) return badRequest(res, 'substance requerida para triaje toxicológico');

      const result = vetService.triageIngestion(substance);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async scanBarcode(req, res, next) {
    try {
      const { barcode } = req.body;
      if (!barcode) return badRequest(res, 'barcode es requerido');

      const data = await vetService.scanPetFoodBarcode(barcode);
      return success(res, data);
    } catch (err) {
      next(err);
    }
  }

  getSenasa(req, res) {
    const data = vetService.getSenasaRequirements(req.query.destination);
    return success(res, data);
  }
}

module.exports = new VetHubController();

