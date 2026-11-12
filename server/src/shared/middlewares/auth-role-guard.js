const jwt = require('jsonwebtoken');
const env = require('../config/env-config');
const { unauthorized, forbidden } = require('../utils/http-response');

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
    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      req.user = decoded;
    } catch (err) {
      // Token expirado o inválido; se mantiene como visitante
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

module.exports = {
  authenticateOptional,
  requireAuth,
  requireRole,
  requireAdmin: requireRole(['admin']),
  generateToken: (payload, expiresIn = '7d') => jwt.sign(payload, env.jwtSecret, { expiresIn }),
};

