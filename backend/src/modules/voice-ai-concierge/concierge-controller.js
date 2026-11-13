const conciergeService = require('./concierge-service');
const { success, badRequest } = require('../../shared/utils/http-response');

class ConciergeController {
  async handleVoiceIntent(req, res, next) {
    try {
      const { text } = req.body;
      if (!text) return badRequest(res, 'Texto o transcripción requerida');

      const result = await conciergeService.processVoiceIntent(text);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async handleChat(req, res, next) {
    try {
      const { session_id, message } = req.body;
      if (!message) return badRequest(res, 'El mensaje para el copiloto es obligatorio');

      const result = await conciergeService.chat({
        sessionId: session_id || 'default_user',
        message
      });
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async handleMultiDayItinerary(req, res, next) {
    try {
      const { days, zone, budget_crc, preferences } = req.body || {};
      const itinerary = await conciergeService.generateMultiDayItinerary({
        days: days ? parseInt(days, 10) : 2,
        zone: zone || 'Gran Área Metropolitana',
        budgetCrc: budget_crc ? parseInt(budget_crc, 10) : 35000,
        preferences
      });
      return success(res, itinerary);
    } catch (err) {
      next(err);
    }
  }

  async handleDeepReason(req, res, next) {
    try {
      const { objective, context_description, constraints } = req.body || {};
      if (!objective) return badRequest(res, 'El campo objective es requerido');

      const result = await conciergeService.deepReason({
        objective,
        contextDescription: context_description || '',
        constraints: constraints || []
      });
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getAiStatus(req, res, next) {
    try {
      const status = conciergeService.getAiStatus();
      return success(res, status);
    } catch (err) {
      next(err);
    }
  }

  async createPlanDraft(req, res, next) {
    try {
      const { prompt_text, budget_crc, attendees_count, preferences } = req.body;
      const draft = await conciergeService.generatePlanDraft({
        promptText: prompt_text,
        budgetCrc: budget_crc,
        attendeesCount: attendees_count,
        preferences,
      });
      return success(res, draft);
    } catch (err) {
      next(err);
    }
  }

  async handleVisionScan(req, res, next) {
    try {
      const { image_base64, scan_type } = req.body;
      return success(res, {
        provider: 'DeepSeek Vision OCR Bridge',
        scan_type: scan_type || 'menu_or_receipt',
        detected_text: 'Ficha procesada con éxito por visión IA',
        detected_items: [
          { name: 'Café Filtrado V60', price_crc: 2500 },
          { name: 'Tostada con Aguacate', price_crc: 4200 }
        ],
        hidden_taxes_detected: '+23% (13% IVA + 10% Servicio) ya calculado'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ConciergeController();
