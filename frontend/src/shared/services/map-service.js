import { api } from './api-client';

/**
 * Servicio de Mapa 2D/3D y Restaurantes Pet-Friendly listo para conectar
 * librerías como MapLibre GL, Deck.gl, Leaflet o Three.js en el frontend.
 */
export const mapService = {
  /**
   * Obtiene la escena completa del mapa (cámara 2D/3D, marcadores GeoJSON 2D,
   * polígonos extruidos 3D, restaurantes enriquecidos, reportes y cortes).
   * @param {{ mode?: '2d'|'3d', category?: string, lat?: number, lng?: number }} params
   */
  async getScene({ mode = '3d', category = 'all', lat, lng } = {}) {
    const query = new URLSearchParams();
    query.set('mode', mode);
    if (category && category !== 'all') query.set('category', category);
    if (lat !== undefined) query.set('lat', String(lat));
    if (lng !== undefined) query.set('lng', String(lng));
    return api.get(`/live/scene?${query.toString()}`);
  },

  /**
   * Obtiene únicamente los pines enriquecidos para vista rápida.
   */
  async getPins({ lat, lng } = {}) {
    const query = new URLSearchParams();
    if (lat !== undefined) query.set('lat', String(lat));
    if (lng !== undefined) query.set('lng', String(lng));
    const qs = query.toString();
    return api.get(`/live/pins${qs ? `?${qs}` : ''}`);
  },

  /**
   * Obtiene el detalle completo de un restaurante o lugar al hacer clic en el mapa.
   */
  async getPlaceDetail(id) {
    return api.get(`/live/places/${encodeURIComponent(id)}`);
  },

  /**
   * Obtiene el GeoJSON RFC 7946 estándar del catálogo de lugares.
   */
  async getGeoJson() {
    return api.get('/places/export/geojson');
  },

  /**
   * Envía un reporte ciudadano en vivo (tráfico, incidente, aforo, etc.).
   */
  async postReport({ type, lat, lng, note = '' }) {
    return api.post('/live/report', { type, lat, lng, note });
  },

  /**
   * Obtiene enlaces universales de navegación (Waze, Google Maps, Apple Maps).
   */
  async getNavigationLinks({ lat, lng, label }) {
    const query = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      label: label || 'Restaurante GoToX'
    });
    return api.get(`/places/navigation-links?${query.toString()}`);
  },

  /**
   * Suscripción en tiempo real (SSE) a nuevos reportes e incidentes en el mapa.
   * @param {(eventName: string, payload: any) => void} onEvent
   * @returns {() => void} Función para cerrar la conexión SSE
   */
  subscribeLiveStream(onEvent) {
    if (typeof EventSource === 'undefined') return () => {};
    const source = new EventSource('/api/live/stream');
    const handler = (eventName) => (e) => {
      try {
        onEvent(eventName, JSON.parse(e.data));
      } catch {
        onEvent(eventName, e.data);
      }
    };
    source.addEventListener('NEW_REPORT', handler('NEW_REPORT'));
    source.addEventListener('UTILITY_OUTAGE', handler('UTILITY_OUTAGE'));
    return () => source.close();
  }
};

export default mapService;
