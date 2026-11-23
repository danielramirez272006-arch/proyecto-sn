const aiAgentsHubService = require('./ai-agents-hub-service');
const authService = require('../modules/auth/auth-service');
const adminService = require('../modules/admin-control/admin-service');
const petVerificationService = require('../modules/admin-control/pet-verification-service');
const multisourcePlacesCoordinator = require('../modules/places/multisource-places-coordinator');
const multisourceAdminService = require('../modules/places/multisource-admin-service');
const clientDashboardService = require('../modules/client-dashboard/client-service');

module.exports = {
  aiAgentsHubService,
  authService,
  adminService,
  petVerificationService,
  multisourcePlacesCoordinator,
  multisourceAdminService,
  clientDashboardService,
};
