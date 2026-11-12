module.exports = {
  config: {
    env: require('./config/env-config'),
    database: require('./config/database'),
    gemini: require('./config/gemini-config'),
    JsonStoreEngine: require('./config/json-store-engine'),
  },
  utils: {
    httpResponse: require('./utils/http-response'),
    geoMath: require('./utils/geo-math'),
  },
  middlewares: {
    auth: require('./middlewares/auth-role-guard'),
    cacheGuard: require('./middlewares/cache-guard'),
    gpsValidator: require('./middlewares/gps-validator'),
    rateLimiter: require('./middlewares/rate-limiter'),
    errorHandler: require('./middlewares/error-handler'),
  },
  realtime: {
    sse: require('./realtime/sse-broadcaster'),
    webhook: require('./realtime/webhook-dispatcher'),
  },
  clients: {
    http: require('./clients/http-client'),
    email: require('./clients/email-client'),
    openMeteo: require('./clients/open-meteo-api'),
    rainviewer: require('./clients/rainviewer-radar-api'),
    osrm: require('./clients/osrm-routing-api'),
    geocoding: require('./clients/geocoding-osm-api'),
    overpass: require('./clients/overpass-osm-api'),
    hacienda: require('./clients/hacienda-cr-api'),
    publicServices: require('./clients/public-services-cr-api'),
    bioSafety: require('./clients/bio-food-safety-api'),
    hazards: require('./clients/hazards-marine-api'),
    contextMedia: require('./clients/context-media-api'),
  }
};

