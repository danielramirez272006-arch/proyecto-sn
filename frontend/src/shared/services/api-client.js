const BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';

/**
 * Cliente HTTP estandarizado para la plataforma Sinergia Urbana Costa Rica.
 * Gestiona de forma automática:
 * - Inyección de tokens de autenticación Bearer (Supabase / JWT).
 * - Cabecera x-guest-token para usuarios invitados sin cuenta.
 * - Desempaquetado del formato envolvente { ok, data, meta, error }.
 * - Propagación de códigos de error y trazabilidad (request_id).
 */
class ApiClient {
  constructor() {
    this.token = typeof localStorage !== 'undefined' ? localStorage.getItem('sn_auth_token') : null;
    this.guestToken = typeof localStorage !== 'undefined' ? localStorage.getItem('sn_guest_token') : null;
    this.language = typeof localStorage !== 'undefined' ? localStorage.getItem('sn_language') || 'es' : 'es';
    this.refreshPromise = null;
  }

  async _tryRefreshToken() {
    if (typeof localStorage === 'undefined') return null;
    const refreshToken = localStorage.getItem('sn_refresh_token');
    if (!refreshToken) return null;

    if (!this.refreshPromise) {
      this.refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('REFRESH_FAILED');
          const json = await res.json();
          const payload = json?.data || json;
          if (payload?.token) {
            this.setToken(payload.token);
            if (payload.refresh_token) {
              localStorage.setItem('sn_refresh_token', payload.refresh_token);
            }
            return payload.token;
          }
          throw new Error('REFRESH_FAILED');
        })
        .catch(() => {
          this.setToken(null);
          localStorage.removeItem('sn_refresh_token');
          return null;
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }

    return this.refreshPromise;
  }

  setLanguage(lang) {
    this.language = lang;
    if (typeof localStorage !== 'undefined') {
      if (lang) localStorage.setItem('sn_language', lang);
      else localStorage.removeItem('sn_language');
    }
  }

  setToken(token) {
    this.token = token;
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem('sn_auth_token', token);
      else localStorage.removeItem('sn_auth_token');
    }
  }

  setGuestToken(token) {
    this.guestToken = token;
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem('sn_guest_token', token);
      else localStorage.removeItem('sn_guest_token');
    }
  }

  async request(endpoint, { method = 'GET', body = null, headers = {}, _retried = false } = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    };

    if (this.token) {
      defaultHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.guestToken) {
      defaultHeaders['x-guest-token'] = this.guestToken;
    }

    if (this.language) {
      defaultHeaders['x-language'] = this.language;
    }

    const config = {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      if (
        response.status === 401 &&
        !_retried &&
        !endpoint.startsWith('/auth/login') &&
        !endpoint.startsWith('/auth/register') &&
        !endpoint.startsWith('/auth/refresh')
      ) {
        const newToken = await this._tryRefreshToken();
        if (newToken) {
          return this.request(endpoint, { method, body, headers, _retried: true });
        }
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(data?.error?.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.code = data?.error?.code || 'UNKNOWN_ERROR';
        error.details = data?.error?.details || null;
        error.requestId = data?.meta?.request_id || null;
        throw error;
      }

      return data?.data !== undefined ? data.data : data;
    } catch (err) {
      console.error(`[API Error] ${method} ${endpoint}:`, err);
      throw err;
    }
  }

  get(endpoint, options) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, body, options) {
    return this.request(endpoint, { method: 'POST', body, ...options });
  }

  put(endpoint, body, options) {
    return this.request(endpoint, { method: 'PUT', body, ...options });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

export const api = new ApiClient();
export default api;

