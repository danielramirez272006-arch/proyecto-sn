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
}

module.exports = new ClientDashboardService();

