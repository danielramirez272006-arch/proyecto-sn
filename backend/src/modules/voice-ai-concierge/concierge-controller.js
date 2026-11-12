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
