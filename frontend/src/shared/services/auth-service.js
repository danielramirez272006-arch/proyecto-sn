import { api } from './api-client';

const REFRESH_TOKEN_KEY = 'sn_refresh_token';

function saveAuthTokens({ token, refresh_token: refreshToken } = {}) {
  if (token) {
    api.setToken(token);
    api.setGuestToken(null);
  }
  if (typeof localStorage !== 'undefined') {
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else if (refreshToken === null) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }
}

function clearAuthTokens() {
  api.setToken(null);
  api.setGuestToken(null);
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/**
 * Servicio de autenticación listo para conectar las pantallas de Login y Registro
 * contra los endpoints /api/auth/* del backend Express.
 */
export const authService = {
  /**
   * Inicia sesión con correo y contraseña registrados en el backend.
   * @param {{ email: string, password: string }} credentials
   */
  async login({ email, password }) {
    const data = await api.post('/auth/login', { email, password });
    saveAuthTokens(data);
    return data;
  },

  /**
   * Registra una nueva cuenta en el backend y guarda los tokens JWT devueltos.
   * @param {{ name: string, email: string, password: string }} payload
   */
  async register({ name, email, password }) {
    const data = await api.post('/auth/register', { name, email, password });
    saveAuthTokens(data);
    return data;
  },

  /**
   * Renueva el token JWT usando el refresh_token almacenado.
   */
  async refreshSession() {
    const refreshToken =
      typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
    if (!refreshToken) {
      throw new Error('No hay refresh_token disponible');
    }
    const data = await api.post('/auth/refresh', { refresh_token: refreshToken });
    saveAuthTokens(data);
    return data;
  },

  /**
   * Obtiene el usuario autenticado actual desde el backend (JWT o guest_token).
   */
  async getMe() {
    return api.get('/auth/me');
  },

  /**
   * Cierra sesión en el backend revocando el refresh_token y limpia el almacenamiento local.
   */
  async logout() {
    const refreshToken =
      typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } finally {
      clearAuthTokens();
    }
  },

  /**
   * Crea una sesión temporal de invitado en el backend.
   */
  async createGuestSession(alias = '') {
    const data = await api.post('/auth/guest-session', { alias });
    if (data?.guest_token) {
      api.setGuestToken(data.guest_token);
    }
    return data;
  },

  getStoredTokens() {
    return {
      token: api.token,
      refreshToken:
        typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null,
      guestToken: api.guestToken
    };
  }
};

export default authService;
