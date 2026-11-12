const httpClient = require('./http-client');
const env = require('../config/env-config');
const { haversineDistanceKm, calculateCurvatureIndex } = require('../utils/geo-math');

class OsrmRoutingApiClient {
  async getRoute(startCoord, endCoord, mode = 'driving') {
    const distKm = haversineDistanceKm(startCoord.lat, startCoord.lng, endCoord.lat, endCoord.lng);
    // Velocidad media urbana en Costa Rica: ~35 km/h
    const estimatedDurationSeconds = Math.round((distKm / 35) * 3600);

    const fallback = {
      code: 'Ok',
      routes: [
        {
          distance: Math.round(distKm * 1000), // metros
          duration: estimatedDurationSeconds,   // segundos
          geometry: {
            coordinates: [
              [startCoord.lng, startCoord.lat],
              [((startCoord.lng + endCoord.lng) / 2), ((startCoord.lat + endCoord.lat) / 2)],
              [endCoord.lng, endCoord.lat]
            ]
          },
          curvature: calculateCurvatureIndex([
            startCoord,
            { lat: (startCoord.lat + endCoord.lat) / 2, lng: (startCoord.lng + endCoord.lng) / 2 },
            endCoord
          ])
        }
      ],
      source: 'offline_haversine_estimate'
    };

    const url = `${env.integrations.osrmUrl}/route/v1/${mode}/${startCoord.lng},${startCoord.lat};${endCoord.lng},${endCoord.lat}?overview=simplified&geometries=geojson`;

    try {
      const data = await httpClient.getJson(url, fallback, 3000);
      if (data && data.routes && data.routes[0]) {
        const coords = data.routes[0].geometry?.coordinates?.map(c => ({ lat: c[1], lng: c[0] })) || [];
        data.routes[0].curvature = calculateCurvatureIndex(coords);
        data.source = 'osrm_live';
        return data;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }
}

module.exports = new OsrmRoutingApiClient();

