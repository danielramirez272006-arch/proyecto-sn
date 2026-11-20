const crypto = require('node:crypto');
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

  async _ensurePetPhotoColumn() {
    if (this._photoColChecked) return;
    try {
      await execute('ALTER TABLE user_pets ADD COLUMN photo_url TEXT').catch(() => {});
    } catch (_) {}
    this._photoColChecked = true;
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
        ).catch(() => {});
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
        ).catch(() => {});
      }
    } catch {
      // Respaldo silencioso en memoria si las columnas opcionales no existen
    }
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

      const vRows = await query('SELECT * FROM user_vaults WHERE user_id = ? LIMIT 1', [userId]).catch(() => []);
      vaultRow = vRows?.[0] || null;

      petRows = await query('SELECT * FROM user_pets WHERE user_id = ? ORDER BY created_at ASC', [userId]).catch(() => []);

      const plansRows = await query(
        'SELECT count(*) as total_plans FROM plans WHERE organizer_id = ? AND status = ?',
        [userId, 'confirmed']
      ).catch(() => []);
      if (plansRows && Number(plansRows[0]?.total_plans) > 0) {
        realBadges.push('organizador_activo');
        realExpenses = Number(plansRows[0].total_plans) * 8500;
      }

      const votesRows = await query(
        'SELECT count(*) as total_votes FROM plan_votes WHERE guest_id = ?',
        [userId]
      ).catch(() => []);
      if (votesRows && Number(votesRows[0]?.total_votes) > 0) {
        realBadges.push('votante_comunitario');
      }
    } catch (_) {
      // Continuar con fallback en memoria si DB no está lista
    }

    const memCached = this.vaults.get(userId);

    let interests = ['Cafeterías de especialidad', 'Terrazas al aire libre'];
    if (vaultRow?.interests_json) {
      interests = safeJsonParse(vaultRow.interests_json, interests);
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
      preferences = { ...preferences, ...safeJsonParse(vaultRow.preferences_json, {}) };
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
      microchipId: p.microchip_id || '',
      colorManto: p.color_coat || 'Variado',
      foto: p.photo_url || null,
      photoUrl: p.photo_url || null,
      alergias: p.allergies_text
        ? String(p.allergies_text).split(',').map((s) => s.trim()).filter(Boolean)
        : []
    }));

    const jsonPets = vaultRow?.pets_json ? safeJsonParse(vaultRow.pets_json, []) : [];
    const finalPets =
      mappedPets.length > 0
        ? mappedPets
        : jsonPets.length > 0
        ? jsonPets
        : memCached?.pets || [];

    const hasPet =
      vaultRow?.has_pet !== undefined && vaultRow?.has_pet !== null
        ? Boolean(vaultRow.has_pet)
        : finalPets.length > 0;

    const plateDigit =
      vaultRow?.vehicle_plate_digit !== null && vaultRow?.vehicle_plate_digit !== undefined
        ? Number(vaultRow.vehicle_plate_digit)
        : memCached?.vehicle_plate_digit ?? null;

    const savedRoutes = vaultRow?.saved_routes_json
      ? safeJsonParse(vaultRow.saved_routes_json, [])
      : memCached?.saved_routes || [];

    const persistedBadges = vaultRow?.badges_json
      ? safeJsonParse(vaultRow.badges_json, [])
      : [];

    const finalBadges =
      persistedBadges.length > 0
        ? persistedBadges
        : memCached?.badges?.length > 0
        ? memCached.badges
        : realBadges;

    const finalExpenses =
      vaultRow?.expenses_total_crc !== undefined && vaultRow?.expenses_total_crc !== null && Number(vaultRow.expenses_total_crc) > 0
        ? Number(vaultRow.expenses_total_crc)
        : memCached?.expenses_total_crc ?? realExpenses;

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
      vehicle_plate_digit: plateDigit,
      saved_routes: savedRoutes,
      expenses_total_crc: finalExpenses,
      badges: finalBadges,
      updated_at: vaultRow?.updated_at || memCached?.updated_at || new Date().toISOString()
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
    const nextSavedRoutes = Array.isArray(updates.saved_routes) ? updates.saved_routes : current.saved_routes;
    const nextExpenses = updates.expenses_total_crc !== undefined ? Number(updates.expenses_total_crc) : current.expenses_total_crc;
    const nextBadges = Array.isArray(updates.badges) ? updates.badges : current.badges;

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
        ).catch(() => {});
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
        ).catch(() => {});
      }

      // Si viene información de mascota individual desde el frontend, guardarla o actualizarla
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
              incomingPet.microchipId || incomingPet.microchip_id || null,
              incomingPet.colorManto || incomingPet.color_coat || 'Variado',
              allergiesStr,
              finalPhoto,
              existingPets[0].id
            ]
          ).catch(() => {});
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
              incomingPet.microchipId || incomingPet.microchip_id || null,
              incomingPet.colorManto || incomingPet.color_coat || 'Variado',
              allergiesStr,
              incomingPhoto
            ]
          ).catch(() => {});
        }
      }
    } catch (_) {
      // Fallback en memoria abajo
    }

    const memNext = {
      ...current,
      ...updates,
      user_id: userId,
      has_pet: nextHasPet,
      pets: Array.isArray(updates.pets) ? updates.pets : current.pets,
      budget_level: nextBudget,
      interests: nextInterests,
      preferences: nextPrefs,
      vehicle_plate_digit: nextPlateDigit,
      saved_routes: nextSavedRoutes,
      expenses_total_crc: nextExpenses,
      badges: nextBadges,
      updated_at: new Date().toISOString()
    };
    this.vaults.set(userId, memNext);
    await this._saveToDb(memNext);

    const refreshed = await this.getVault(userId);
    const mergedFinal = {
      ...refreshed,
      pets: Array.isArray(updates.pets) ? updates.pets : refreshed.pets,
      pet: (Array.isArray(updates.pets) ? updates.pets[0] : refreshed.pet) || null,
      vehicle_plate_digit: nextPlateDigit,
      saved_routes: nextSavedRoutes,
      expenses_total_crc: nextExpenses,
      badges: nextBadges,
      updated_at: memNext.updated_at
    };
    this.vaults.set(userId, mergedFinal);
    return mergedFinal;
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
      5: [9, 0]
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
