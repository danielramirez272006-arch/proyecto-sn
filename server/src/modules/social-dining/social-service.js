const { calculateMidpoint } = require('../../shared/utils/geo-math');
const haciendaClient = require('../../shared/clients/hacienda-cr-api');

class SocialService {
  calculateGroupMidpoint(locations = []) {
    if (!locations || locations.length < 2) {
      throw new Error('Se requieren al menos 2 ubicaciones para triangular el Punto Medio');
    }

    const midpoint = calculateMidpoint(locations);
    return {
      fair_midpoint: midpoint,
      participants_count: locations.length,
      method: 'spherical_haversine_centroid'
    };
  }

  splitBill({ items = [], dinerCount = 1, includeService = true, includeIva = true }) {
    const subtotal = items.reduce((acc, it) => acc + (Number(it.price_crc) || 0) * (Number(it.qty) || 1), 0);
    const taxCalculation = haciendaClient.calculateTaxes(subtotal, includeService, includeIva);

    const count = Math.max(1, dinerCount);
    const perDinerTotal = Math.round(taxCalculation.total_real_crc / count);

    return {
      items,
      subtotal_crc: subtotal,
      ...taxCalculation,
      diner_count: count,
      amount_per_diner_crc: perDinerTotal,
    };
  }

  formatSinpeSms({ bank = 'BAC', phoneNumber, amountCrc, note = 'Salida grupal' }) {
    // Formatos oficiales SMS SINPE Costa Rica
    // BAC: PASE <Monto> <Telefono> <Nota> al 2223
    // BNCR: PASE <Telefono> <Monto> <Nota> al 2627
    // BCR: PASE <Telefono> <Monto> <Nota> al 2276
    let recipientNumber = '2223';
    let messageBody = `PASE ${amountCrc} ${phoneNumber} ${note}`;

    if (bank.toUpperCase() === 'BNCR' || bank.toUpperCase() === 'BN') {
      recipientNumber = '2627';
      messageBody = `PASE ${phoneNumber} ${amountCrc} ${note}`;
    } else if (bank.toUpperCase() === 'BCR') {
      recipientNumber = '2276';
      messageBody = `PASE ${phoneNumber} ${amountCrc} ${note}`;
    }

    return {
      bank,
      recipient_sms_shortcode: recipientNumber,
      sms_body: messageBody,
      sinpe_deep_link: `sms:${recipientNumber}?body=${encodeURIComponent(messageBody)}`
    };
  }
}

module.exports = new SocialService();

