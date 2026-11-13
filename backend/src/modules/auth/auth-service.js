const crypto = require('node:crypto');
const { query, execute } = require('../../shared/config/database');
const { generateToken, generateRefreshToken, verifyToken } = require('../../shared/middlewares/auth-role-guard');
const auditService = require('../../shared/audit/audit-service');

class AuthService {
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password, storedHash) {
    if (!storedHash) return false;

    // Formato PBKDF2 robusto (salt:hash)
    if (storedHash.includes(':')) {
      const [salt, key] = storedHash.split(':');
      const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
      try {
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(key, 'hex'));
      } catch (e) {
        return false;
      }
    }

    // Compatibilidad con hashes simples de desarrollo / semillas SQL
    if (storedHash.startsWith('sha256_')) {
      const legacy = `sha256_${crypto.createHash('sha256').update(password).digest('hex')}`;
      return legacy === storedHash;
    }

    const simpleHash = crypto.createHash('sha256').update(password).digest('hex');
    return simpleHash === storedHash;
  }

  async login(email, password, req = null) {
    const rows = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows || rows.length === 0) {
      throw new Error('INVALID_CREDENTIALS');
    }
    const user = rows[0];

    if (!this.verifyPassword(password, user.password_hash)) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = generateToken(tokenPayload, '2h');
    const refreshToken = generateRefreshToken(tokenPayload, '30d');

    // Registrar token de refresco en la base de datos
    const tokenId = `rt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    try {
      await execute(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
        VALUES (?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP)
      `, [tokenId, user.id, tokenHash, expiresAt]);
    } catch (dbErr) {
      // Ignorar si la tabla aún se está migrando
    }

    await auditService.record({
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'users',
      resourceId: user.id,
      details: { email: user.email, role: user.role },
      req
    });

    return {
      token,
      refresh_token: refreshToken,
      expires_in: 7200, // 2 horas
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    };
  }

  async register({ name, email, password, role = 'client' }, req = null) {
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing && existing.length > 0) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    const id = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const pbkdf2Hash = this.hashPassword(password || 'secret');

    await execute(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, email, pbkdf2Hash, role]
    );

    const tokenPayload = { id, email, role, name };
    const token = generateToken(tokenPayload, '2h');
    const refreshToken = generateRefreshToken(tokenPayload, '30d');

    await auditService.record({
      userId: id,
      action: 'USER_REGISTERED',
      resource: 'users',
      resourceId: id,
      details: { name, email, role },
      req
    });

    return {
      token,
      refresh_token: refreshToken,
      expires_in: 7200,
      user: { id, name, email, role }
    };
  }

  async refreshSession(refreshToken, req = null) {
    if (!refreshToken) {
      throw new Error('REFRESH_TOKEN_REQUIRED');
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded || !decoded.is_refresh) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const rows = await query('SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = FALSE', [tokenHash]);

    // Rotación de token: revocar token anterior si existe en BD
    if (rows && rows.length > 0) {
      await execute('UPDATE refresh_tokens SET revoked = TRUE WHERE id = ?', [rows[0].id]);
    }

    const tokenPayload = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };

    const newAccessToken = generateToken(tokenPayload, '2h');
    const newRefreshToken = generateRefreshToken(tokenPayload, '30d');

    const newTokenId = `rt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    try {
      await execute(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
        VALUES (?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP)
      `, [newTokenId, decoded.id, newTokenHash, expiresAt]);
    } catch (e) {}

    await auditService.record({
      userId: decoded.id,
      action: 'TOKEN_REFRESHED',
      resource: 'auth',
      resourceId: decoded.id,
      details: { rotated: true },
      req
    });

    return {
      token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: 7200,
      user: tokenPayload
    };
  }

  async logout(refreshToken, req = null) {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await execute('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?', [tokenHash]);
    }

    if (req?.user?.id) {
      await auditService.record({
        userId: req.user.id,
        action: 'USER_LOGOUT',
        resource: 'users',
        resourceId: req.user.id,
        req
      });
    }

    return { success: true, message: 'Sesión cerrada correctamente' };
  }

  async createGuestSession(alias = '') {
    const guestId = `gst_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const guestAlias = alias && alias.trim() ? alias.trim() : `Invitado-${crypto.randomBytes(2).toString('hex')}`;
    const guestToken = `gst_tok_${crypto.randomBytes(16).toString('hex')}`;

    return {
      guest_id: guestId,
      guest_name: guestAlias,
      guest_token: guestToken,
      role: 'guest',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  async getMe(authHeader = '', guestToken = '') {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.replace(/^Bearer\s+/, '');
      const decoded = verifyToken(rawToken);
      if (decoded) {
        return {
          authenticated: true,
          type: 'registered_user',
          user: decoded
        };
      }
    }

    if (guestToken) {
      return {
        authenticated: true,
        type: 'guest_session',
        user: {
          id: guestToken,
          name: 'Invitado Temporal',
          role: 'guest'
        }
      };
    }

    return {
      authenticated: false,
      type: 'anonymous',
      user: null
    };
  }
}

module.exports = new AuthService();
