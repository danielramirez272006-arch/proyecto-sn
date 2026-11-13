class ClientDashboardService {
  constructor() {
    this.vaults = new Map();
  }

  getVault(userId) {
    if (!this.vaults.has(userId)) {
      this.vaults.set(userId, {
        user_id: userId,
        pets: [
          { name: 'Rocky', breed: 'Zaguate Tico', vaccines_up_to_date: true, weight_kg: 14.5 }
        ],
        vehicle_plate_digit: 5,
        saved_routes: [],
        expenses_total_crc: 24500,
        badges: ['explorador_feria_cr', 'apoyo_comunitario']
      });
    }
    return this.vaults.get(userId);
  }

  updateVault(userId, updates) {
    const current = this.getVault(userId);
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    this.vaults.set(userId, updated);
    return updated;
  }

  getOverview(userId) {
    const vault = this.getVault(userId);
    const today = new Date().getDay(); // 0 domingo, 1 lunes...
    const plateRestrictions = {
      1: [1, 2], // Lunes
      2: [3, 4], // Martes
      3: [5, 6], // Miércoles
      4: [7, 8], // Jueves
      5: [9, 0], // Viernes
    };
    const restrictedToday = (plateRestrictions[today] || []).includes(vault.vehicle_plate_digit);

    return {
      user_id: userId,
      registered_pets_count: vault.pets?.length || 0,
      vehicle_plate_digit: vault.vehicle_plate_digit,
      has_vehicular_restriction_today: restrictedToday,
      active_badges: vault.badges || [],
      expenses_total_crc: vault.expenses_total_crc || 0,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new ClientDashboardService();
