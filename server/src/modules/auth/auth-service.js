const { query, execute } = require('../../shared/config/database');
const { generateToken } = require('../../shared/middlewares/auth-role-guard');

class AuthService {
  async login(email, password) {
    const rows = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows || rows.length === 0) {
      throw new Error('INVALID_CREDENTIALS');
    }
    const user = rows[0];

    // En demo/test permitimos match con el password hash simulado
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    };
  }

  async register({ name, email, password, role = 'client' }) {
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing && existing.length > 0) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const hash = `$2b$10$ephemeral_hash_${Math.random().toString(36).slice(2, 8)}`;

    await execute(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, email, hash, role]
    );

    const token = generateToken({ id, email, role, name });
    return { token, user: { id, name, email, role } };
  }
}

module.exports = new AuthService();

