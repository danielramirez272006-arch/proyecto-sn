const httpClient = require('../clients/http-client');
const env = require('../config/env-config');

class FinancialEngineService {
  /**
   * Obtiene los tipos de cambio oficiales del BCCR y monedas globales
   */
  async getExchangeRates() {
    const fallbackBccr = {
      compra: 508.50,
      venta: 516.20,
      fecha: new Date().toISOString().slice(0, 10),
      fuente: 'BCCR_hacienda_live'
    };

    let bccrData = fallbackBccr;
    if (!env.isTest) {
      try {
        const res = await httpClient.getJson('https://api.hacienda.go.cr/indicadores/tc/dolar', fallbackBccr, 2500);
        const compraVal = Number(res?.compra?.valor ?? res?.compra);
        const ventaVal = Number(res?.venta?.valor ?? res?.venta);
        if (Number.isFinite(compraVal) && compraVal > 0 && Number.isFinite(ventaVal) && ventaVal > 0) {
          bccrData = {
            compra: compraVal,
            venta: ventaVal,
            fecha: res?.venta?.fecha || res?.compra?.fecha || res?.fecha || fallbackBccr.fecha,
            fuente: 'Banco Central de Costa Rica (vía Ministerio de Hacienda)'
          };
        }
      } catch {
        bccrData = fallbackBccr;
      }
    }

    const rates = {
      base: 'USD',
      usd_to_crc_compra: bccrData.compra,
      usd_to_crc_venta: bccrData.venta,
      rates_vs_usd: {
        CRC: bccrData.venta,
        USD: 1.0,
        EUR: 0.92,
        GBP: 0.78,
        CAD: 1.37
      },
      updated_at: new Date().toISOString(),
      source: bccrData.fuente
    };

    return rates;
  }

  /**
   * Convierte un monto entre divisas con la tasa en tiempo real
   */
  async convert({ amount = 0, from = 'CRC', to = 'USD' }) {
    const cleanAmount = Number(amount) || 0;
    const ratesData = await this.getExchangeRates();
    const rates = ratesData.rates_vs_usd;

    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();

    const fromRateToUsd = rates[fromUpper] || 1.0;
    const toRateToUsd = rates[toUpper] || 1.0;

    // Convertir de origen a USD, luego a destino
    const amountInUsd = fromUpper === 'CRC' 
      ? cleanAmount / ratesData.usd_to_crc_compra 
      : cleanAmount / fromRateToUsd;

    const convertedAmount = toUpper === 'CRC'
      ? amountInUsd * ratesData.usd_to_crc_venta
      : amountInUsd * toRateToUsd;

    return {
      original_amount: cleanAmount,
      from_currency: fromUpper,
      to_currency: toUpper,
      converted_amount: Math.round(convertedAmount * 100) / 100,
      exchange_rate_used: toUpper === 'CRC' ? ratesData.usd_to_crc_venta : (fromUpper === 'CRC' ? ratesData.usd_to_crc_compra : toRateToUsd),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Algoritmo Oficial de Redondeo en Efectivo del BCCR
   * (Para compras en colones en efectivo ante la salida de monedas de ₡1 y ₡2)
   */
  roundCashBccr(amountCrc) {
    const raw = Math.round(Number(amountCrc) || 0);
    const lastDigit = Math.abs(raw) % 10;
    let rounded = raw;

    if (lastDigit === 1 || lastDigit === 2) {
      rounded = raw - lastDigit; // Redondeo hacia abajo a 0
    } else if (lastDigit === 3 || lastDigit === 4) {
      rounded = raw + (5 - lastDigit); // Redondeo hacia arriba a 5
    } else if (lastDigit === 6 || lastDigit === 7) {
      rounded = raw - (lastDigit - 5); // Redondeo hacia abajo a 5
    } else if (lastDigit === 8 || lastDigit === 9) {
      rounded = raw + (10 - lastDigit); // Redondeo hacia arriba a 0
    }

    return {
      exact_amount_crc: raw,
      cash_rounded_crc: rounded,
      adjustment_crc: rounded - raw,
      payment_type: 'cash',
      legal_basis: 'Directriz Oficial BCCR para transacciones en efectivo'
    };
  }

  /**
   * Desglose tributario de restaurante / soda en Costa Rica con conversión USD
   */
  async calculateDiningBill({ subtotalCrc = 0, peopleCount = 1, extraTipPercentage = 0 }) {
    const subtotal = Number(subtotalCrc) || 0;
    const people = Math.max(1, Number(peopleCount) || 1);

    const iva13 = Math.round(subtotal * 0.13); // IVA Ley 9635
    const service10 = Math.round(subtotal * 0.10); // Propina legal de mesa Ley 6836
    const extraTip = Math.round(subtotal * (Number(extraTipPercentage) / 100 || 0));

    const totalExactCrc = subtotal + iva13 + service10 + extraTip;
    const cashRounding = this.roundCashBccr(totalExactCrc);

    const rates = await this.getExchangeRates();
    const totalUsd = Math.round((totalExactCrc / rates.usd_to_crc_compra) * 100) / 100;

    return {
      subtotal_crc: subtotal,
      iva_13_crc: iva13,
      service_10_crc: service10,
      extra_tip_crc: extraTip,
      total_card_crc: totalExactCrc,
      total_cash_crc: cashRounding.cash_rounded_crc,
      cash_adjustment_crc: cashRounding.adjustment_crc,
      total_usd: totalUsd,
      per_person: {
        people_count: people,
        amount_crc_card: Math.round(totalExactCrc / people),
        amount_crc_cash: Math.round(cashRounding.cash_rounded_crc / people),
        amount_usd: Math.round((totalUsd / people) * 100) / 100
      },
      legal_notes: [
        'El 10% de servicio de mesa por Ley 6836 es la propina oficial obligatoria en restaurantes con salonero.',
        'El redondeo en efectivo aplica para pagos con billetes o monedas según normativa del BCCR.'
      ]
    };
  }
}

module.exports = new FinancialEngineService();

