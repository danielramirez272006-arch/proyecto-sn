const clientService = require('./client-service');
const { success } = require('../../shared/utils/http-response');

class ClientDashboardController {
  async getVault(req, res) {
    const userId = req.user?.id || 'usr_client_1';
    const vault = await clientService.getVault(userId);
    return success(res, vault);
  }

  async updateVault(req, res) {
    const userId = req.user?.id || 'usr_client_1';
    const updated = await clientService.updateVault(userId, req.body);
    return success(res, updated);
  }

  async getOverview(req, res) {
    const userId = req.user?.id || 'usr_client_1';
    const overview = await clientService.getOverview(userId);
    return success(res, overview);
  }
}

module.exports = new ClientDashboardController();
