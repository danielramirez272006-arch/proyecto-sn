const openMeteoClient = require('../../shared/clients/open-meteo-api');

class ComfortWeatherService {
  /**
   * Calcula el Índice de Confort Urbano y Alerta de Aguacero Tico
   */
  async getUrbanComfortIndex(lat = 9.9333, lng = -84.0833) {
    const forecast = await openMeteoClient.getForecast(lat, lng);
    const current = forecast.current || {};
    const hourly = forecast.hourly || {};

    const temp = current.temperature_2m !== undefined ? current.temperature_2m : 24.0;
    const rainCurrent = current.precipitation || 0.0;
    const humidity = current.relative_humidity_2m || 65;
    const windSpeed = current.wind_speed_10m || 10.0;
    const uvIndex = current.uv_index || 5.0;

    // 1. Análisis de aguacero vespertino típico de Costa Rica (12:00 a 18:00)
    const probabilities = hourly.precipitation_probability || [10, 20, 55, 70, 40];
    const maxRainProb = Math.max(...probabilities, rainCurrent > 0 ? 90 : 0);
    const aguaceroDetected = maxRainProb >= 60;

    // 2. Cálculo del Score de Confort al Aire Libre (0 a 100)
    let score = 100;

    // Penalización por lluvia
    if (rainCurrent > 0.5) {
      score -= 50;
    } else if (maxRainProb > 70) {
      score -= 35;
    } else if (maxRainProb > 40) {
      score -= 20;
    }

    // Penalización por temperatura extrema
    if (temp > 29) {
      score -= 15; // Mucho calor
    } else if (temp < 17) {
      score -= 15; // Frío de montaña (ej. Coronado, Cartago)
    }

    // Penalización por radiación UV extrema (Costa Rica alcanza UV 10-12 a mediodía)
    if (uvIndex >= 9) {
      score -= 20;
    } else if (uvIndex >= 7) {
      score -= 10;
    }

    // Penalización por vientos alisios fuertes
    if (windSpeed > 28) {
      score -= 15;
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    // Categorización y recomendaciones
    let status = 'ideal';
    let recommendation = 'Condiciones perfectas para ferias, caminatas, parques y terrazas abiertas.';

    if (finalScore < 40) {
      status = 'unfavorable';
      recommendation = 'Lluvia o condiciones adversas. Se recomienda trasladar la salida a una cafetería techada o museo.';
    } else if (finalScore < 70) {
      status = 'moderate';
      recommendation = 'Aceptable, pero con riesgo de aguacero vespertino o sol intenso. Lleva sombrilla o capa.';
    }

    return {
      coordinates: { latitude: lat, longitude: lng },
      current_conditions: {
        temperature_c: temp,
        relative_humidity_pct: humidity,
        wind_speed_kmh: windSpeed,
        uv_index: uvIndex,
        current_rain_mm: rainCurrent
      },
      outdoor_comfort_score: finalScore,
      status,
      aguacero_alert: {
        detected: aguaceroDetected,
        max_rain_probability_pct: maxRainProb,
        warning: aguaceroDetected
          ? '⚠️ Alerta de Aguacero Tico: Alta probabilidad de lluvia en la tarde. Planifica paradas bajo techo después de mediodía.'
          : 'Cielo despejado o nubosidad leve. Poco riesgo de aguacero.'
      },
      uv_health_alert: {
        uv_level: uvIndex >= 8 ? 'Extremo / Muy Alto' : (uvIndex >= 6 ? 'Alto' : 'Moderado'),
        requires_sunscreen: uvIndex >= 6,
        recommendation: uvIndex >= 8 ? 'Usa bloqueador SPF 50+, gorra y busca sombra entre 10 AM y 2 PM.' : 'Radiación dentro de parámetros tolerables.'
      },
      recommendation,
      source: forecast.source || 'Open-Meteo Satelital'
    };
  }
}

module.exports = new ComfortWeatherService();

