const hazardsClient = require('../../shared/clients/hazards-marine-api');

// Coordenadas centrales del Gran Área Metropolitana (GAM - San José)
const GAM_CENTER_LAT = 9.9333;
const GAM_CENTER_LNG = -84.0833;

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

class SeismicMonitorService {
  /**
   * Obtiene la actividad sísmica reciente de Costa Rica y analiza impacto en el GAM
   */
  async getSeismicActivity() {
    const rawQuakes = await hazardsClient.getRecentEarthquakes();

    const analyzedQuakes = (rawQuakes || []).map(q => {
      const mag = Number(q.magnitude) || 3.0;
      let classification = 'Menor / Instrumental';
      let feltLevel = 'Probablemente no sentido en el GAM';

      if (mag >= 6.0) {
        classification = 'Sismo Mayor / Emergencia';
        feltLevel = 'Fuertemente sentido en todo el territorio nacional';
      } else if (mag >= 4.5) {
        classification = 'Moderado';
        feltLevel = 'Sentido en el Gran Área Metropolitana';
      } else if (mag >= 3.5) {
        classification = 'Leve';
        feltLevel = 'Sentido cerca del epicentro';
      }

      const distanceToGamKm = (q.lat && q.lng)
        ? calculateDistance(q.lat, q.lng, GAM_CENTER_LAT, GAM_CENTER_LNG)
        : null;

      return {
        place: q.place,
        magnitude: mag,
        depth_km: q.depth_km || 15,
        time: q.time,
        classification,
        felt_level: feltLevel,
        distance_to_gam_km: distanceToGamKm,
        requires_safety_check: mag >= 4.5 && (distanceToGamKm === null || distanceToGamKm <= 80)
      };
    });

    const hasCriticalQuake = analyzedQuakes.some(q => q.requires_safety_check);

    return {
      country: 'Costa Rica',
      monitoring_zones: ['Valle Central', 'Pacífico Central', 'Zona Sur', 'Guanacaste', 'Caribe'],
      emergency_alert_active: hasCriticalQuake,
      total_recent_events: analyzedQuakes.length,
      latest_events: analyzedQuakes.slice(0, 10),
      protocol_recommendation: hasCriticalQuake
        ? '⚠️ Actividad sísmica sensible detectada. Si estás en una salida grupal, dirígete a zonas abiertas y reporta tu estado en S.O.S.'
        : 'Condiciones tectónicas estables en el territorio nacional.',
      updated_at: new Date().toISOString()
    };
  }
}

module.exports = new SeismicMonitorService();

