const httpClient = require('./http-client');
const env = require('../config/env-config');

class OpenMeteoApiClient {
  async getForecast(lat = 9.9333, lng = -84.0833) {
    const fallback = {
      latitude: lat,
      longitude: lng,
      elevation: 1150,
      current: {
        temperature_2m: 23.5,
        relative_humidity_2m: 65,
        precipitation: 0.0,
        rain: 0.0,
        wind_speed_10m: 12.0,
        uv_index: 5.5,
        soil_moisture_0_to_1cm: 0.22, // Barro bajo
      },
      hourly: {
        time: ['12:00', '13:00', '14:00', '15:00', '16:00'],
        temperature_2m: [24, 25, 23, 21, 20],
        precipitation_probability: [10, 20, 45, 60, 30],
        uv_index: [8, 9, 7, 4, 1]
      },
      daily: {
        asphalt_temperature_est: 34.0,
        mud_risk_level: 'low',
        parasite_alert_level: 'moderate',
        solar_shade_needed: true
      },
      source: 'offline_heuristic_fallback'
    };

    const url = `${env.integrations.openMeteoUrl}/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,uv_index,soil_moisture_0_to_1cm&hourly=temperature_2m,precipitation_probability,uv_index&timezone=America%2FCosta_Rica`;

    try {
      const data = await httpClient.getJson(url, fallback, 3000);
      data.source = 'open_meteo_live';
      return data;
    } catch {
      return fallback;
    }
  }
}

module.exports = new OpenMeteoApiClient();

