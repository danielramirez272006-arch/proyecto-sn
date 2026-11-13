const geocodingClient = require('../../shared/clients/geocoding-osm-api');

class ReverseGeocodeService {
  /**
   * Resuelve coordenadas GPS en la división territorial oficial de Costa Rica
   */
  async resolveCoordinates(lat, lng) {
    const rawData = await geocodingClient.reverseGeocode(Number(lat), Number(lng));
    const address = rawData.address || {};

    const province = address.state || address.province || address.region || 'San José';
    const canton = address.county || address.municipality || address.city || 'Mora';
    const district = address.suburb || address.neighbourhood || address.quarter || address.village || 'Distrito Central';
    const road = address.road || address.pedestrian || address.street || 'Vía Principal';
    const postcode = address.postcode || '10101';

    const formattedAddress = `${road}, ${district}, ${canton}, ${province}, Costa Rica`;

    return {
      coordinates: { latitude: Number(lat), longitude: Number(lng) },
      territorial_division: {
        province,
        canton,
        district,
        postal_code: postcode,
        country: 'Costa Rica'
      },
      display_name: rawData.display_name || formattedAddress,
      formatted_tico_address: formattedAddress,
      source: rawData.source || 'nominatim_osm'
    };
  }
}

module.exports = new ReverseGeocodeService();

