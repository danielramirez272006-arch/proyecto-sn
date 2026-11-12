const authService = require('./auth-service');
const { success, created, unauthorized, badRequest, conflict } = require('../../shared/utils/http-response');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return badRequest(res, 'email y password son requeridos');

      const result = await authService.login(email, password);
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
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) return badRequest(res, 'name, email y password son requeridos');

      const result = await authService.register({ name, email, password, role });
      return created(res, result);
    } catch (err) {
      if (err.message === 'EMAIL_ALREADY_REGISTERED') {
        return conflict(res, 'El correo electrónico ya se encuentra registrado');
      }
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

