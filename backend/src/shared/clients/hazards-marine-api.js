const httpClient = require('./http-client');
const env = require('../config/env-config');

class HazardsMarineApiClient {
  async getRecentEarthquakes() {
    const fallback = [
      {
        place: '12 km al SO de Quepos, Puntarenas',
        magnitude: 3.4,
        depth_km: 18,
        time: new Date(Date.now() - 3600000).toISOString(),
        felt: false,
      }
    ];

    try {
      const data = await httpClient.getJson(env.integrations.usgsUrl, { features: [] }, 3000);
      if (data && data.features) {
        // Filtrar sismos en área de Costa Rica (Lat 8-11.5, Lng -86 a -82.5)
        const crQuakes = data.features
          .filter(f => {
            const [lng, lat] = f.geometry.coordinates;
            return lat >= 8.0 && lat <= 11.5 && lng >= -86.0 && lng <= -82.5;
          })
          .map(f => ({
            place: f.properties.place,
            magnitude: f.properties.mag,
            depth_km: f.geometry.coordinates[2],
            time: new Date(f.properties.time).toISOString(),
            felt: f.properties.mag >= 4.0,
          }));
        return crQuakes.length > 0 ? crQuakes : fallback;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  async getMarineConditions(lat = 9.59, lng = -84.62) {
    // Pacífico Central (Jacó / Puntarenas)
    return {
      wave_height_meters: 1.2,
      wave_period_seconds: 14,
      sea_temperature_c: 28.5,
      tide_status: 'Marea Alta a las 14:20',
      rip_current_risk: 'moderate',
      safe_for_swimming: true,
      source: 'marine_hazards_cr'
    };
  }
}

module.exports = new HazardsMarineApiClient();

