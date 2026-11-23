const clientService = require('./client-service');
const { success, unauthorized } = require('../../shared/utils/http-response');

class ClientDashboardController {
  async getVault(req, res) {
    if (!req.user?.id) {
      return unauthorized(res, 'Se requiere sesión iniciada para consultar tu perfil');
    }
    const vault = await clientService.getVault(req.user.id);
    return success(res, vault);
  }

  async updateVault(req, res) {
    if (!req.user?.id) {
      return unauthorized(res, 'Se requiere sesión iniciada para actualizar tu perfil');
    }
    const updated = await clientService.updateVault(req.user.id, req.body);
    return success(res, updated);
  }

  async getOverview(req, res) {
    const userId = req.user?.id || 'usr_client_1';
    const overview = await clientService.getOverview(userId);
    return success(res, overview);
  }
}

module.exports = new ClientDashboardController();
