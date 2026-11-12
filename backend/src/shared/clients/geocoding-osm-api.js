const httpClient = require('./http-client');
const env = require('../config/env-config');

class GeocodingOsmApiClient {
  async reverseGeocode(lat, lng) {
    const fallback = {
      address: {
        road: 'Avenida Central',
        neighbourhood: 'Centro',
        suburb: 'Distrito 1',
        city: 'San José',
        country: 'Costa Rica'
      },
      display_name: `Cerca de ${lat.toFixed(4)}, ${lng.toFixed(4)}, Costa Rica`,
      source: 'offline_fallback'
    };

    const url = `${env.integrations.nominatimUrl}/reverse?lat=${lat}&lon=${lng}&format=json`;

    try {
      const data = await httpClient.getJson(url, fallback, 3000);
      data.source = 'nominatim_live';
      return data;
    } catch {
      return fallback;
    }
  }

  async searchAddress(query = '') {
    const fallback = [
      {
        lat: 9.9333,
        lon: -84.0833,
        display_name: `${query}, Costa Rica (Estimación offline)`,
        type: 'approximate'
      }
    ];

    const url = `${env.integrations.nominatimUrl}/search?q=${encodeURIComponent(query + ', Costa Rica')}&format=json&limit=5`;

    try {
      const data = await httpClient.getJson(url, fallback, 3000);
      return data;
    } catch {
      return fallback;
    }
  }
}

module.exports = new GeocodingOsmApiClient();

