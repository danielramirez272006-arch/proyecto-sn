const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env-config');
const { unauthorized, forbidden } = require('../utils/http-response');

// Registro en memoria de tokens JWT revocados (por jti o hash de token) y marca de tiempo de revocación por usuario
const revokedTokenIds = new Set();
const revokedUsersCutoffMs = new Map();
let lastTokenIssuedMs = 0;

function nextMonotonicMs() {
  const now = Date.now();
  lastTokenIssuedMs = now > lastTokenIssuedMs ? now : lastTokenIssuedMs + 1;
  return lastTokenIssuedMs;
}

function revokeAccessToken(rawTokenOrJti) {
  if (!rawTokenOrJti) return false;
  const clean = String(rawTokenOrJti).replace(/^Bearer\s+/i, '').trim();
  if (!clean) return false;

  revokedTokenIds.add(clean);
  try {
    const decoded = jwt.decode(clean);
    if (decoded?.jti) {
      revokedTokenIds.add(decoded.jti);
    }
  } catch {}
  return true;
}

function revokeAllUserAccessTokens(userId) {
  if (!userId) return false;
  revokedUsersCutoffMs.set(String(userId), nextMonotonicMs());
  return true;
}

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
  business_owner: [PERMISSIONS.PLANS_CREATE, PERMISSIONS.PLANS_VOTE],
  organizer: [PERMISSIONS.PLANS_CREATE, PERMISSIONS.PLANS_VOTE, PERMISSIONS.PLANS_CONFIRM],
  client: [PERMISSIONS.PLANS_CREATE, PERMISSIONS.PLANS_VOTE],
  guest: [PERMISSIONS.PLANS_VOTE]
};

function getPermissionsForRole(role = 'client') {
  return [...(ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.client || [])];
}

function verifyToken(token) {
  try {
    const clean = String(token || '').replace(/^Bearer\s+/i, '').trim();
    if (!clean || revokedTokenIds.has(clean)) {
      return null;
    }
    const decoded = jwt.verify(clean, env.jwtSecret);
    if (decoded?.jti && revokedTokenIds.has(decoded.jti)) {
      return null;
    }
    if (decoded?.id && revokedUsersCutoffMs.has(String(decoded.id))) {
      const cutoffMs = revokedUsersCutoffMs.get(String(decoded.id));
      const tokenIssuedMs = Number(decoded.issued_at_ms) || (Number(decoded.iat) * 1000) || 0;
      if (tokenIssuedMs <= cutoffMs) {
        return null;
      }
    }
    return decoded;
  } catch (err) {
    return null;
  }
}

function authenticateOptional(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const guestHeader = req.headers['x-guest-token'] || req.headers['X-Guest-Token'];

  req.user = null;
  req.guestToken = null;

  if (guestHeader) {
    req.guestToken = String(guestHeader).trim();
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded && !decoded.is_refresh) {
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
  getPermissionsForRole,
  verifyToken,
  authenticateOptional,
  requireAuth,
  requireRole,
  requirePermission,
  requireAdmin: requireRole(['admin']),
  revokeAccessToken,
  revokeAllUserAccessTokens,
  generateToken: (payload, expiresIn = '1h') => {
    const issuedAtMs = nextMonotonicMs();
    const jti = payload?.jti || `jti_${issuedAtMs}_${crypto.randomBytes(4).toString('hex')}`;
    return jwt.sign({ ...payload, jti, issued_at_ms: issuedAtMs }, env.jwtSecret, { expiresIn });
  },
  generateRefreshToken: (payload, expiresIn = '30d') => {
    const issuedAtMs = nextMonotonicMs();
    const jti = payload?.jti || `rt_${issuedAtMs}_${crypto.randomBytes(4).toString('hex')}`;
    return jwt.sign({ ...payload, jti, issued_at_ms: issuedAtMs, is_refresh: true }, env.jwtSecret, { expiresIn });
  },
};
