const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env-config');
const { execute, query } = require('../config/database');
const { unauthorized, forbidden } = require('../utils/http-response');

// Registro en memoria + respaldo persistente en BD (revoked_tokens) para sobrevivir reinicios del servidor
const revokedTokenIds = new Set();
const revokedUsersCutoffMs = new Map();
let lastTokenIssuedMs = 0;
let revokedTableReady = false;

async function ensureRevokedTokensTable() {
  if (revokedTableReady) return;
  await execute(`
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti VARCHAR(128) PRIMARY KEY,
      expires_at TIMESTAMP NULL,
      revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});
  revokedTableReady = true;
}

async function hydrateRevokedTokensFromDb() {
  try {
    await ensureRevokedTokensTable();
    const nowSql = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await execute('DELETE FROM revoked_tokens WHERE expires_at IS NOT NULL AND expires_at < ?', [nowSql]).catch(() => {});
    const rows = await query('SELECT jti FROM revoked_tokens').catch(() => []);
    for (const row of rows || []) {
      if (row?.jti) revokedTokenIds.add(String(row.jti));
    }
    return { hydrated: (rows || []).length };
  } catch {
    return { hydrated: 0 };
  }
}

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
  let jtiKey = clean.length <= 120 ? clean : crypto.createHash('sha256').update(clean).digest('hex');
  let expiresAtSql = null;

  try {
    const decoded = jwt.decode(clean);
    if (decoded?.jti) {
      revokedTokenIds.add(decoded.jti);
      jtiKey = String(decoded.jti);
    }
    if (decoded?.exp) {
      expiresAtSql = new Date(Number(decoded.exp) * 1000).toISOString().replace('T', ' ').slice(0, 19);
    }
  } catch {}

  // Persistencia asíncrona en BD (no bloquea el flujo de respuesta)
  ensureRevokedTokensTable()
    .then(() =>
      execute(
        'INSERT INTO revoked_tokens (jti, expires_at) VALUES (?, ?) ON CONFLICT (jti) DO NOTHING',
        [jtiKey, expiresAtSql]
      )
    )
    .catch(() => {});

  return true;
}

function revokeAllUserAccessTokens(userId) {
  if (!userId) return false;
  revokedUsersCutoffMs.set(String(userId), nextMonotonicMs());
  return true;
}

function getRevocationStats() {
  return {
    revoked_tokens_count: revokedTokenIds.size,
    revoked_users_cutoff_count: revokedUsersCutoffMs.size,
    persistent_backing_table: 'revoked_tokens'
  };
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
  hydrateRevokedTokensFromDb,
  getRevocationStats,
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
