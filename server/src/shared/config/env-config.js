require('dotenv').config();

const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev_insecure_jwt_secret_change_in_production',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'sn_session',
  db: {
    dialect: process.env.DB_DIALECT || (process.env.NODE_ENV === 'test' ? 'sqlite' : 'mysql'),
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.NODE_ENV === 'test' 
      ? (process.env.DB_NAME_TEST || ':memory:') 
      : (process.env.DB_NAME || 'sn_db'),
    connectionLimit: parseInt(process.env.DB_POOL_LIMIT || '10', 10),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    freeTierDailyQuota: parseInt(process.env.GEMINI_DAILY_QUOTA || '1500', 10),
  },
  webhook: {
    url: process.env.WEBHOOK_URL || '',
  },
  integrations: {
    osrmUrl: process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
    openMeteoUrl: process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1',
    rainviewerUrl: process.env.RAINVIEWER_BASE_URL || 'https://api.rainviewer.com/public/weather-maps.json',
    nominatimUrl: process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org',
    haciendaUrl: process.env.HACIENDA_API_URL || 'https://api.hacienda.go.cr/fe/ae',
    recopeUrl: process.env.RECOPE_API_URL || 'https://api.recope.go.cr/combustibles/precios',
    usgsUrl: process.env.USGS_EARTHQUAKE_URL || 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    nagerUrl: process.env.NAGER_DATE_URL || 'https://date.nager.at/api/v3/PublicHolidays',
    radioBrowserUrl: process.env.RADIO_BROWSER_URL || 'https://de1.api.radio-browser.info/json/stations/bycountry/costa%20rica',
  }
};

module.exports = env;

