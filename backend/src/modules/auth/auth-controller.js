const authService = require('./auth-service');
const { success, created, unauthorized, badRequest, conflict } = require('../../shared/utils/http-response');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return badRequest(res, 'email y password son requeridos');
      if (!EMAIL_REGEX.test(String(email).trim())) return badRequest(res, 'El formato del correo electrónico no es válido');

      const result = await authService.login(email, password, req);
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
      const { refresh_token } = req.body;
      if (!refresh_token) return badRequest(res, 'refresh_token es requerido');

      const result = await authService.refreshSession(refresh_token, req);
      return success(res, result);
    } catch (err) {
      if (err.message === 'INVALID_REFRESH_TOKEN' || err.message === 'REFRESH_TOKEN_REQUIRED') {
        return unauthorized(res, 'Token de refresco inválido o revocado');
      }
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const { refresh_token } = req.body;
      const result = await authService.logout(refresh_token, req);
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
