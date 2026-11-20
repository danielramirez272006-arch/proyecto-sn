const crypto = require('node:crypto');
const env = require('../../shared/config/env-config');
const { query, execute } = require('../../shared/config/database');
const { generateToken, generateRefreshToken, verifyToken, getPermissionsForRole } = require('../../shared/middlewares/auth-role-guard');
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

  async _saveRefreshToken(userId, refreshToken) {
    const tokenId = `rt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    try {
      await execute(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
        VALUES (?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP)
      `, [tokenId, userId, tokenHash, expiresAt]);
    } catch (dbErr) {
      // Ignorar si la tabla aún se está migrando
    }
  }

  async login(email, password, req = null) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const rows = await query('SELECT * FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
    if (!rows || rows.length === 0) {
      throw new Error('INVALID_CREDENTIALS');
    }
    const user = rows[0];

    if (!this.verifyPassword(password, user.password_hash)) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Auto-upgrade transparente de hashes legacy (SHA-256 sin sal) a PBKDF2-SHA512 con sal aleatoria
    if (user.password_hash && !String(user.password_hash).includes(':')) {
      const upgradedHash = this.hashPassword(password);
      await execute(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [upgradedHash, user.id]
      ).catch(() => {});
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = generateToken(tokenPayload, '2h');
    const refreshToken = generateRefreshToken(tokenPayload, '30d');

    await this._saveRefreshToken(user.id, refreshToken);

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
        permissions: getPermissionsForRole(user.role),
      }
    };
  }

  async register({ name, email, password, role = 'client' }, req = null) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(name || '').trim();
    const safeRole = role === 'business_owner' ? 'business_owner' : 'client';

    const existing = await query('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
    if (existing && existing.length > 0) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    const id = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const pbkdf2Hash = this.hashPassword(password || 'secret');

    await execute(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [id, cleanName, normalizedEmail, pbkdf2Hash, safeRole]
    );

    const tokenPayload = { id, email: normalizedEmail, role: safeRole, name: cleanName };
    const token = generateToken(tokenPayload, '2h');
    const refreshToken = generateRefreshToken(tokenPayload, '30d');

    await this._saveRefreshToken(id, refreshToken);

    await auditService.record({
      userId: id,
      action: 'USER_REGISTERED',
      resource: 'users',
      resourceId: id,
      details: { name: cleanName, email: normalizedEmail, role: safeRole },
      req
    });

    return {
      token,
      refresh_token: refreshToken,
      expires_in: 7200,
      user: { id, name: cleanName, email: normalizedEmail, role: safeRole, permissions: getPermissionsForRole(safeRole) }
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
    const rows = await query('SELECT * FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);

    if (rows && rows.length > 0) {
      if (rows[0].revoked) {
        throw new Error('INVALID_REFRESH_TOKEN');
      }
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

    await this._saveRefreshToken(decoded.id, newRefreshToken);

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
      user: {
        ...tokenPayload,
        permissions: getPermissionsForRole(tokenPayload.role),
      }
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
      if (decoded && !decoded.is_refresh) {
        let userInfo = {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role || 'client',
        };

        try {
          const rows = await query(
            'SELECT id, name, email, role, gps_trust_score FROM users WHERE id = ?',
            [decoded.id]
          );
          if (rows && rows.length > 0) {
            userInfo = rows[0];
          }
        } catch (dbErr) {
          // Mantener datos del JWT si la consulta no aplica en este contexto
        }

        return {
          authenticated: true,
          type: 'registered_user',
          user: {
            ...userInfo,
            permissions: getPermissionsForRole(userInfo.role),
          }
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
          role: 'guest',
          permissions: getPermissionsForRole('guest'),
        }
      };
    }

    return {
      authenticated: false,
      type: 'anonymous',
      user: null,
      permissions: [],
    };
  }

  async ensureBootstrapAdmin({
    email = env.adminBootstrap.email,
    password = env.adminBootstrap.password,
    name = env.adminBootstrap.name,
  } = {}) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const rawPassword = String(password || '');
    const cleanName = String(name || 'Admin Sistema GoToX').trim();

    if (!normalizedEmail || !rawPassword) {
      return { skipped: true, reason: 'ADMIN_BOOTSTRAP_NOT_CONFIGURED' };
    }

    const existing = await query('SELECT id, role, password_hash FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
    const pbkdf2Hash = this.hashPassword(rawPassword);

    if (!existing || existing.length === 0) {
      const id = `usr_admin_${crypto.randomBytes(4).toString('hex')}`;
      await execute(
        `INSERT INTO users (id, name, email, password_hash, role, gps_trust_score)
         VALUES (?, ?, ?, ?, 'admin', 100)`,
        [id, cleanName, normalizedEmail, pbkdf2Hash]
      );
      return { created: true, updated: false, id, email: normalizedEmail, role: 'admin' };
    }

    const current = existing[0];
    const hasPlaceholderHash = String(current.password_hash || '').startsWith('$2b$10$ephemeral_hash_');

    if (current.role !== 'admin' || hasPlaceholderHash) {
      await execute(
        `UPDATE users SET role = 'admin', password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [hasPlaceholderHash ? pbkdf2Hash : current.password_hash, current.id]
      );
      return { created: false, updated: true, id: current.id, email: normalizedEmail, role: 'admin' };
    }

    return { created: false, updated: false, id: current.id, email: normalizedEmail, role: 'admin' };
  }
}

module.exports = new AuthService();
