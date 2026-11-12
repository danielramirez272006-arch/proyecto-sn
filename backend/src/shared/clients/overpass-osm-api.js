const httpClient = require('./http-client');

class OverpassOsmApiClient {
  async queryNearbyElements(lat, lng, radiusMeters = 1500, amenity = 'cafe') {
    const fallback = [
      {
        id: 'osm_demo_node_1',
        type: 'node',
        lat: lat + 0.002,
        lon: lng + 0.002,
        tags: {
          name: 'Punto de Interés Comunitario',
          amenity: amenity,
          wheelchair: 'yes',
          toilets: 'yes'
        }
      }
    ];

    const overpassQuery = `[out:json][timeout:5];node["amenity"="${amenity}"](around:${radiusMeters},${lat},${lng});out body 10;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

    try {
      const data = await httpClient.getJson(url, { elements: fallback }, 4000);
      return data.elements || fallback;
    } catch {
      return fallback;
    }
  }
}

module.exports = new OverpassOsmApiClient();

