const jwt = require('jsonwebtoken');
const env = require('../config/env-config');
const { unauthorized, forbidden } = require('../utils/http-response');

const PERMISSIONS = {
  PLANS_CREATE: 'plans:create',
  PLANS_VOTE: 'plans:vote',
  PLANS_CONFIRM: 'plans:confirm',
  EVENTS_PUBLISH: 'events:publish',
  EVENTS_CANCEL: 'events:cancel',
  PLACES_VERIFY: 'places:verify',
  ADMIN_TELEMETRY: 'admin:telemetry',
  ADMIN_AGENTS: 'admin:agents',
};

const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  merchant: [PERMISSIONS.PLANS_CREATE, PERMISSIONS.PLANS_VOTE],
  organizer: [PERMISSIONS.PLANS_CREATE, PERMISSIONS.PLANS_VOTE, PERMISSIONS.PLANS_CONFIRM],
  client: [PERMISSIONS.PLANS_CREATE, PERMISSIONS.PLANS_VOTE],
  guest: [PERMISSIONS.PLANS_VOTE]
};

function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (err) {
    return null;
  }
}

function authenticateOptional(req, res, next) {
  const authHeader = req.headers.authorization;
  const guestHeader = req.headers['x-guest-token'];

  req.user = null;
  req.guestToken = null;

  if (guestHeader) {
    req.guestToken = String(guestHeader).trim();
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
}

function requireAuth(req, res, next) {
  authenticateOptional(req, res, () => {
    if (!req.user) {
      return unauthorized(res, 'Se requiere inicio de sesión para realizar esta acción');
    }
    next();
  });
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!allowedRoles.includes(req.user.role)) {
        return forbidden(res, `Acceso restringido. Se requiere rol: ${allowedRoles.join(', ')}`);
      }
      next();
    });
  };
}

function requirePermission(requiredPermission) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      const userRole = req.user.role || 'client';
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];
      if (!userPermissions.includes(requiredPermission)) {
        return forbidden(res, `Permiso insuficiente: Se requiere [${requiredPermission}] para ejecutar esta operación.`);
      }
      next();
    });
  };
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  verifyToken,
  authenticateOptional,
  requireAuth,
  requireRole,
  requirePermission,
  requireAdmin: requireRole(['admin']),
  generateToken: (payload, expiresIn = '1h') => jwt.sign(payload, env.jwtSecret, { expiresIn }),
  generateRefreshToken: (payload, expiresIn = '30d') => jwt.sign({ ...payload, is_refresh: true }, env.jwtSecret, { expiresIn }),
};
