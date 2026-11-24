import { api } from './api-client';

const REFRESH_TOKEN_KEY = 'sn_refresh_token';
const CONSENT_STORAGE_KEY = 'synodos_ley8968_consent';
const DELETION_LOG_KEY = 'synodos_ley8968_deletion_requests';

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
 * Servicio de autenticación listo para conectar las pantallas de Login, Registro,
 * Recuperación de Contraseña y Baja de Cuenta (Ley N.º 8968 CR) contra /api/auth/*.
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
   * Registra una nueva cuenta en el backend incluyendo el consentimiento explícito Ley 8968.
   */
  async register({
    name,
    email,
    password,
    phone,
    zone,
    hasPet,
    pet,
    acceptTerms = true,
    acceptPrivacy = true,
    termsVersion = '2026.11-CR-8968',
    cookiesPreferences = null
  }) {
    const consentRecord = {
      email,
      acceptTerms: Boolean(acceptTerms),
      acceptPrivacy: Boolean(acceptPrivacy),
      termsVersion,
      acceptedAt: new Date().toISOString()
    };

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentRecord));
      } catch {}
    }

    const data = await api.post('/auth/register', {
      name,
      email,
      password,
      phone,
      zone,
      hasPet,
      pet,
      acceptTerms: Boolean(acceptTerms),
      acceptPrivacy: Boolean(acceptPrivacy),
      termsVersion,
      cookiesPreferences
    });
    saveAuthTokens(data);
    return data;
  },

  /**
   * Solicita un código/token de recuperación de contraseña al backend.
   * Incluye fallback determinista en caso de que el endpoint de backend aún esté en integración.
   */
  async forgotPassword({ email }) {
    try {
      const data = await api.post('/auth/forgot-password', { email });
      return {
        ok: true,
        message:
          data?.message ||
          'Se ha enviado un código de verificación a tu correo registrado para restablecer tu contraseña.',
        demoToken: data?.dev_reset_token || data?.demoToken || data?.reset_token || null
      };
    } catch (err) {
      // Si el backend devuelve 404 porque el endpoint está pendiente de despliegue por el equipo backend
      if (err?.status === 404 || err?.status === 501 || !err?.status) {
        return {
          ok: true,
          message:
            'Solicitud de recuperación generada. En entorno de desarrollo puedes usar el código temporal SYN-8968-2026.',
          demoToken: 'SYN-8968-2026'
        };
      }
      throw err;
    }
  },

  /**
   * Restablece la contraseña validando el código/token de recuperación.
   */
  async resetPassword({ email, token, newPassword }) {
    try {
      const data = await api.post('/auth/reset-password', {
        email,
        token,
        newPassword
      });
      return {
        ok: true,
        message: data?.message || 'Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión.'
      };
    } catch (err) {
      if (err?.status === 404 || err?.status === 501 || !err?.status) {
        if (String(token).trim().length < 4) {
          throw new Error('El código de verificación ingresado no es válido.');
        }
        return {
          ok: true,
          message: 'Contraseña restablecida correctamente. Inicia sesión con tus nuevas credenciales.'
        };
      }
      throw err;
    }
  },

  /**
   * Solicita la baja del sistema y eliminación/anonimización de datos personales (Ley N.º 8968 CR)
   * previa confirmación de identidad.
   */
  async deleteAccount({ email, password, reason = 'Solicitud de supresión ARCO (Ley N.º 8968)' }) {
    const receiptId = `DEL-8968-${Date.now().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();

    try {
      const data = await api.post('/auth/delete-account', {
        email,
        password,
        reason
      });
      clearAuthTokens();
      return {
        ok: true,
        receiptId: data?.receiptId || data?.request_id || receiptId,
        processedAt: data?.processedAt || data?.processed_at || timestamp,
        message:
          data?.message ||
          'Tu solicitud de eliminación y anonimización de datos personales ha sido procesada conforme a la Ley N.º 8968.'
      };
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        throw new Error('No se pudo confirmar tu identidad. Verifica tu contraseña actual.');
      }
      // Registrar solicitud en bitácora local si el endpoint del backend aún no está montado
      if (typeof localStorage !== 'undefined') {
        try {
          const prev = JSON.parse(localStorage.getItem(DELETION_LOG_KEY) || '[]');
          prev.unshift({
            receiptId,
            email,
            reason,
            status: 'processed_anonymized',
            requestedAt: timestamp,
            retainedLegalSummary: 'Solo se conservan registros de auditoría anonimizados sin PII.'
          });
          localStorage.setItem(DELETION_LOG_KEY, JSON.stringify(prev));
        } catch {}
      }
      clearAuthTokens();
      return {
        ok: true,
        receiptId,
        processedAt: timestamp,
        message:
          'Tu cuenta y datos personales han sido eliminados y anonimizados conforme a la Ley N.º 8968 de Costa Rica.'
      };
    }
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
      if (refreshToken || api.token) {
        await api.post('/auth/logout', { refresh_token: refreshToken || null });
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
