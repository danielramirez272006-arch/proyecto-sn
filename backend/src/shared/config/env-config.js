const path = require('node:path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev_insecure_jwt_secret_change_in_production',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'sn_session',
  security: {
    passwordPepper: process.env.NODE_ENV === 'test'
      ? (process.env.TEST_PASSWORD_PEPPER || '')
      : (process.env.PASSWORD_PEPPER || ''),
    bcryptRounds: parseInt(
      process.env.BCRYPT_ROUNDS || (process.env.NODE_ENV === 'test' ? '10' : '12'),
      10
    ),
  },
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
    supabaseDbUrl: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    dbUrl: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '',
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.2'),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
    freeTierDailyQuota: parseInt(process.env.GEMINI_DAILY_QUOTA || '1500', 10),
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || '3mmJ2Z5SLZ9OkeZZcv5p',
    modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
  },
  googlePlaces: {
    apiKey: process.env.GOOGLE_PLACES_API_KEY || '',
    includeAtmosphereFields: process.env.GOOGLE_PLACES_INCLUDE_ATMOSPHERE === 'true',
    timeoutMs: parseInt(process.env.GOOGLE_PLACES_TIMEOUT_MS || '7000', 10),
  },
  foursquare: {
    enabled: process.env.FOURSQUARE_ENABLED === 'true',
    allowPaidOperations: process.env.FOURSQUARE_ALLOW_PAID === 'true',
    apiKey: process.env.FOURSQUARE_API_KEY || '',
    apiVersion: process.env.FOURSQUARE_API_VERSION || '2025-06-17',
    timeoutMs: parseInt(process.env.FOURSQUARE_TIMEOUT_MS || '7000', 10),
    maxPerMinute: parseInt(process.env.FOURSQUARE_MAX_PER_MIN || '20', 10),
    maxConcurrency: parseInt(process.env.FOURSQUARE_MAX_CONCURRENCY || '2', 10),
    maxRetries: parseInt(process.env.FOURSQUARE_MAX_RETRIES || '1', 10),
  },
  geoapify: {
    enabled: process.env.GEOAPIFY_ENABLED === 'true',
    apiKey: process.env.GEOAPIFY_API_KEY || '',
    timeoutMs: parseInt(process.env.GEOAPIFY_TIMEOUT_MS || '7000', 10),
    maxPerMinute: parseInt(process.env.GEOAPIFY_MAX_PER_MIN || '30', 10),
    maxConcurrency: parseInt(process.env.GEOAPIFY_MAX_CONCURRENCY || '2', 10),
    maxRetries: parseInt(process.env.GEOAPIFY_MAX_RETRIES || '1', 10),
  },
  osmPlaces: {
    enabled: process.env.OSM_PLACES_ENABLED !== 'false',
    timeoutMs: parseInt(process.env.OSM_PLACES_TIMEOUT_MS || '8000', 10),
    maxPerMinute: parseInt(process.env.OSM_PLACES_MAX_PER_MIN || '25', 10),
    maxConcurrency: parseInt(process.env.OSM_PLACES_MAX_CONCURRENCY || '2', 10),
    maxRetries: parseInt(process.env.OSM_PLACES_MAX_RETRIES || '1', 10),
  },
  wikimedia: {
    enabled: process.env.WIKIMEDIA_PHOTOS_ENABLED !== 'false',
    timeoutMs: parseInt(process.env.WIKIMEDIA_TIMEOUT_MS || '6000', 10),
    maxPerMinute: parseInt(process.env.WIKIMEDIA_MAX_PER_MIN || '30', 10),
    maxConcurrency: parseInt(process.env.WIKIMEDIA_MAX_CONCURRENCY || '2', 10),
    maxRetries: parseInt(process.env.WIKIMEDIA_MAX_RETRIES || '1', 10),
  },
  photoPipeline: {
    privateBucket: process.env.SUPABASE_PHOTO_PRIVATE_BUCKET || 'gotox-place-photos-private',
    publicBucket: process.env.SUPABASE_PHOTO_PUBLIC_BUCKET || 'gotox-place-photos-public',
    maxBytes: parseInt(process.env.PHOTO_MAX_BYTES || String(8 * 1024 * 1024), 10),
    minWidth: parseInt(process.env.PHOTO_MIN_WIDTH || '400', 10),
    minHeight: parseInt(process.env.PHOTO_MIN_HEIGHT || '300', 10),
    batchConcurrency: parseInt(process.env.PHOTO_BATCH_CONCURRENCY || '2', 10),
    signedUrlTtlSeconds: parseInt(process.env.PHOTO_SIGNED_URL_TTL_SEC || '300', 10),
    allowedExternalHosts: (process.env.PHOTO_ALLOWED_EXTERNAL_HOSTS || 'upload.wikimedia.org,commons.wikimedia.org')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  },
  adminBootstrap: {
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
    name: process.env.ADMIN_NAME || 'Admin Sistema GoToX',
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

if (env.isProd) {
  const secreto = process.env.JWT_SECRET || '';
  if (!secreto || secreto === 'dev_insecure_jwt_secret_change_in_production') {
    // Con el secreto por defecto cualquiera podría falsificar tokens de administrador.
    throw new Error('[Security] NODE_ENV=production exige un JWT_SECRET propio y seguro en .env. El servidor no iniciará sin él.');
  }
  if (secreto.length < 32) {
    console.warn('[Security] ADVERTENCIA: JWT_SECRET tiene menos de 32 caracteres. Usa un valor aleatorio más largo.');
  }
}

module.exports = env;

