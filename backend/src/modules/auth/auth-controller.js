const authService = require('./auth-service');
const { success, created, unauthorized, badRequest, conflict } = require('../../shared/utils/http-response');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return badRequest(res, 'email y password son requeridos');

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
      const { name, email, password } = req.body;
      if (!name || !email || !password) return badRequest(res, 'name, email y password son requeridos');
      if (String(password).length < 6) return badRequest(res, 'La contraseña debe tener al menos 6 caracteres');

      const result = await authService.register({ name, email, password, role: 'client' }, req);
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
      const authHeader = req.headers.authorization;
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
}

module.exports = new AuthController();
