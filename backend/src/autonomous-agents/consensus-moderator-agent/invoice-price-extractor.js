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
}

module.exports = new InvoicePriceExtractor();

