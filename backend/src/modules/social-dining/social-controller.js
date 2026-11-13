const socialService = require('./social-service');
const { success, badRequest } = require('../../shared/utils/http-response');
const sseBroadcaster = require('../../shared/realtime/sse-broadcaster');

class SocialController {
  midpoint(req, res, next) {
    try {
      const { locations } = req.body;
      const result = socialService.calculateGroupMidpoint(locations);
      return success(res, result);
    } catch (err) {
      return badRequest(res, err.message);
    }
  }

  splitBill(req, res, next) {
    try {
      const { items, diner_count, include_service, include_iva } = req.body;
      const result = socialService.splitBill({
        items,
        dinerCount: diner_count,
        includeService: include_service !== false,
        includeIva: include_iva !== false,
      });
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  sinpeSms(req, res, next) {
    try {
      const { bank, phone_number, amount_crc, note } = req.body;
      if (!phone_number || !amount_crc) {
        return badRequest(res, 'phone_number y amount_crc son requeridos');
      }
      const result = socialService.formatSinpeSms({
        bank,
        phoneNumber: phone_number,
        amountCrc: amount_crc,
        note,
      });
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  subscribePlanStream(req, res) {
    const channel = `plan:${req.params.code}`;
    sseBroadcaster.subscribe(channel, res);
  }
}

module.exports = new SocialController();

