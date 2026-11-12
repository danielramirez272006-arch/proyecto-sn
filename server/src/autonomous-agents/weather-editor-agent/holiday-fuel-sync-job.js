const publicServicesClient = require('../../shared/clients/public-services-cr-api');
const haciendaClient = require('../../shared/clients/hacienda-cr-api');
const contextMediaClient = require('../../shared/clients/context-media-api');

class HolidayFuelSyncJob {
  async syncDailyIndicators() {
    const fuel = await publicServicesClient.getFuelPrices();
    const exchange = await haciendaClient.getExchangeRate();
    const holidays = await contextMediaClient.getOfficialHolidaysCR();

    return {
      synced_at: new Date().toISOString(),
      fuel_prices: fuel,
      usd_exchange_rate: exchange,
      upcoming_holidays_count: holidays.length,
    };
  }
}

module.exports = new HolidayFuelSyncJob();

