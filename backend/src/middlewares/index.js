const authRoleGuard = require('../shared/middlewares/auth-role-guard');
const rateLimiter = require('../shared/middlewares/rate-limiter');
const securityHeaders = require('../shared/middlewares/security-headers');
const errorHandler = require('../shared/middlewares/error-handler');
const requestTracer = require('../shared/middlewares/request-tracer');
const { validateBody } = require('./input-validator');

module.exports = {
  ...authRoleGuard,
  rateLimiter,
  securityHeaders,
  errorHandler,
  requestTracer,
  validateBody,
};
