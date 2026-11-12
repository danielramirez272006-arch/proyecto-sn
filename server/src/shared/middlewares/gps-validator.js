const { badRequest } = require('../utils/http-response');

// Cuadrante geográfico de Costa Rica (incluyendo Isla del Coco y frontera marítima)
const CR_BOUNDS = {
  minLat: 8.0,
  maxLat: 11.3,
  minLng: -86.1,
  maxLng: -82.5,
};

function validateGpsCoords(req, res, next) {
  const lat = parseFloat(req.body.lat ?? req.query.lat);
  const lng = parseFloat(req.body.lng ?? req.query.lng);

  if (isNaN(lat) || isNaN(lng)) {
    return badRequest(res, 'Coordenadas GPS requeridas (lat y lng deben ser números válidos)');
  }

  if (lat < CR_BOUNDS.minLat || lat > CR_BOUNDS.maxLat || lng < CR_BOUNDS.minLng || lng > CR_BOUNDS.maxLng) {
    return badRequest(res, 'Coordenadas fuera del territorio de Costa Rica');
  }

  req.validatedCoords = { lat, lng };
  next();
}

module.exports = {
  validateGpsCoords,
  CR_BOUNDS,
};

