const httpClient = require('../../shared/clients/http-client');

class AirQualityService {
  /**
   * Obtiene la calidad del aire satelital para Costa Rica
   */
  async getAirQuality(lat = 9.9333, lng = -84.0833) {
    const fallback = {
      latitude: Number(lat),
      longitude: Number(lng),
      current: {
        european_aqi: 22,
        us_aqi: 28,
        pm10: 14.5,
        pm2_5: 8.2,
        ozone: 45.0,
        carbon_monoxide: 180.0
      },
      source: 'offline_heuristic_gam'
    };

    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=european_aqi,us_aqi,pm10,pm2_5,ozone,carbon_monoxide&timezone=America%2FCosta_Rica`;

    let data = fallback;
    try {
      const res = await httpClient.getJson(url, fallback, 3000);
      if (res && res.current) {
        data = { ...res, source: 'open_meteo_air_quality_live' };
      }
    } catch {
      data = fallback;
    }

    const aqi = data.current?.us_aqi || 30;
    const pm25 = data.current?.pm2_5 || 10;
    const pm10 = data.current?.pm10 || 15;

    let category = 'Buena';
    let outdoorSafety = 'Completamente seguro para deporte al aire libre y caminatas';

    if (aqi > 100) {
      category = 'Insalubre';
      outdoorSafety = 'Precaución para personas con asma, alergias y mascotas';
    } else if (aqi > 50) {
      category = 'Moderada';
      outdoorSafety = 'Aceptable, calidad de aire típica urbana del GAM';
    }

    return {
      coordinates: { latitude: Number(lat), longitude: Number(lng) },
      aqi_us: aqi,
      category,
      pollutants: {
        pm2_5_ugm3: pm25,
        pm10_ugm3: pm10,
        ozone_ugm3: data.current?.ozone || 40
      },
      health_recommendation: outdoorSafety,
      safe_for_exercise: aqi <= 100,
      source: data.source
    };
  }
}

module.exports = new AirQualityService();

