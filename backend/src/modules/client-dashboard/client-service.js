const { query, execute } = require('../../shared/config/database');

function safeJsonParse(raw, fallback) {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

class ClientDashboardService {
  constructor() {
    this.vaults = new Map();
  }

  async _loadFromDb(userId) {
    try {
      const rows = await query('SELECT * FROM user_vaults WHERE user_id = ? LIMIT 1', [userId]);
      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          user_id: row.user_id,
          pets: safeJsonParse(row.pets_json, []),
          vehicle_plate_digit: row.vehicle_plate_digit !== null && row.vehicle_plate_digit !== undefined
            ? Number(row.vehicle_plate_digit)
            : null,
          saved_routes: safeJsonParse(row.saved_routes_json, []),
          expenses_total_crc: Number(row.expenses_total_crc) || 0,
          badges: safeJsonParse(row.badges_json, []),
          updated_at: row.updated_at || new Date().toISOString()
        };
      }
    } catch {
      // Tabla aún no migrada o entorno en memoria
    }
    return null;
  }

  async _saveToDb(vault) {
    const now = vault.updated_at || new Date().toISOString();
    try {
      const existing = await query('SELECT user_id FROM user_vaults WHERE user_id = ? LIMIT 1', [vault.user_id]);
      if (existing && existing.length > 0) {
        await execute(
          `UPDATE user_vaults
           SET pets_json = ?, vehicle_plate_digit = ?, saved_routes_json = ?,
               expenses_total_crc = ?, badges_json = ?, updated_at = ?
           WHERE user_id = ?`,
          [
            JSON.stringify(vault.pets || []),
            vault.vehicle_plate_digit ?? null,
            JSON.stringify(vault.saved_routes || []),
            Number(vault.expenses_total_crc) || 0,
            JSON.stringify(vault.badges || []),
            now,
            vault.user_id
          ]
        );
      } else {
        await execute(
          `INSERT INTO user_vaults
           (user_id, pets_json, vehicle_plate_digit, saved_routes_json, expenses_total_crc, badges_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            vault.user_id,
            JSON.stringify(vault.pets || []),
            vault.vehicle_plate_digit ?? null,
            JSON.stringify(vault.saved_routes || []),
            Number(vault.expenses_total_crc) || 0,
            JSON.stringify(vault.badges || []),
            now,
            now
          ]
        );
      }
    } catch {
      // Respaldo silencioso en memoria si la tabla aún no existe
    }
  }

  async getVault(userId) {
    const persisted = await this._loadFromDb(userId);
    if (persisted) {
      this.vaults.set(userId, persisted);
      return persisted;
    }

    if (!this.vaults.has(userId)) {
      let realExpenses = 0;
      const registeredPets = [];
      const plateDigit = null;
      const realBadges = [];

      try {
        const userRows = await query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [userId]);
        if (userRows && userRows.length > 0) {
          realBadges.push('ciudadano_registrado');
        }

        const plansRows = await query(
          'SELECT count(*) as total_plans FROM plans WHERE organizer_id = ? AND status = ?',
          [userId, 'confirmed']
        );
        if (plansRows && plansRows[0]?.total_plans > 0) {
          realBadges.push('organizador_activo');
          realExpenses = Number(plansRows[0].total_plans) * 8500;
        }

        const votesRows = await query(
          'SELECT count(*) as total_votes FROM plan_votes WHERE guest_id = ?',
          [userId]
        );
        if (votesRows && votesRows[0]?.total_votes > 0) {
          realBadges.push('votante_comunitario');
        }
      } catch {
        // En caso de modo en memoria o fallo de BD
      }

      const initialVault = {
        user_id: userId,
        pets: registeredPets,
        vehicle_plate_digit: plateDigit,
        saved_routes: [],
        expenses_total_crc: realExpenses,
        badges: realBadges,
        updated_at: new Date().toISOString()
      };
      this.vaults.set(userId, initialVault);
    }

    return this.vaults.get(userId);
  }

  async updateVault(userId, updates) {
    const current = await this.getVault(userId);
    const updated = {
      ...current,
      ...updates,
      user_id: userId,
      updated_at: new Date().toISOString()
    };
    this.vaults.set(userId, updated);
    await this._saveToDb(updated);
    return updated;
  }

  async getOverview(userId) {
    const vault = await this.getVault(userId);

    const crDateStr = new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' });
    const crDate = new Date(crDateStr);
    const today = crDate.getDay();

    const plateRestrictions = {
      1: [1, 2],
      2: [3, 4],
      3: [5, 6],
      4: [7, 8],
      5: [9, 0],
    };

    const hasPlate = vault.vehicle_plate_digit !== null && vault.vehicle_plate_digit !== undefined;
    const restrictedToday = hasPlate && (plateRestrictions[today] || []).includes(vault.vehicle_plate_digit);

    return {
      user_id: userId,
      registered_pets_count: vault.pets?.length || 0,
      vehicle_plate_digit: vault.vehicle_plate_digit,
      has_vehicular_restriction_today: Boolean(restrictedToday),
      active_badges: vault.badges || [],
      expenses_total_crc: vault.expenses_total_crc || 0,
      calculated_at: new Date().toISOString(),
      timezone: 'America/Costa_Rica'
    };
  }
}

module.exports = new ClientDashboardService();
