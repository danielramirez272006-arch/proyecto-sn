const BANK_SINPE_NUMBERS = {
  bac: { name: 'BAC Credomatic', sms_number: '2026', syntax: (m, t, d) => `PASE ${m} ${t} ${d}` },
  bncr: { name: 'Banco Nacional (BNCR)', sms_number: '2627', syntax: (m, t, d) => `PASE ${m} ${t} ${d}` },
  bcr: { name: 'Banco de Costa Rica (BCR)', sms_number: '2277', syntax: (m, t, d) => `PASE ${m} ${t} ${d}` },
  davivienda: { name: 'Davivienda', sms_number: '7070', syntax: (m, t, d) => `PASE ${m} ${t} ${d}` },
  promerica: { name: 'Banco Promerica', sms_number: '2424', syntax: (m, t, d) => `PASE ${m} ${t} ${d}` },
  lafise: { name: 'Banco LAFISE', sms_number: '9091', syntax: (m, t, d) => `PASE ${m} ${t} ${d}` },
  coopealianza: { name: 'Coopealianza', sms_number: '8080', syntax: (m, t, d) => `PASE ${m} ${t} ${d}` }
};

class SinpeDeepLinkService {
  /**
   * Genera comandos y enlaces nativos para pagos SINPE Móvil
   */
  generateBankCommands({ amountCrc, recipientPhone, description = 'Sinergia Urbana' }) {
    const cleanPhone = String(recipientPhone || '').replace(/[^0-9]/g, '').slice(-8);
    const cleanAmount = Math.round(Number(amountCrc) || 0);
    const cleanDesc = (description || 'Pago').replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 30);

    if (cleanPhone.length !== 8) {
      throw new Error('El teléfono de destino para SINPE Móvil debe tener 8 dígitos (Costa Rica)');
    }
    if (cleanAmount <= 0) {
      throw new Error('El monto de la transferencia SINPE debe ser mayor a 0 colones');
    }

    const bankOptions = {};

    for (const [key, bank] of Object.entries(BANK_SINPE_NUMBERS)) {
      const messageBody = bank.syntax(cleanAmount, cleanPhone, cleanDesc);
      // URI estándar universal para abrir la app de mensajería SMS con el comando listo
      const smsUri = `sms:${bank.sms_number}?body=${encodeURIComponent(messageBody)}`;

      bankOptions[key] = {
        bank_name: bank.name,
        sms_number: bank.sms_number,
        command_text: messageBody,
        one_click_sms_uri: smsUri
      };
    }

    const defaultMessage = `PASE ${cleanAmount} ${cleanPhone} ${cleanDesc}`;
    const qrData = `SINPE:${cleanPhone}:${cleanAmount}:${cleanDesc}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    return {
      recipient_phone: `+506${cleanPhone}`,
      amount_crc: cleanAmount,
      description: cleanDesc,
      default_command: defaultMessage,
      qr_code_url: qrCodeUrl,
      banks: bankOptions,
      instructions: 'Toca el enlace de tu banco para abrir automáticamente tu app de SMS con el comando SINPE pre-llenado.'
    };
  }
}

module.exports = new SinpeDeepLinkService();

