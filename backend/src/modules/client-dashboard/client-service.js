const crypto = require('node:crypto');
const { query, execute } = require('../../shared/config/database');
const { encryptColumnValue, decryptColumnValue } = require('../../models');

class ClientDashboardService {
  constructor() {
    this.vaults = new Map();
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
      'ALTER TABLE user_vaults ADD COLUMN preferences_json TEXT',
      "ALTER TABLE user_vaults ADD COLUMN pets_json TEXT DEFAULT '[]'",
      "ALTER TABLE user_vaults ADD COLUMN saved_routes_json TEXT DEFAULT '[]'",
      'ALTER TABLE user_vaults ADD COLUMN expenses_total_crc NUMERIC(12, 2) DEFAULT 0',
      "ALTER TABLE user_vaults ADD COLUMN badges_json TEXT DEFAULT '[]'"
    ];
    for (const sql of alterStatements) {
      await execute(sql).catch(() => {});
    }
    this._photoColChecked = true;
  }

  async getVault(userId) {
    let userRecord = null;
    let vaultRow = null;
    let petRows = [];
    let realExpenses = 0;
    let realBadges = [];

    try {
      await this._ensurePetPhotoColumn();
      const userRows = await query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [userId]);
      if (userRows && userRows.length > 0) {
        userRecord = userRows[0];
        realBadges.push('ciudadano_registrado');
      }

      const vRows = await query('SELECT * FROM user_vaults WHERE user_id = ?', [userId]).catch(() => []);
      vaultRow = vRows?.[0] || null;

      petRows = await query('SELECT * FROM user_pets WHERE user_id = ? ORDER BY created_at ASC', [userId]).catch(() => []);

      const plansRows = await query(
        'SELECT count(*) as total_plans FROM plans WHERE organizer_id = ? AND status = ?',
        [userId, 'confirmed']
      ).catch(() => []);
      if (plansRows && plansRows[0]?.total_plans > 0) {
        realBadges.push('organizador_activo');
        realExpenses = plansRows[0].total_plans * 8500;
      }

      const votesRows = await query(
        'SELECT count(*) as total_votes FROM plan_votes WHERE guest_id = ?',
        [userId]
      ).catch(() => []);
      if (votesRows && votesRows[0]?.total_votes > 0) {
        realBadges.push('votante_comunitario');
      }
    } catch (_) {
      // Continuar con fallback en memoria si DB no está lista
    }

    const memCached = this.vaults.get(userId);

    let interests = ['Cafeterías de especialidad', 'Terrazas al aire libre'];
    if (vaultRow?.interests_json) {
      try { interests = JSON.parse(vaultRow.interests_json); } catch (_) {}
    } else if (memCached?.interests) {
      interests = memCached.interests;
    }

    let preferences = {
      notificacionesLluvia: true,
      notificacionesAcusticas: true,
      notificacionesEventos: false,
      compartirUbicacion: true
    };
    if (vaultRow?.preferences_json) {
      try { preferences = { ...preferences, ...JSON.parse(vaultRow.preferences_json) }; } catch (_) {}
    } else if (memCached?.preferences) {
      preferences = { ...preferences, ...memCached.preferences };
    }

    const mappedPets = (petRows || []).map((p) => ({
      id: p.id,
      nombre: p.name,
      especie: p.species || 'Canino',
      raza: p.breed || 'Mestizo',
      pesoKg: Number(p.weight_kg || 15),
      edadAnos: Number(p.age_years || 2),
      microchipId: decryptColumnValue(p.microchip_id) || '',
      colorManto: p.color_coat || 'Variado',
      foto: p.photo_url || null,
      photoUrl: p.photo_url || null,
      alergias: p.allergies_text
        ? String(p.allergies_text).split(',').map((s) => s.trim()).filter(Boolean)
        : []
    }));

    const finalPets = mappedPets.length > 0 ? mappedPets : (memCached?.pets || []);
    const hasPet = vaultRow !== null ? Boolean(vaultRow.has_pet) : (finalPets.length > 0);

    const result = {
      user_id: userId,
      user: userRecord
        ? {
            id: userRecord.id,
            name: userRecord.name,
            email: userRecord.email,
            role: userRecord.role,
            phone: vaultRow?.phone || memCached?.user?.phone || '',
            zone: vaultRow?.zone || memCached?.user?.zone || 'San José, Costa Rica'
          }
        : memCached?.user || null,
      has_pet: hasPet,
      pets: finalPets,
      pet: finalPets[0] || null,
      budget_level: vaultRow?.budget_level || memCached?.budget_level || 'medio',
      interests,
      preferences,
      vehicle_plate_digit: vaultRow?.vehicle_plate_digit ?? memCached?.vehicle_plate_digit ?? null,
      saved_routes: memCached?.saved_routes || [],
      expenses_total_crc: realExpenses || memCached?.expenses_total_crc || 0,
      badges: realBadges.length > 0 ? realBadges : (memCached?.badges || []),
      updated_at: vaultRow?.updated_at || new Date().toISOString()
    };

    this.vaults.set(userId, result);
    return result;
  }

  async updateVault(userId, updates = {}) {
    const current = await this.getVault(userId);

    const nextName = updates.name || updates.nombre || current.user?.name;
    const nextPhone = updates.phone !== undefined ? updates.phone : (updates.telefono !== undefined ? updates.telefono : current.user?.phone);
    const nextZone = updates.zone !== undefined ? updates.zone : (updates.ubicacionHabitual !== undefined ? updates.ubicacionHabitual : current.user?.zone);
    const nextHasPet = updates.has_pet !== undefined
      ? Boolean(updates.has_pet)
      : (updates.tieneMascota !== undefined ? Boolean(updates.tieneMascota) : current.has_pet);
    const nextBudget = updates.budget_level || updates.presupuestoHabitual || current.budget_level || 'medio';
    const nextInterests = Array.isArray(updates.interests) ? updates.interests : current.interests;
    const nextPrefs = updates.preferences ? { ...current.preferences, ...updates.preferences } : current.preferences;
    const nextPlateDigit = updates.vehicle_plate_digit !== undefined ? updates.vehicle_plate_digit : current.vehicle_plate_digit;

    try {
      if (nextName) {
        await execute('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
          String(nextName).trim(),
          userId
        ]).catch(() => {});
      }

      const existingVault = await query('SELECT user_id FROM user_vaults WHERE user_id = ?', [userId]).catch(() => []);
      if (existingVault && existingVault.length > 0) {
        await execute(
          `UPDATE user_vaults
           SET phone = ?, zone = ?, has_pet = ?, budget_level = ?, interests_json = ?, preferences_json = ?, vehicle_plate_digit = ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [
            nextPhone || null,
            nextZone || null,
            nextHasPet ? 1 : 0,
            nextBudget,
            JSON.stringify(nextInterests || []),
            JSON.stringify(nextPrefs || {}),
            nextPlateDigit,
            userId
          ]
        );
      } else {
        await execute(
          `INSERT INTO user_vaults (user_id, phone, zone, has_pet, budget_level, interests_json, preferences_json, vehicle_plate_digit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            nextPhone || null,
            nextZone || null,
            nextHasPet ? 1 : 0,
            nextBudget,
            JSON.stringify(nextInterests || []),
            JSON.stringify(nextPrefs || {}),
            nextPlateDigit
          ]
        );
      }

      // Si viene información de mascota, guardarla o actualizarla
      const incomingPet = updates.pet;
      if (incomingPet && (incomingPet.nombre || incomingPet.name)) {
        await this._ensurePetPhotoColumn();
        const petName = String(incomingPet.nombre || incomingPet.name).trim();
        const existingPets = await query('SELECT id, photo_url FROM user_pets WHERE user_id = ? ORDER BY created_at ASC', [userId]).catch(() => []);
        const allergiesStr = Array.isArray(incomingPet.alergias)
          ? incomingPet.alergias.join(', ')
          : (incomingPet.allergies_text || incomingPet.alergias || null);
        const hasIncomingPhoto = incomingPet.foto !== undefined || incomingPet.photoUrl !== undefined || incomingPet.photo_url !== undefined;
        const incomingPhoto = incomingPet.foto ?? incomingPet.photoUrl ?? incomingPet.photo_url ?? null;

        if (existingPets && existingPets.length > 0) {
          const finalPhoto = hasIncomingPhoto ? incomingPhoto : (existingPets[0].photo_url || null);
          await execute(
            `UPDATE user_pets
             SET name = ?, species = ?, breed = ?, weight_kg = ?, age_years = ?, microchip_id = ?, color_coat = ?, allergies_text = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              petName,
              incomingPet.especie || incomingPet.species || 'Canino',
              incomingPet.raza || incomingPet.breed || 'Mestizo',
              Number(incomingPet.pesoKg || incomingPet.weight_kg || 15),
              Number(incomingPet.edadAnos || incomingPet.age_years || 2),
              encryptColumnValue(incomingPet.microchipId || incomingPet.microchip_id || null),
              incomingPet.colorManto || incomingPet.color_coat || 'Variado',
              allergiesStr,
              finalPhoto,
              existingPets[0].id
            ]
          );
        } else {
          const petId = `pet_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
          await execute(
            `INSERT INTO user_pets (id, user_id, name, species, breed, weight_kg, age_years, microchip_id, color_coat, allergies_text, photo_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              petId,
              userId,
              petName,
              incomingPet.especie || incomingPet.species || 'Canino',
              incomingPet.raza || incomingPet.breed || 'Mestizo',
              Number(incomingPet.pesoKg || incomingPet.weight_kg || 15),
              Number(incomingPet.edadAnos || incomingPet.age_years || 2),
              encryptColumnValue(incomingPet.microchipId || incomingPet.microchip_id || null),
              incomingPet.colorManto || incomingPet.color_coat || 'Variado',
              allergiesStr,
              incomingPhoto
            ]
          );
        }
      }
    } catch (_) {
      // Fallback en memoria abajo
    }

    const updated = await this.getVault(userId);
    this.vaults.set(userId, updated);
    return updated;
  }

  async getOverview(userId) {
    const vault = await this.getVault(userId);

    // Calcular restricción vehicular en tiempo real según la hora y día oficial de Costa Rica
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
      has_pet: vault.has_pet,
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
