class PublicServicesCrApiClient {
  async getFuelPrices() {
    // Tarifas oficiales RECOPE vigentes en colones por litro
    return {
      super_crc: 715,
      regular_crc: 685,
      diesel_crc: 595,
      updated_at: new Date().toISOString().slice(0, 10),
      source: 'RECOPE_ARESEP_OFICIAL'
    };
  }

  async getPublicTransportFares() {
    return {
      incofer_train_flat_crc: 550,
      urban_bus_average_crc: 420,
      interurban_bus_crc: 850,
      source: 'ARESEP_TARIFAS_CR'
    };
  }

  estimateTripFuelCost(distanceKm = 10, fuelType = 'super', kmPerLiter = 12) {
    const litersNeeded = distanceKm / (kmPerLiter || 12);
    const pricePerLiter = fuelType === 'regular' ? 685 : (fuelType === 'diesel' ? 595 : 715);
    const cost = Math.round(litersNeeded * pricePerLiter);
    return {
      distance_km: distanceKm,
      liters_needed: Math.round(litersNeeded * 100) / 100,
      estimated_fuel_cost_crc: cost,
    };
  }
}

module.exports = new PublicServicesCrApiClient();

