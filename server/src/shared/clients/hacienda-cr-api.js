const httpClient = require('./http-client');
const env = require('../config/env-config');

class HaciendaCrApiClient {
  async getExchangeRate() {
    const fallback = {
      compra: 508.50,
      venta: 516.20,
      fecha: new Date().toISOString().slice(0, 10),
      fuente: 'BCCR_hacienda_fallback_crc'
    };

    try {
      const data = await httpClient.getJson('https://api.hacienda.go.cr/indicadores/tc/dolar', fallback, 2500);
      return data || fallback;
    } catch {
      return fallback;
    }
  }

  calculateTaxes(subtotalCrc = 0, includesService = true, includesIva = true) {
    const ivaRate = includesIva ? 0.13 : 0.0;
    const serviceRate = includesService ? 0.10 : 0.0; // 10% Ley de propina en mesa de Costa Rica

    const ivaAmount = Math.round(subtotalCrc * ivaRate);
    const serviceAmount = Math.round(subtotalCrc * serviceRate);
    const total = subtotalCrc + ivaAmount + serviceAmount;

    return {
      subtotal_crc: subtotalCrc,
      iva_13_crc: ivaAmount,
      service_10_crc: serviceAmount,
      total_real_crc: total,
      total_markup_percentage: Math.round(((total - subtotalCrc) / (subtotalCrc || 1)) * 100),
      note: 'El 10% de servicio por ley ya incluye la propina; no requiere propina adicional en mesa.'
    };
  }
}

module.exports = new HaciendaCrApiClient();

