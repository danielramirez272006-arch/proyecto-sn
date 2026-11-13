const crypto = require('node:crypto');
const { query, execute } = require('../../shared/config/database');

// Factores oficiales de emisión Costa Rica (MINAE / IMN) en gramos de CO2 por kilómetro
const EMISSION_FACTORS_CR = {
  solo_gasoline_car: 180.0, // Línea base vehículo particular gasolina
  solo_diesel_car: 165.0,   // Vehículo particular diésel
  electric_car: 15.0,       // Vehículo eléctrico (Matriz eléctrica CR 99% renovable)
  gam_bus: 35.0,            // Autobús urbano GAM por pasajero
  incofer_train: 22.0,      // Tren Urbano Incofer por pasajero
  bicycle: 0.0,             // Bicicleta / Movilidad activa
  walking: 0.0,             // Peatonal
};

// Estimación de costo de combustible en Costa Rica (RECOPE ~700 CRC/litro, rendimiento promedio 10 km/litro)
const FUEL_COST_CRC_PER_KM = 70.0;
const TARIFA_BUS_GAM_CRC = 350.0;
const TARIFA_TREN_INCOFER_CRC = 550.0;

class CarbonFootprintService {
  /**
   * Distancia Haversine en kilómetros entre dos coordenadas GPS
   */
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  /**
   * Factores oficiales y fuentes regulatorias
   */
  getGamTransitFactors() {
    return {
      country: 'Costa Rica',
      regulatory_source: 'MINAE - Dirección de Cambio Climático & IMN',
      baseline_car_g_co2_per_km: EMISSION_FACTORS_CR.solo_gasoline_car,
      factors: EMISSION_FACTORS_CR,
      fuel_estimate_crc_per_km: FUEL_COST_CRC_PER_KM,
      grid_renewable_percentage: 99.2
    };
  }

  /**
   * Calcula el impacto ambiental, emisiones ahorradas y ahorro económico
   */
  async calculateFootprint({
    originLat,
    originLng,
    destLat,
    destLng,
    distanceKm = null,
    transportMode = 'carpool',
    passengersCount = 2,
    userId = null
  }) {
    let finalDistance = distanceKm;
    if (!finalDistance && originLat && originLng && destLat && destLng) {
      finalDistance = this.calculateDistanceKm(originLat, originLng, destLat, destLng);
    }
    if (!finalDistance || finalDistance <= 0) {
      finalDistance = 5.0; // Distancia promedio urbana en el GAM
    }

    const baselineCo2Grams = finalDistance * EMISSION_FACTORS_CR.solo_gasoline_car;
    let actualCo2Grams = 0;
    let colonesSaved = 0;
    const passengers = Math.max(1, passengersCount);

    switch (transportMode) {
      case 'carpool': {
        const factorPerPerson = EMISSION_FACTORS_CR.solo_gasoline_car / passengers;
        actualCo2Grams = finalDistance * factorPerPerson;
        // Ahorro compartido de combustible
        const totalFuelCost = finalDistance * FUEL_COST_CRC_PER_KM;
        colonesSaved = totalFuelCost * ((passengers - 1) / passengers);
        break;
      }
      case 'bus':
        actualCo2Grams = finalDistance * EMISSION_FACTORS_CR.gam_bus;
        colonesSaved = Math.max(0, (finalDistance * FUEL_COST_CRC_PER_KM) - TARIFA_BUS_GAM_CRC);
        break;
      case 'train':
        actualCo2Grams = finalDistance * EMISSION_FACTORS_CR.incofer_train;
        colonesSaved = Math.max(0, (finalDistance * FUEL_COST_CRC_PER_KM) - TARIFA_TREN_INCOFER_CRC);
        break;
      case 'bike':
      case 'walk':
        actualCo2Grams = 0;
        colonesSaved = finalDistance * FUEL_COST_CRC_PER_KM;
        break;
      case 'electric_car':
        actualCo2Grams = finalDistance * EMISSION_FACTORS_CR.electric_car;
        colonesSaved = finalDistance * (FUEL_COST_CRC_PER_KM * 0.7); // 70% ahorro vs gasolina
        break;
      default:
        actualCo2Grams = baselineCo2Grams;
        colonesSaved = 0;
        break;
    }

    const co2SavedGrams = Math.max(0, baselineCo2Grams - actualCo2Grams);
    const co2SavedKg = Math.round((co2SavedGrams / 1000) * 100) / 100;
    // Equivalente árboles: ~22 kg CO2 absorbidos por un árbol urbano al año
    const equivalentTreesAnnualFraction = Math.round((co2SavedKg / 22) * 1000) / 1000;

    // Registrar en bitácora si hay userId
    if (userId) {
      try {
        const id = `mob_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        await execute(
          `INSERT INTO user_mobility_logs 
           (id, user_id, distance_km, transport_mode, co2_saved_grams, colones_saved, passengers_count, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [id, userId, finalDistance, transportMode, co2SavedGrams, Math.round(colonesSaved), passengers]
        );
      } catch (err) {
        console.warn('[CarbonFootprintService] Error guardando log de movilidad:', err.message);
      }
    }

    return {
      distance_km: finalDistance,
      transport_mode: transportMode,
      passengers_count: passengers,
      baseline_co2_grams: Math.round(baselineCo2Grams),
      actual_co2_grams: Math.round(actualCo2Grams),
      co2_saved_grams: Math.round(co2SavedGrams),
      co2_saved_kg: co2SavedKg,
      colones_saved: Math.round(colonesSaved),
      equivalent_trees: equivalentTreesAnnualFraction,
      eco_summary: `Evitaste ${co2SavedKg} kg de CO2 y ahorraste ₡${Math.round(colonesSaved)} CRC viajando en ${transportMode}.`
    };
  }

  /**
   * Resumen de movilidad sostenible e insignias calculadas en tiempo real para un usuario
   */
  async getUserMobilityStats(userId) {
    const logs = await query(
      'SELECT * FROM user_mobility_logs WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const safeLogs = logs || [];
    const totalDistanceKm = safeLogs.reduce((acc, l) => acc + Number(l.distance_km || 0), 0);
    const totalCo2SavedGrams = safeLogs.reduce((acc, l) => acc + Number(l.co2_saved_grams || 0), 0);
    const totalColonesSaved = safeLogs.reduce((acc, l) => acc + Number(l.colones_saved || 0), 0);

    const totalCo2SavedKg = Math.round((totalCo2SavedGrams / 1000) * 100) / 100;

    // Cálculo dinámico de insignias
    const badges = [];
    if (totalCo2SavedKg >= 1.0) {
      badges.push({ code: 'tico_verde', name: 'Tico Verde 🌱', description: 'Has ahorrado más de 1 kg de CO2 en traslados urbanos' });
    }
    if (safeLogs.some(l => l.transport_mode === 'bike' || l.transport_mode === 'walk')) {
      badges.push({ code: 'cero_emisiones', name: 'Cero Emisiones 🚴', description: 'Has realizado al menos un viaje peatonal o en bicicleta' });
    }
    if (safeLogs.filter(l => l.transport_mode === 'carpool').length >= 2) {
      badges.push({ code: 'carpool_master', name: 'Carpool Master 🚗👥', description: 'Has compartido auto en múltiples salidas grupales' });
    }
    if (safeLogs.some(l => l.transport_mode === 'train')) {
      badges.push({ code: 'tren_incofer', name: 'Amigo del Tren 🚆', description: 'Optaste por el Tren Urbano Incofer para evitar presas' });
    }

    return {
      user_id: userId,
      total_trips: safeLogs.length,
      total_distance_km: Math.round(totalDistanceKm * 100) / 100,
      total_co2_saved_kg: totalCo2SavedKg,
      total_colones_saved: Math.round(totalColonesSaved),
      badges,
      recent_trips: safeLogs.slice(0, 10)
    };
  }
}

module.exports = new CarbonFootprintService();

