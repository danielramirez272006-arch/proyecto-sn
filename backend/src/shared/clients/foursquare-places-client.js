const env = require('../config/env-config');

const FOURSQUARE_BASE_URL = 'https://places-api.foursquare.com';

class FoursquarePlacesClient {
  constructor(config = env.foursquare || {}) {
    this.enabled = Boolean(config.enabled);
    this.allowPaidOperations = Boolean(config.allowPaidOperations);
    this.apiKey = config.apiKey || '';
    this.apiVersion = config.apiVersion || '2025-06-17';
    this.timeoutMs = Number(config.timeoutMs) || 7000;
  }

  isConfigured() {
    return Boolean(this.apiKey && String(this.apiKey).trim().length > 0);
  }

  isEnabledAndConfigured() {
    return Boolean(this.enabled && this.isConfigured());
  }

  _sanitizeError(code, message, status = 502) {
    const err = new Error(message);
    err.code = code;
    err.status = status;
    return err;
  }

  _headers() {
    return {
      Accept: 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'X-Places-Api-Version': this.apiVersion,
    };
  }

  async searchPlaces({ query, lat, lng, radiusMeters = 700, limit = 5, fetchImpl = fetch } = {}) {
    if (!this.isConfigured()) {
      throw this._sanitizeError(
        'FOURSQUARE_NOT_CONFIGURED',
        'FOURSQUARE_API_KEY no está configurada en el backend.',
        503
      );
    }

    const q = String(query || '').trim();
    if (!q) {
      throw this._sanitizeError('INVALID_TEXT_QUERY', 'La consulta de búsqueda es obligatoria.', 400);
    }

    const params = new URLSearchParams({
      query: q,
      limit: String(Math.max(1, Math.min(10, Math.round(Number(limit) || 5)))),
    });

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      params.set('ll', `${Number(lat)},${Number(lng)}`);
      params.set('radius', String(Math.max(100, Math.min(5000, Math.round(Number(radiusMeters) || 700)))));
    }

    let resp;
    try {
      resp = await fetchImpl(`${FOURSQUARE_BASE_URL}/places/search?${params.toString()}`, {
        method: 'GET',
        headers: this._headers(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      throw this._sanitizeError(
        isTimeout ? 'FOURSQUARE_TIMEOUT' : 'FOURSQUARE_UNAVAILABLE',
        isTimeout ? 'Tiempo de espera agotado consultando Foursquare.' : 'No fue posible conectar con Foursquare.',
        isTimeout ? 504 : 502
      );
    }

    if (resp.status === 429) {
      throw this._sanitizeError('FOURSQUARE_QUOTA_EXCEEDED', 'Cuota de Foursquare Places agotada.', 429);
    }
    if (resp.status === 401 || resp.status === 403) {
      throw this._sanitizeError('FOURSQUARE_AUTH_ERROR', 'Credenciales de Foursquare Places rechazadas.', 403);
    }
    if (!resp.ok) {
      throw this._sanitizeError('FOURSQUARE_UNAVAILABLE', `Foursquare respondió con estado ${resp.status}.`, 502);
    }

    const data = await resp.json();
    const results = Array.isArray(data?.results) ? data.results : [];

    return results
      .map((p) => {
        const fsqId = p.fsq_place_id || p.fsq_id || null;
        const pLat = Number(p.latitude ?? p.geocodes?.main?.latitude);
        const pLng = Number(p.longitude ?? p.geocodes?.main?.longitude);
        if (!fsqId || !Number.isFinite(pLat) || !Number.isFinite(pLng)) return null;

        return {
          external_id: fsqId,
          name: p.name || '',
          address: p.location?.formatted_address || p.location?.address || '',
          lat: pLat,
          lng: pLng,
          source_url: p.link ? `https://foursquare.com${p.link}` : `https://foursquare.com/v/${fsqId}`,
        };
      })
      .filter(Boolean);
  }

  async getPlacePhotos({ fsqId, limit = 3, fetchImpl = fetch } = {}) {
    if (!this.allowPaidOperations) {
      throw this._sanitizeError(
        'FOURSQUARE_PAID_OPERATION_DISABLED',
        'El endpoint de fotografías de Foursquare requiere créditos pagos y está deshabilitado.',
        403
      );
    }
    if (!this.isConfigured()) {
      throw this._sanitizeError(
        'FOURSQUARE_NOT_CONFIGURED',
        'FOURSQUARE_API_KEY no está configurada en el backend.',
        503
      );
    }

    const cleanId = String(fsqId || '').trim();
    if (!cleanId) return [];

    let resp;
    try {
      resp = await fetchImpl(
        `${FOURSQUARE_BASE_URL}/places/${encodeURIComponent(cleanId)}/photos?limit=${Math.max(1, Math.min(5, Number(limit) || 3))}`,
        {
          method: 'GET',
          headers: this._headers(),
          signal: AbortSignal.timeout(this.timeoutMs),
        }
      );
    } catch (err) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      throw this._sanitizeError(
        isTimeout ? 'FOURSQUARE_TIMEOUT' : 'FOURSQUARE_UNAVAILABLE',
        'No fue posible obtener fotografías de Foursquare.',
        isTimeout ? 504 : 502
      );
    }

    if (resp.status === 429) {
      throw this._sanitizeError('FOURSQUARE_QUOTA_EXCEEDED', 'Cuota de Foursquare Places agotada.', 429);
    }
    if (resp.status === 401 || resp.status === 403) {
      throw this._sanitizeError('FOURSQUARE_AUTH_ERROR', 'Credenciales de Foursquare Places rechazadas.', 403);
    }
    if (!resp.ok) {
      return [];
    }

    const photos = await resp.json();
    if (!Array.isArray(photos)) return [];

    return photos
      .filter((ph) => ph?.prefix && ph?.suffix)
      .map((ph) => ({
        url: `${ph.prefix}900x600${ph.suffix}`,
        width: ph.width || null,
        height: ph.height || null,
      }));
  }
}

module.exports = new FoursquarePlacesClient();
module.exports.FoursquarePlacesClient = FoursquarePlacesClient;
