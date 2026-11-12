const overpassClient = require('../../shared/clients/overpass-osm-api');

class OsmScannerJob {
  async scanArea(lat = 9.9333, lng = -84.0833, amenity = 'cafe') {
    const rawElements = await overpassClient.queryNearbyElements(lat, lng, 2000, amenity);
    return rawElements.map(el => ({
      osm_id: el.id,
      name: el.tags?.name || 'Local sin nombre OSM',
      category: amenity,
      lat: el.lat,
      lng: el.lon,
      wheelchair: el.tags?.wheelchair === 'yes',
      toilets: el.tags?.toilets === 'yes',
      suggested_status: 'draft_pending_admin_approval'
    }));
  }
}

module.exports = new OsmScannerJob();

