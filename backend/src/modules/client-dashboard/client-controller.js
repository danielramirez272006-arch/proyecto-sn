const clientService = require('./client-service');
const { success } = require('../../shared/utils/http-response');

class ClientDashboardController {
  getVault(req, res) {
    const userId = req.user?.id || 'usr_client_1';
    return success(res, clientService.getVault(userId));
  }

  updateVault(req, res) {
    const userId = req.user?.id || 'usr_client_1';
    const updated = clientService.updateVault(userId, req.body);
    return success(res, updated);
  }

  getOverview(req, res) {
    const userId = req.user?.id || 'usr_client_1';
    return success(res, clientService.getOverview(userId));
  }
}

module.exports = new ClientDashboardController();
