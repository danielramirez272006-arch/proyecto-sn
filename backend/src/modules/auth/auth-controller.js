const authService = require('./auth-service');
const env = require('../../shared/config/env-config');
const { success, created, unauthorized, badRequest, conflict } = require('../../shared/utils/http-response');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFRESH_COOKIE_NAME = 'sn_refresh_token';

function parseCookieValue(cookieHeader, name) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

function setRefreshCookie(res, refreshToken) {
  if (!refreshToken || typeof res.setHeader !== 'function') return;
  const secureFlag = env.isProd ? '; Secure' : '';
  const cookie = `${REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=2592000${secureFlag}`;
  res.setHeader('Set-Cookie', cookie);
}

function clearRefreshCookie(res) {
  if (typeof res.setHeader !== 'function') return;
  const secureFlag = env.isProd ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${REFRESH_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=0${secureFlag}`);
}

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return badRequest(res, 'email y password son requeridos');
      if (!EMAIL_REGEX.test(String(email).trim())) return badRequest(res, 'El formato del correo electrónico no es válido');

      const result = await authService.login(email, password, req);
      setRefreshCookie(res, result.refresh_token);
      return success(res, result);
    } catch (err) {
      if (err.message === 'INVALID_CREDENTIALS') {
        return unauthorized(res, 'Credenciales de acceso inválidas');
      }
      next(err);
    }
  }

  async register(req, res, next) {
    try {
      const {
        name, email, password, phone, zone, hasPet, pet,
        acceptTerms, acceptPrivacy, termsVersion, cookiesPreferences
      } = req.body || {};
      if (!name || !email || !password) return badRequest(res, 'name, email y password son requeridos');
      if (!EMAIL_REGEX.test(String(email).trim())) return badRequest(res, 'El formato del correo electrónico no es válido');
      const strength = authService.validatePasswordStrength(password);
      if (!strength.valid) return badRequest(res, strength.message);
      if (acceptTerms !== true || acceptPrivacy !== true) {
        return badRequest(res, 'Debes aceptar los Términos y Condiciones (acceptTerms: true) y la Política de Privacidad (acceptPrivacy: true) según la Ley N.º 8968.');
      }

      const result = await authService.register(
        { name, email, password, role: 'client', phone, zone, hasPet, pet, termsVersion, cookiesPreferences },
        req
      );
      setRefreshCookie(res, result.refresh_token);
      return created(res, result);
    } catch (err) {
      if (err.message === 'EMAIL_ALREADY_REGISTERED') {
        return conflict(res, 'El correo electrónico ya se encuentra registrado');
      }
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.body?.refresh_token || parseCookieValue(req.headers?.cookie, REFRESH_COOKIE_NAME);
      if (!refreshToken) return badRequest(res, 'refresh_token es requerido');

      const result = await authService.refreshSession(refreshToken, req);
      setRefreshCookie(res, result.refresh_token);
      return success(res, result);
    } catch (err) {
      if (err.message === 'INVALID_REFRESH_TOKEN' || err.message === 'REFRESH_TOKEN_REQUIRED') {
        clearRefreshCookie(res);
        return unauthorized(res, 'Token de refresco inválido o revocado');
      }
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const refreshToken = req.body?.refresh_token || parseCookieValue(req.headers?.cookie, REFRESH_COOKIE_NAME);
      const result = await authService.logout(refreshToken, req);
      clearRefreshCookie(res);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      const guestToken = req.headers['x-guest-token'];
      const info = await authService.getMe(authHeader, guestToken);
      return success(res, info);
    } catch (err) {
      next(err);
    }
  }

  async createGuestSession(req, res, next) {
    try {
      const { alias } = req.body || {};
      const session = await authService.createGuestSession(alias);
      return created(res, session);
    } catch (err) {
      next(err);
    }
  }

  async webauthnVerify(req, res) {
    if (env.isProd) {
      return res.status(501).json({
        ok: false,
        data: null,
        error: {
          code: 'WEBAUTHN_NOT_ENABLED',
          message: 'La verificación WebAuthn simulada está deshabilitada en producción.'
        }
      });
    }
    return success(res, {
      verified: true,
      credential_id: 'webauthn_passkey_cr_simulated',
      user: { id: 'usr_admin_1', role: 'admin', name: 'Admin Sistema' }
    });
  }

  async guestSync(req, res) {
    return success(res, {
      synced: true,
      guest_token: req.headers['x-guest-token'] || 'tok_anonymous_guest',
      timestamp: new Date().toISOString()
    });
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body || {};
      if (!email || !EMAIL_REGEX.test(String(email).trim())) {
        return badRequest(res, 'Debes proporcionar un correo electrónico válido.');
      }
      const result = await authService.forgotPassword(email, req);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { email, token, newPassword } = req.body || {};
      if (!email || !token || !newPassword) {
        return badRequest(res, 'email, token y newPassword son requeridos.');
      }
      if (!EMAIL_REGEX.test(String(email).trim())) {
        return badRequest(res, 'El formato del correo electrónico no es válido.');
      }
      const strength = authService.validatePasswordStrength(newPassword);
      if (!strength.valid) {
        return badRequest(res, strength.message);
      }
      const result = await authService.resetPassword({ email, token, newPassword }, req);
      return success(res, result);
    } catch (err) {
      if (err.message === 'INVALID_RESET_TOKEN' || err.message === 'EXPIRED_RESET_TOKEN') {
        return badRequest(res, 'El código de recuperación es inválido o ha expirado.');
      }
      next(err);
    }
  }

  async deleteAccount(req, res, next) {
    try {
      const { password, reason } = req.body || {};
      if (!password) {
        return badRequest(res, 'Debes confirmar tu contraseña actual (password) para eliminar tu cuenta.');
      }
      const result = await authService.deleteAccount(req.user.id, { password, reason }, req);
      return success(res, result);
    } catch (err) {
      if (err.message === 'INVALID_CREDENTIALS') {
        return unauthorized(res, 'La contraseña de confirmación es incorrecta.');
      }
      if (err.message === 'USER_NOT_FOUND') {
        return badRequest(res, 'Cuenta no encontrada.');
      }
      next(err);
    }
  }
}

module.exports = new AuthController();
