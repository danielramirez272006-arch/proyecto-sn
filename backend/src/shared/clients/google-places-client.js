const env = require('../config/env-config');
const { haversineDistanceKm } = require('../utils/geo-math');

const PLACES_BASE_URL = 'https://places.googleapis.com/v1';
const BASE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.googleMapsUri',
  'places.primaryType',
  'places.photos',
];

const PHOTO_NAME_REGEX = /^places\/[^/]+\/photos\/[^/]+$/;

class GooglePlacesClient {
  constructor(config = env.googlePlaces || {}) {
    this.apiKey = config.apiKey || '';
    this.includeAtmosphereFields = Boolean(config.includeAtmosphereFields);
    this.timeoutMs = Number(config.timeoutMs) || 7000;
  }

  isConfigured() {
    return Boolean(this.apiKey && String(this.apiKey).trim().length > 0);
  }

  getFieldMask({ includeAtmosphere = this.includeAtmosphereFields } = {}) {
    const fields = [...BASE_FIELD_MASK];
    if (includeAtmosphere) {
      // places.allowsDogs pertenece al SKU Enterprise + Atmosphere (costo superior al tier Pro)
      fields.push('places.allowsDogs');
    }
    return fields.join(',');
  }

  _sanitizeError(code, message, status = 502) {
    const err = new Error(message);
    err.code = code;
    err.status = status;
    return err;
  }

  /**
   * Busca restaurantes cercanos con Google Places API (New) sin simular resultados si falta la clave.
   */
  async searchNearbyRestaurants({
    lat,
    lng,
    radius = 2000,
    limit = 15,
    includeAtmosphere = this.includeAtmosphereFields,
    fetchImpl = fetch,
  } = {}) {
    if (!this.isConfigured()) {
      throw this._sanitizeError(
        'GOOGLE_PLACES_NOT_CONFIGURED',
        'GOOGLE_PLACES_API_KEY no está configurada en el backend.',
        503
      );
    }

    const safeRadius = Math.max(100, Math.min(50000, Number(radius) || 2000));
    const safeLimit = Math.max(1, Math.min(20, Math.round(Number(limit) || 15)));
    const fieldMask = this.getFieldMask({ includeAtmosphere });

    let resp;
    try {
      resp = await fetchImpl(`${PLACES_BASE_URL}/places:searchNearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify({
          includedTypes: ['restaurant', 'cafe'],
          maxResultCount: safeLimit,
          locationRestriction: {
            circle: {
              center: { latitude: Number(lat), longitude: Number(lng) },
              radius: safeRadius,
            },
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError' || String(err?.message || '').includes('timeout');
      throw this._sanitizeError(
        isTimeout ? 'GOOGLE_PLACES_TIMEOUT' : 'GOOGLE_PLACES_UNAVAILABLE',
        isTimeout ? 'Tiempo de espera agotado consultando Google Places.' : 'No fue posible conectar con Google Places.',
        isTimeout ? 504 : 502
      );
    }

    if (resp.status === 429) {
      throw this._sanitizeError('GOOGLE_PLACES_QUOTA_EXCEEDED', 'Cuota de Google Places API agotada.', 429);
    }
    if (resp.status === 401 || resp.status === 403) {
      throw this._sanitizeError('GOOGLE_PLACES_AUTH_ERROR', 'Credenciales de Google Places API rechazadas.', 502);
    }
    if (!resp.ok) {
      throw this._sanitizeError('GOOGLE_PLACES_UNAVAILABLE', `Google Places respondió con estado ${resp.status}.`, 502);
    }

    const payload = await resp.json();
    const rawPlaces = Array.isArray(payload?.places) ? payload.places : [];

    const places = [];
    for (const p of rawPlaces) {
      const pLat = Number(p.location?.latitude);
      const pLng = Number(p.location?.longitude);
      if (!p.id || !Number.isFinite(pLat) || !Number.isFinite(pLng)) continue;

      const distKm = haversineDistanceKm(Number(lat), Number(lng), pLat, pLng);
      if (distKm * 1000 > safeRadius) continue;

      const firstPhoto = Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null;
      const attributions = Array.isArray(firstPhoto?.authorAttributions)
        ? firstPhoto.authorAttributions.map((a) => ({
            displayName: a.displayName || null,
            uri: a.uri || null,
            photoUri: a.photoUri || null,
          }))
        : [];

      // La señal allowsDogs es información del proveedor únicamente para perros (nunca confirmación total)
      const accessStatus = p.allowsDogs === true
        ? 'allowed'
        : p.allowsDogs === false
        ? 'not_allowed'
        : 'unknown';

      places.push({
        external_id: p.id,
        name: p.displayName?.text || 'Establecimiento Google Places',
        address: p.formattedAddress || null,
        category: p.primaryType || 'restaurant',
        lat: pLat,
        lng: pLng,
        distance_km: distKm,
        source_url: p.googleMapsUri || null,
        provider: 'google_places',
        allows_dogs_signal: p.allowsDogs === undefined ? null : Boolean(p.allowsDogs),
        access_status: accessStatus,
        photo_ref: firstPhoto?.name && PHOTO_NAME_REGEX.test(firstPhoto.name)
          ? {
              name: firstPhoto.name,
              author_attributions: attributions,
            }
          : null,
      });
    }

    return {
      places,
      field_mask: fieldMask,
      atmosphere_requested: includeAtmosphere,
      provider: 'google_places',
    };
  }

  /**
   * Busca candidatos por texto y sesgo geográfico en Places API (New) para validar sucursal sin asociar fotos a ciegas.
   */
  async searchTextPlace({
    textQuery,
    lat,
    lng,
    radiusMeters = 600,
    maxResultCount = 5,
    fetchImpl = fetch,
  } = {}) {
    if (!this.isConfigured()) {
      throw this._sanitizeError(
        'GOOGLE_PLACES_NOT_CONFIGURED',
        'GOOGLE_PLACES_API_KEY no está configurada en el backend.',
        503
      );
    }

    const query = String(textQuery || '').trim();
    if (!query) {
      throw this._sanitizeError('INVALID_TEXT_QUERY', 'La consulta de búsqueda del lugar es obligatoria.', 400);
    }

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.googleMapsUri',
      'places.photos',
    ].join(',');

    const body = {
      textQuery: query,
      maxResultCount: Math.max(1, Math.min(10, Math.round(Number(maxResultCount) || 5))),
      languageCode: 'es',
    };

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      body.locationBias = {
        circle: {
          center: { latitude: Number(lat), longitude: Number(lng) },
          radius: Math.max(100, Math.min(5000, Number(radiusMeters) || 600)),
        },
      };
    }

    let resp;
    try {
      resp = await fetchImpl(`${PLACES_BASE_URL}/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError' || String(err?.message || '').includes('timeout');
      throw this._sanitizeError(
        isTimeout ? 'GOOGLE_PLACES_TIMEOUT' : 'GOOGLE_PLACES_UNAVAILABLE',
        isTimeout ? 'Tiempo de espera agotado consultando Google Places.' : 'No fue posible conectar con Google Places.',
        isTimeout ? 504 : 502
      );
    }

    if (resp.status === 429) {
      throw this._sanitizeError('GOOGLE_PLACES_QUOTA_EXCEEDED', 'Cuota de Google Places API agotada.', 429);
    }
    if (resp.status === 401 || resp.status === 403) {
      throw this._sanitizeError('GOOGLE_PLACES_AUTH_ERROR', 'Credenciales o permisos de Google Places API rechazados.', 403);
    }
    if (!resp.ok) {
      throw this._sanitizeError('GOOGLE_PLACES_UNAVAILABLE', `Google Places respondió con estado ${resp.status}.`, 502);
    }

    const payload = await resp.json();
    const rawPlaces = Array.isArray(payload?.places) ? payload.places : [];

    return rawPlaces
      .filter((p) => p?.id && Number.isFinite(Number(p.location?.latitude)) && Number.isFinite(Number(p.location?.longitude)))
      .map((p) => ({
        external_id: p.id,
        name: p.displayName?.text || '',
        address: p.formattedAddress || '',
        lat: Number(p.location.latitude),
        lng: Number(p.location.longitude),
        source_url: p.googleMapsUri || null,
        photos: Array.isArray(p.photos) ? p.photos : [],
      }));
  }

  /**
   * Resuelve una fotografía bajo demanda con skipHttpRedirect=true sin almacenar el recurso ni exponer la API key.
   */
  async getPhotoMedia({ photoName, maxWidthPx = 800, fetchImpl = fetch } = {}) {
    if (!this.isConfigured()) {
      throw this._sanitizeError(
        'GOOGLE_PLACES_NOT_CONFIGURED',
        'GOOGLE_PLACES_API_KEY no está configurada en el backend.',
        503
      );
    }

    const cleanName = String(photoName || '').trim();
    if (!PHOTO_NAME_REGEX.test(cleanName)) {
      throw this._sanitizeError('INVALID_PHOTO_NAME', 'El identificador de fotografía de Google Places es inválido.', 400);
    }

    const safeWidth = Math.max(100, Math.min(2400, Math.round(Number(maxWidthPx) || 800)));

    let resp;
    try {
      resp = await fetchImpl(
        `${PLACES_BASE_URL}/${cleanName}/media?maxWidthPx=${safeWidth}&skipHttpRedirect=true`,
        {
          method: 'GET',
          headers: {
            'X-Goog-Api-Key': this.apiKey,
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        }
      );
    } catch (err) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      throw this._sanitizeError(
        isTimeout ? 'GOOGLE_PLACES_TIMEOUT' : 'GOOGLE_PLACES_UNAVAILABLE',
        'No fue posible resolver la fotografía bajo demanda.',
        isTimeout ? 504 : 502
      );
    }

    if (resp.status === 429) {
      throw this._sanitizeError('GOOGLE_PLACES_QUOTA_EXCEEDED', 'Cuota de Google Places API agotada.', 429);
    }
    if (resp.status === 401 || resp.status === 403) {
      throw this._sanitizeError('GOOGLE_PLACES_AUTH_ERROR', 'Credenciales o permisos de Google Places API rechazados.', 403);
    }
    if (!resp.ok) {
      throw this._sanitizeError('GOOGLE_PLACES_UNAVAILABLE', `Error resolviendo fotografía (${resp.status}).`, 502);
    }

    const data = await resp.json();
    return {
      name: data.name || cleanName,
      photo_uri: data.photoUri || null,
      width_px: safeWidth,
      provider: 'google_places',
    };
  }
}

module.exports = new GooglePlacesClient();
module.exports.GooglePlacesClient = GooglePlacesClient;
module.exports.PHOTO_NAME_REGEX = PHOTO_NAME_REGEX;
