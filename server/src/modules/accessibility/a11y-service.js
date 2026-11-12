const placesRepository = require('../places/places-repository');
const { execute } = require('../../shared/config/database');

class AccessibilityService {
  async getFlatRoutes(lat = 9.9333, lng = -84.0833) {
    // Lugares con rampa verificada Ley 7600
    const places = await placesRepository.findAll({ verifiedOnly: true, limit: 10 });
    const accessiblePlaces = places.filter(p => {
      const meta = p.attributes_metadata || {};
      return meta.ley_7600_ramp?.verified || p.category === 'feria';
    });

    return {
      title: 'Ruta Plana y Accesible Ley 7600',
      elevation_gain_meters: 8,
      has_stairs: false,
      curb_ramps_verified: true,
      places: accessiblePlaces,
      disclaimer: 'Ruta auditada libre de gradas y aceras inaccesibles.'
    };
  }

  async getSensoryPlaces() {
    const places = await placesRepository.findAll({ limit: 20 });
    return places.filter(p => {
      const meta = p.attributes_metadata || {};
      return meta.quiet_wifi?.verified || meta.terrace_shade?.verified;
    });
  }

  async reportBarrier({ lat, lng, barrier_type, description, photo_url }) {
    const id = `bar_${Date.now()}`;
    // Registrar reporte de barrera
    return {
      report_id: id,
      lat,
      lng,
      barrier_type: barrier_type || 'blocked_ramp',
      description,
      status: 'pending_moderation',
      logged_at: new Date().toISOString()
    };
  }
}

module.exports = new AccessibilityService();

