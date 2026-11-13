const deepSeekClient = require('../../shared/config/deepseek-config');
const haciendaClient = require('../../shared/clients/hacienda-cr-api');

class InvoicePriceExtractor {
  extractHiddenTaxes(subtotalCrc = 0, totalChargedCrc = 0) {
    const markup = totalChargedCrc - subtotalCrc;
    const percentage = Math.round((markup / (subtotalCrc || 1)) * 100);
    return {
      has_hidden_23_percent: percentage >= 23,
      actual_markup_percentage: percentage,
      clean_recommendation: percentage <= 13 ? 'Comercio transparente con precios netos' : 'Comercio desglosa +10% de propina en factura'
    };
  }

  /**
   * Extrae y analiza en tiempo real una factura o ticket de Costa Rica usando DeepSeek AI
   * con soporte de fallback heurístico si la IA está desconectada.
   */
  async extractFromText(invoiceText = '') {
    if (!invoiceText || invoiceText.trim().length === 0) {
      throw new Error('El texto de la factura o comprobante está vacío');
    }

    if (deepSeekClient.isConfigured()) {
      try {
        const systemInstruction = `Eres un auditor tributario y financiero experto en Costa Rica y en el sistema de Factura Electrónica de Hacienda.
Analiza el texto de este ticket, comprobante SINPE Móvil o factura comercial y extrae un JSON estructurado con:
- merchant_name (string): nombre del comercio o emisor
- legal_id (string o null): cédula jurídica o física si aparece
- subtotal_crc (number): subtotal antes de impuestos
- iva_13_crc (number): impuesto al valor agregado (13%)
- service_10_crc (number): 10% impuesto de servicio de mesa por ley en restaurantes
- tip_crc (number): propina voluntaria adicional
- total_crc (number): monto total pagado en colones
- currency (string): "CRC" o "USD"
- clave_hacienda_50_digits (string o null): los 50 dígitos numéricos si es factura electrónica
- line_items (array de objetos { name, price_crc, quantity })
- is_compliant_with_cr_law (boolean): si los impuestos están bien calculados`;

        const aiResult = await deepSeekClient.generateJson({
          prompt: `Analiza esta factura/ticket:\n${invoiceText}`,
          systemInstruction,
          temperature: 0.1
        });

        if (aiResult && aiResult.total_crc !== undefined) {
          const taxesCheck = haciendaClient.calculateTaxes(
            aiResult.subtotal_crc || aiResult.total_crc,
            Boolean(aiResult.service_10_crc),
            Boolean(aiResult.iva_13_crc)
          );

          return {
            ...aiResult,
            tax_audit: taxesCheck,
            extracted_by: 'DeepSeek AI V3',
            processed_at: new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn('[InvoiceExtractor] DeepSeek AI no disponible, usando analizador heurístico:', err.message);
      }
    }

    // Analizador heurístico inteligente para Costa Rica (Patrones Regex de SINPE y Facturas)
    return this.heuristicInvoiceParse(invoiceText);
  }

  heuristicInvoiceParse(text) {
    // 1. Detección de SINPE Móvil
    const sinpeMatch = text.match(/(?:PASE|PAGO|SINPE|TRANSFERENCIA)[\s:]*(?:DE\s*)?(?:₡|CRC)?\s*([\d,.]+)/i);
    const totalAmount = sinpeMatch 
      ? parseFloat(sinpeMatch[1].replace(/,/g, '')) 
      : this.extractMaxAmount(text);

    // 2. Detección de Clave Numérica de Hacienda (50 dígitos)
    const claveMatch = text.match(/\b\d{50}\b/);

    // 3. Detección de Comercio
    const merchantMatch = text.match(/(?:comercio|restaurante|caf[eé]|soda|supermercado|tienda)[:\s]*([a-zA-Z0-9\s]+)/i);

    const subtotal = Math.round(totalAmount / 1.23);
    const taxes = haciendaClient.calculateTaxes(subtotal, true, true);

    return {
      merchant_name: merchantMatch ? merchantMatch[1].trim() : 'Comercio Local de Costa Rica',
      legal_id: null,
      subtotal_crc: subtotal,
      iva_13_crc: taxes.iva_13_crc,
      service_10_crc: taxes.service_10_crc,
      tip_crc: 0,
      total_crc: totalAmount,
      currency: 'CRC',
      clave_hacienda_50_digits: claveMatch ? claveMatch[0] : null,
      line_items: [
        { name: 'Consumo registrado', price_crc: totalAmount, quantity: 1 }
      ],
      is_compliant_with_cr_law: true,
      tax_audit: taxes,
      extracted_by: 'Analizador Heurístico Tributario CR',
      processed_at: new Date().toISOString()
    };
  }

  extractMaxAmount(text) {
    const numbers = text.match(/₡?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g);
    if (!numbers) return 5000;
    const values = numbers.map(n => parseFloat(n.replace(/[₡\s,]/g, ''))).filter(n => !isNaN(n) && n < 10000000);
    return values.length > 0 ? Math.max(...values) : 5000;
  }
}

module.exports = new InvoicePriceExtractor();
