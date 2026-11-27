const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const env = require('../../shared/config/env-config');
const { query, execute } = require('../../shared/config/database');
const {
  generateToken,
  generateRefreshToken,
  verifyToken,
  getPermissionsForRole,
  revokeAccessToken,
  revokeAllUserAccessTokens
} = require('../../shared/middlewares/auth-role-guard');
const auditService = require('../../shared/audit/audit-service');
const emailClient = require('../../shared/clients/email-client');
const { encryptColumnValue, decryptColumnValue } = require('../../models');

// Cuentas exclusivas administrativas y usuarios demo de desarrollo
const DEFAULT_ACCOUNTS = [
  {
    id: 'usr_admin_gotox',
    name: 'Administrador Synodos',
    email: process.env.ADMIN_EMAIL || 'admin@gotox.cr',
    password: process.env.ADMIN_PASSWORD || 'AdminGoToX2026!',
    role: 'admin',
    gpsTrustScore: 100,
    zone: 'Centro de Mando GAM, San José',
    hasPet: false
  },
  {
    id: 'usr_admin_1',
    name: 'Admin Sistema SN',
    email: 'admin@ejemplo.cr',
    password: process.env.ADMIN_PASSWORD || 'AdminGoToX2026!',
    role: 'admin',
    gpsTrustScore: 100,
    zone: 'San José Centro',
    hasPet: false
  },
  {
    id: 'usr_client_mariana',
    name: 'Mariana Rojas',
    email: 'mariana.rojas@gotox.cr',
    password: process.env.DEMO_USER_PASSWORD || 'GoToX2026!',
    role: 'client',
    gpsTrustScore: 95,
    phone: '+506 8832-9011',
    zone: 'Barrio Escalante, San José',
    hasPet: true,
    pet: {
      id: 'PET-CR-9820-BRUNO',
      name: 'Bruno',
      species: 'Canino',
      breed: 'Golden Retriever',
      weight_kg: 29.4,
      age_years: 3,
      microchip_id: 'CRC-756-092-882-991',
      color_coat: 'Dorado Claro',
      photo_url: '/imagenes/copiloto-bruno.jpg'
    }
  },
  {
    id: 'usr_client_1',
    name: 'Carlos Alvarado',
    email: 'carlos@ejemplo.cr',
    password: process.env.DEMO_USER_PASSWORD || 'Cliente2026!',
    role: 'client',
    gpsTrustScore: 80,
    phone: '+506 8810-4455',
    zone: 'Los Yoses, Montes de Oca',
    hasPet: false
  }
];

const COMMON_WEAK_PASSWORDS = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890',
  'password', 'qwerty', 'qwerty123', 'admin', 'admin123',
  'contraseña', 'contrasena', 'letmein', '11111111', '00000000',
  'abc12345', 'welcome1', 'iloveyou', 'synodos', 'gotox123'
]);

class AuthService {
  _getTargetRounds() {
    const configured = Number(env.security?.bcryptRounds || (env.isTest ? 10 : 12));
    return Math.max(10, Math.min(14, Number.isFinite(configured) ? configured : 12));
  }

  _getPepper() {
    return String(env.security?.passwordPepper || '').trim();
  }

  _applyPepper(password, pepper = this._getPepper()) {
    const raw = String(password);
    if (!pepper) return raw;
    // HMAC-SHA256 con pepper secreto elimina el límite de 72 bytes de bcrypt y protege ante filtrado de BD
    return crypto.createHmac('sha256', pepper).update(raw).digest('base64');
  }

  validatePasswordStrength(password) {
    const raw = String(password || '');
    if (raw.length < 8) {
      return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
    }
    if (raw.length > 128) {
      return { valid: false, message: 'La contraseña no puede superar los 128 caracteres.' };
    }
    if (COMMON_WEAK_PASSWORDS.has(raw.trim().toLowerCase())) {
      return { valid: false, message: 'Esta contraseña es demasiado común. Elige una combinación más segura.' };
    }
    const hasLetter = /[a-zA-Z]/.test(raw);
    const hasNumber = /\d/.test(raw);
    if (!hasLetter || !hasNumber) {
      return { valid: false, message: 'La contraseña debe incluir al menos una letra y un número.' };
    }
    return { valid: true, message: null };
  }

  _needsHashUpgrade(storedHash) {
    const raw = String(storedHash || '');
    if (!raw) return false;
    const pepper = this._getPepper();
    const targetRounds = this._getTargetRounds();

    if (pepper) {
      if (!raw.startsWith('v2p$')) return true;
      const inner = raw.slice(4);
      const match = inner.match(/^\$2[aby]\$(\d{2})\$/);
      return !match || parseInt(match[1], 10) < targetRounds;
    }

    const match = raw.match(/^\$2[aby]\$(\d{2})\$/);
    return !match || parseInt(match[1], 10) < targetRounds;
  }

  hashPassword(password) {
    const rounds = this._getTargetRounds();
    const pepper = this._getPepper();
    const material = this._applyPepper(password, pepper);
    const hashed = bcrypt.hashSync(material, rounds);
    return pepper ? `v2p$${hashed}` : hashed;
  }

  verifyPassword(password, storedHash) {
    if (!storedHash) return false;
    const raw = String(storedHash);

    // 0. Formato endurecido v2p$: HMAC-SHA256(pepper) + bcrypt cost 12
    if (raw.startsWith('v2p$')) {
      const pepper = this._getPepper();
      if (!pepper) return false;
      try {
        return bcrypt.compareSync(this._applyPepper(password, pepper), raw.slice(4));
      } catch {
        return false;
      }
    }

    // 1. Formato estándar bcrypt ($2a$ / $2b$ / $2y$)
    if (raw.startsWith('$2a$') || raw.startsWith('$2b$') || raw.startsWith('$2y$')) {
      try {
        return bcrypt.compareSync(String(password), raw);
      } catch {
        return false;
      }
    }

    // 2. Fallback PBKDF2 previo (salt:hash)
    if (raw.includes(':')) {
      const [salt, key] = raw.split(':');
      const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
      try {
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(key, 'hex'));
      } catch {
        return false;
      }
    }

    // 3. Compatibilidad con hashes simples de desarrollo / semillas SQL (comparación tiempo constante)
    if (raw.startsWith('sha256_')) {
      const legacy = `sha256_${crypto.createHash('sha256').update(String(password)).digest('hex')}`;
      const a = Buffer.from(legacy, 'utf8');
      const b = Buffer.from(raw, 'utf8');
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    const simpleHash = crypto.createHash('sha256').update(String(password)).digest('hex');
    const a = Buffer.from(simpleHash, 'utf8');
    const b = Buffer.from(raw, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async ensureDefaultAccounts() {
    if (!env.isTest && this._defaultAccountsEnsured) {
      return;
    }

    // En producción jamás sembrar cuentas demo con contraseñas conocidas; solo bootstrap admin si está explícito en entorno
    const accountsToEnsure = env.isProd
      ? (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD
          ? [
              {
                id: 'usr_admin_gotox',
                name: process.env.ADMIN_NAME || 'Administrador Synodos',
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD,
                role: 'admin',
                gpsTrustScore: 100,
                zone: 'Centro de Mando GAM, San José',
                hasPet: false,
              },
            ]
          : [])
      : DEFAULT_ACCOUNTS;

    let allSucceeded = true;
    for (const acc of accountsToEnsure) {
      try {
        const normalizedEmail = acc.email.trim().toLowerCase();
        const existing = await query('SELECT id, password_hash, role FROM users WHERE LOWER(email) = ? OR id = ?', [
          normalizedEmail,
          acc.id
        ]);

        let targetUserId = acc.id;

        if (!existing || existing.length === 0) {
          const passwordHash = this.hashPassword(acc.password);
          await execute(
            `INSERT INTO users (id, name, email, password_hash, role, gps_trust_score)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [acc.id, acc.name, normalizedEmail, passwordHash, acc.role, acc.gpsTrustScore || 80]
          );
        } else {
          targetUserId = existing[0].id;
          const storedHash = existing[0].password_hash || '';
          const isPlaceholderHash =
            storedHash.startsWith('$2b$10$ephemeral_') || storedHash.startsWith('sha256_mock');

          if (isPlaceholderHash) {
            const realHash = this.hashPassword(acc.password);
            await execute('UPDATE users SET password_hash = ?, role = ? WHERE id = ?', [
              realHash,
              acc.role,
              targetUserId
            ]);
          }
        }

        // Inicializar bóveda y mascota por defecto si aún no existen
        const vaultRows = await query('SELECT user_id FROM user_vaults WHERE user_id = ?', [targetUserId]).catch(() => null);
        if (vaultRows && vaultRows.length === 0) {
          await this._saveInitialUserVaultAndPet(targetUserId, {
            phone: acc.phone || null,
            zone: acc.zone || 'San José, Costa Rica',
            hasPet: acc.hasPet !== false,
            pet: acc.pet || null
          });
        } else if (acc.pet?.photo_url) {
          await this._ensurePetPhotoColumn();
          await execute(
            'UPDATE user_pets SET photo_url = ? WHERE user_id = ? AND (photo_url IS NULL OR photo_url = "")',
            [acc.pet.photo_url, targetUserId]
          ).catch(() => {});
        }
      } catch (err) {
        allSucceeded = false;
        // Ignorar si las tablas aún no están migradas durante algún unit test aislado
      }
    }
    if (!env.isTest && allSucceeded) {
      this._defaultAccountsEnsured = true;
    }
  }

  async _ensurePetPhotoColumn() {
    if (this._photoColChecked) return;
    const alterStatements = [
      'ALTER TABLE user_pets ADD COLUMN photo_url TEXT',
      'ALTER TABLE user_vaults ADD COLUMN phone VARCHAR(64)',
      'ALTER TABLE user_vaults ADD COLUMN zone VARCHAR(120)',
      'ALTER TABLE user_vaults ADD COLUMN has_pet INTEGER DEFAULT 1',
      "ALTER TABLE user_vaults ADD COLUMN budget_level VARCHAR(32) DEFAULT 'medio'",
      'ALTER TABLE user_vaults ADD COLUMN interests_json TEXT',
      'ALTER TABLE user_vaults ADD COLUMN preferences_json TEXT'
    ];
    for (const sql of alterStatements) {
      await execute(sql).catch(() => {});
    }
    this._photoColChecked = true;
  }

  async _saveInitialUserVaultAndPet(userId, { phone = null, zone = null, hasPet = false, pet = null } = {}) {
    try {
      await this._ensurePetPhotoColumn();
      const hasPetFlag = hasPet ? 1 : 0;
      await execute(
        `INSERT INTO user_vaults (user_id, phone, zone, has_pet, budget_level, interests_json, preferences_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          phone || null,
          zone || 'Barrio Escalante, San José',
          hasPetFlag,
          'medio',
          JSON.stringify(['Cafeterías de especialidad', 'Terrazas al aire libre']),
          JSON.stringify({
            notificacionesLluvia: true,
            notificacionesAcusticas: true,
            notificacionesEventos: false,
            compartirUbicacion: true
          })
        ]
      ).catch(() => {});

      const petName = pet?.name || pet?.nombre;
      if (hasPet && petName && String(petName).trim()) {
        const petId = pet.id || `pet_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const photoUrl = pet.foto || pet.photoUrl || pet.photo_url || pet.imagen || null;
        await execute(
          `INSERT INTO user_pets (id, user_id, name, species, breed, weight_kg, age_years, microchip_id, color_coat, allergies_text, photo_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            petId,
            userId,
            String(petName).trim(),
            pet.species || pet.especie || 'Canino',
            pet.breed || pet.raza || 'Mestizo',
            Number(pet.weight_kg || pet.pesoKg || 15),
            Number(pet.age_years || pet.edadAnos || 2),
            encryptColumnValue(pet.microchip_id || pet.microchipId || null),
            pet.color_coat || pet.colorManto || 'Variado',
            Array.isArray(pet.alergias) ? pet.alergias.join(', ') : (pet.allergies_text || pet.alergias || null),
            photoUrl
          ]
        ).catch(() => {});
      }
    } catch (_) {
      // Continuar de forma segura si la tabla aún no existe
    }
  }

  async _loadUserProfileDetails(userId) {
    try {
      await this._ensurePetPhotoColumn();
      const vaultRows = await query('SELECT * FROM user_vaults WHERE user_id = ?', [userId]).catch(() => []);
      const petRows = await query('SELECT * FROM user_pets WHERE user_id = ? ORDER BY created_at ASC', [userId]).catch(() => []);
      const vault = vaultRows?.[0] || null;
      const primaryPet = petRows?.[0] || null;

      return {
        phone: vault?.phone || null,
        zone: vault?.zone || 'San José, Costa Rica',
        hasPet: vault ? Boolean(vault.has_pet) : Boolean(primaryPet),
        pets: petRows || [],
        pet: primaryPet
          ? {
              id: primaryPet.id,
              nombre: primaryPet.name,
              especie: primaryPet.species || 'Canino',
              raza: primaryPet.breed || 'Mestizo',
              pesoKg: Number(primaryPet.weight_kg || 15),
              edadAnos: Number(primaryPet.age_years || 2),
              microchipId: decryptColumnValue(primaryPet.microchip_id) || '',
              colorManto: primaryPet.color_coat || 'Variado',
              foto: primaryPet.photo_url || null,
              photoUrl: primaryPet.photo_url || null,
              alergias: primaryPet.allergies_text
                ? String(primaryPet.allergies_text).split(',').map((s) => s.trim()).filter(Boolean)
                : []
            }
          : null
      };
    } catch (_) {
      return {
        phone: null,
        zone: 'San José, Costa Rica',
        hasPet: false,
        pets: [],
        pet: null
      };
    }
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
    await this.ensureDefaultAccounts();

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const rows = await query('SELECT * FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
    if (!rows || rows.length === 0) {
      throw new Error('INVALID_CREDENTIALS');
    }
    const user = rows[0];

    if (!this.verifyPassword(password, user.password_hash)) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Auto-upgrade transparente de hashes legacy (SHA-256 / PBKDF2 / bcrypt cost < 12 / sin pepper)
    if (this._needsHashUpgrade(user.password_hash)) {
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

    const profileDetails = await this._loadUserProfileDetails(user.id);

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
        ...profileDetails
      }
    };
  }

  async register({
    name,
    email,
    password,
    role = 'client',
    phone = null,
    zone = null,
    hasPet = false,
    pet = null,
    termsVersion = '2026-11-v2',
    cookiesPreferences = null,
  }, req = null) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(name || '').trim();
    // El registro público siempre asigna 'client' (o 'business_owner'); nunca 'admin'
    const safeRole = role === 'business_owner' ? 'business_owner' : 'client';

    const existing = await query('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
    if (existing && existing.length > 0) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    const id = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const bcryptHash = this.hashPassword(password || 'secret');

    await execute(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [id, cleanName, normalizedEmail, bcryptHash, safeRole]
    );

    // Relación 3FN en user_roles + registro de consentimiento Ley N.º 8968
    await execute(
      `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
      [id, `role_${safeRole}`]
    ).catch(() => {});

    const consentId = `cns_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const ipAddress = req?.socket?.remoteAddress || null;
    const userAgent = req?.headers?.['user-agent'] || null;
    await execute(
      `INSERT INTO user_consents
       (id, user_id, terms_version, privacy_accepted, cookies_preferences_json, ip_address, user_agent)
       VALUES (?, ?, ?, TRUE, ?, ?, ?)`,
      [
        consentId,
        id,
        termsVersion,
        cookiesPreferences ? JSON.stringify(cookiesPreferences) : null,
        ipAddress,
        userAgent,
      ]
    ).catch(() => {});

    const hasPetEffective = Boolean(hasPet && (pet?.name || pet?.nombre));
    await this._saveInitialUserVaultAndPet(id, {
      phone,
      zone,
      hasPet: hasPetEffective,
      pet
    });

    const tokenPayload = { id, email: normalizedEmail, role: safeRole, name: cleanName };
    const token = generateToken(tokenPayload, '2h');
    const refreshToken = generateRefreshToken(tokenPayload, '30d');

    await this._saveRefreshToken(id, refreshToken);

    await auditService.record({
      userId: id,
      action: 'USER_REGISTERED',
      resource: 'users',
      resourceId: id,
      details: { name: cleanName, email: normalizedEmail, role: safeRole, hasPet: hasPetEffective },
      req
    });

    const profileDetails = await this._loadUserProfileDetails(id);

    // Correo de bienvenida no bloqueante (Brevo en producción / local en dev-test)
    const welcomeTemplateId = parseInt(
      process.env.BREVO_WELCOME_TEMPLATE_ID || String(env.email?.welcomeTemplateId || '0'),
      10
    ) || null;
    const safeWelcomeName = cleanName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    emailClient.sendMail({
      to: normalizedEmail,
      toName: cleanName,
      subject: '¡Bienvenido a Synodos Pet OS!',
      text: `¡Pura vida, ${cleanName}! Tu cuenta en Synodos Pet OS ya está activa. Explora terrazas pet-friendly, el Mapa GAM y el Copiloto Argos en ${env.frontendUrl}.`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid #E5D5E0;"><div style="background:#501228;padding:24px 28px;color:#FFFFFF;"><h2 style="margin:0;font-size:22px;">¡Pura vida, ${safeWelcomeName}!</h2><p style="margin:6px 0 0;color:#F5D8E2;font-size:13px;">Synodos Pet OS · Costa Rica</p></div><div style="height:4px;background:#1DA481;"></div><div style="padding:24px 28px;color:#1F2937;font-size:14.5px;line-height:1.6;"><p style="margin:0 0 14px;">Tu cuenta ya está lista para descubrir <strong>terrazas pet-friendly verificadas</strong>, consultar el clima del GAM y conversar con <strong>Argos</strong>.</p><p style="margin:0;"><a href="${env.frontendUrl}" style="display:inline-block;background:#501228;color:#FFFFFF;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px;">Explorar Synodos &rarr;</a></p></div></div>`,
      templateId: welcomeTemplateId,
      params: { NAME: cleanName, APP_URL: env.frontendUrl },
      idempotencyKey: `welcome_${id}`,
      tags: ['auth', 'welcome'],
    }).catch((mailErr) => {
      console.warn('[Auth] No se pudo enviar correo de bienvenida:', mailErr.message);
    });

    return {
      token,
      refresh_token: refreshToken,
      expires_in: 7200,
      user: {
        id,
        name: cleanName,
        email: normalizedEmail,
        role: safeRole,
        permissions: getPermissionsForRole(safeRole),
        ...profileDetails
      }
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

    const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
    if (authHeader) {
      revokeAccessToken(authHeader);
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

    return { success: true, access_token_revoked: Boolean(authHeader), message: 'Sesión cerrada correctamente' };
  }

  async purgeExpiredRefreshTokens() {
    const nowSql = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await execute(
      `DELETE FROM refresh_tokens WHERE revoked = TRUE OR expires_at < ?`,
      [nowSql]
    );
    return { purged_at: nowSql };
  }

  /**
   * Flujo de recuperación de contraseña (genera token temporal de 15 min hasheado en BD)
   */
  async forgotPassword(email, req = null) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const rows = await query('SELECT id, name, email FROM users WHERE LOWER(email) = ?', [normalizedEmail]);

    // Respuesta neutra para no revelar si el correo existe en producción
    if (!rows || rows.length === 0) {
      return {
        sent: true,
        expires_in_minutes: 15,
        message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.'
      };
    }

    const user = rows[0];
    // Código seguro de 8 caracteres sensibles a mayúsculas/minúsculas (sin 0/O/1/I/l) en formato estricto XXXX-XXXX (~111 billones de combinaciones)
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let rawChars = '';
    for (let i = 0; i < 8; i += 1) {
      rawChars += alphabet[crypto.randomInt(0, alphabet.length)];
    }
    const rawToken = `${rawChars.slice(0, 4)}-${rawChars.slice(4)}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenId = `prt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // Invalidar cualquier código previo activo de este usuario para que solo exista 1 código vigente a la vez
    await execute(
      `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL`,
      [user.id]
    ).catch(() => {});
    if (this._resetFailCounts) {
      this._resetFailCounts.delete(user.id);
    }

    await execute(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
      [tokenId, user.id, tokenHash, expiresAt]
    );

    const outboxId = `ntf_reset_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const resetSubject = 'Recuperación de contraseña — Synodos Pet OS';
    const resetUrl = `${env.frontendUrl}/acceso?reset_token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(user.email)}`;
    const resetText = [
      `Hola ${user.name || 'explorador'},`,
      '',
      'Solicitaste restablecer tu contraseña en Synodos Pet OS.',
      `Tu código temporal (válido por 15 minutos) es: ${rawToken}`,
      '',
      `Ingresa a ${resetUrl} para completar el cambio.`,
      'Si no realizaste esta solicitud, puedes ignorar este correo de forma segura.'
    ].join('\n');

    const safeName = String(user.name || 'explorador')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const resetHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
        <h2 style="margin: 0 0 12px; color: #38bdf8;">Synodos Pet OS</h2>
        <p style="margin: 0 0 16px; color: #cbd5e1;">Hola <strong>${safeName}</strong>, solicitaste restablecer tu contraseña.</p>
        <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">Tu código temporal (válido por 15 minutos):</p>
        <div style="padding: 14px 16px; background: #1e293b; border: 1px solid #334155; border-radius: 10px; font-family: monospace; font-size: 16px; letter-spacing: 1px; color: #f8fafc; word-break: break-all;">
          ${rawToken}
        </div>
        <p style="margin: 18px 0 0; font-size: 12px; color: #94a3b8;">Si no realizaste esta solicitud, puedes ignorar este correo.</p>
      </div>
    `.trim();

    await execute(
      `INSERT INTO notification_outbox (id, recipient_email, subject, body, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [outboxId, user.email, resetSubject, resetText]
    ).catch(() => {});

    // Envío transaccional directo (Brevo API v3 cuando BREVO_API_KEY está configurada; modo local si aún no)
    const resetTemplateId = parseInt(
      process.env.BREVO_RESET_TEMPLATE_ID || String(env.email?.resetTemplateId || '0'),
      10
    ) || null;
    try {
      const mailResult = await emailClient.sendMail({
        to: user.email,
        toName: user.name || '',
        subject: resetSubject,
        text: resetText,
        html: resetHtml,
        templateId: resetTemplateId,
        params: {
          NAME: user.name || 'explorador',
          RESET_CODE: rawToken,
          RESET_URL: resetUrl,
        },
        idempotencyKey: outboxId,
        tags: ['auth', 'password-reset'],
      });
      if (mailResult && mailResult.provider === 'brevo') {
        await execute(
          `UPDATE notification_outbox SET status = 'sent' WHERE id = ?`,
          [outboxId]
        ).catch(() => {});
      }
    } catch (mailErr) {
      console.warn('[Auth] No se pudo enviar correo de recuperación vía proveedor:', mailErr.message);
    }

    await auditService.record({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'password_reset_tokens',
      resourceId: tokenId,
      details: { expires_at: expiresAt },
      req
    }).catch(() => {});

    const response = {
      sent: true,
      expires_in_minutes: 15,
      message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.'
    };
    if (!env.isProd) {
      response.dev_reset_token = rawToken;
    }
    return response;
  }

  async resetPassword({ email, token, newPassword }, req = null) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const userRows = await query('SELECT id, email FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
    if (!userRows || userRows.length === 0) {
      throw new Error('INVALID_RESET_TOKEN');
    }
    const user = userRows[0];
    const cleanToken = String(token || '').trim();
    const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
    const nowSql = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const tokenRows = await query(
      `SELECT id, expires_at, used_at FROM password_reset_tokens
       WHERE user_id = ? AND token_hash = ? AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, tokenHash]
    );

    if (!tokenRows || tokenRows.length === 0) {
      if (!this._resetFailCounts) this._resetFailCounts = new Map();
      const fails = (this._resetFailCounts.get(user.id) || 0) + 1;
      this._resetFailCounts.set(user.id, fails);
      // Tras 5 intentos fallidos, quemar todos los códigos activos del usuario para frenar fuerza bruta
      if (fails >= 5) {
        await execute(
          `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL`,
          [user.id]
        ).catch(() => {});
        this._resetFailCounts.delete(user.id);
      }
      throw new Error('INVALID_RESET_TOKEN');
    }
    if (this._resetFailCounts) {
      this._resetFailCounts.delete(user.id);
    }

    const record = tokenRows[0];
    const expiresStr = record.expires_at instanceof Date
      ? record.expires_at.toISOString().replace('T', ' ').slice(0, 19)
      : String(record.expires_at);
    if (expiresStr < nowSql) {
      throw new Error('EXPIRED_RESET_TOKEN');
    }

    const newHash = this.hashPassword(newPassword);
    await execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newHash, user.id]
    );
    await execute(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?',
      [record.id]
    );
    await execute(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?',
      [user.id]
    ).catch(() => {});
    revokeAllUserAccessTokens(user.id);

    await auditService.record({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'users',
      resourceId: user.id,
      details: { sessions_revoked: true },
      req
    }).catch(() => {});

    return {
      reset: true,
      sessions_revoked: true,
      message: 'Contraseña actualizada correctamente. Inicia sesión con tu nueva clave.'
    };
  }

  /**
   * Baja del sistema y eliminación/anonimización de datos personales (Ley N.º 8968 CR)
   */
  async deleteAccount(userId, { password, reason = 'Solicitud del titular (Ley N.º 8968)' } = {}, req = null) {
    const rows = await query('SELECT id, email, name, password_hash FROM users WHERE id = ?', [userId]);
    if (!rows || rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }
    const user = rows[0];

    if (!this.verifyPassword(password, user.password_hash)) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const reqId = `del_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const originalEmail = user.email;
    const anonymizedEmail = `deleted_${user.id}@anonymized.gotox.local`;
    const retainedSummary = 'Registros inmutables de auditoría (audit_trail / audit_chain_ledger) conservados de forma anonimizada por obligación legal.';

    await execute(
      `INSERT INTO data_deletion_requests
       (id, user_id, email, reason, status, retained_legal_summary, processed_at)
       VALUES (?, ?, ?, ?, 'completed', ?, CURRENT_TIMESTAMP)`,
      [reqId, user.id, originalEmail, reason, retainedSummary]
    );

    // Eliminar datos personales en tablas satélites y revocar sesiones
    await execute('DELETE FROM user_pets WHERE user_id = ?', [user.id]).catch(() => {});
    await execute('DELETE FROM user_vaults WHERE user_id = ?', [user.id]).catch(() => {});
    await execute('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]).catch(() => {});
    revokeAllUserAccessTokens(user.id);
    await execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]).catch(() => {});
    await execute('DELETE FROM user_roles WHERE user_id = ?', [user.id]).catch(() => {});
    await execute('DELETE FROM ai_chat_messages WHERE user_id = ?', [user.id]).catch(() => {});

    // Anonimizar fila principal de users para preservar integridad referencial de auditoría
    await execute(
      `UPDATE users
       SET name = 'Usuario Eliminado (Ley 8968)',
           email = ?,
           password_hash = 'ACCOUNT_DELETED_REVOKED',
           role = 'guest',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [anonymizedEmail, user.id]
    );

    const outboxId = `ntf_del_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await execute(
      `INSERT INTO notification_outbox (id, recipient_email, subject, body, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [
        outboxId,
        originalEmail,
        'Confirmación de eliminación de datos personales (Ley N.º 8968) — Synodos',
        `Tu solicitud (${reqId}) fue procesada. Tus datos personales y sesiones fueron eliminados/anonimizados.`
      ]
    ).catch(() => {});

    await auditService.record({
      userId: user.id,
      action: 'ACCOUNT_DELETED_LEY_8968',
      resource: 'data_deletion_requests',
      resourceId: reqId,
      details: { anonymized: true },
      req
    }).catch(() => {});

    return {
      request_id: reqId,
      status: 'completed',
      deleted_or_anonymized: ['users', 'user_pets', 'user_vaults', 'refresh_tokens', 'password_reset_tokens', 'user_roles', 'ai_chat_messages'],
      retained_legal_summary: retainedSummary,
      processed_at: new Date().toISOString()
    };
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
        let userRecord = {
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
            userRecord = rows[0];
          }
        } catch (dbErr) {
          // Mantener datos del JWT si la consulta no aplica en este contexto
        }

        const profileDetails = await this._loadUserProfileDetails(userRecord.id);

        return {
          authenticated: true,
          type: 'registered_user',
          user: {
            ...userRecord,
            permissions: getPermissionsForRole(userRecord.role),
            ...profileDetails
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
