function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class RouteOptimizerService {
  /**
   * Calcula la distancia total acumulada de una secuencia de paradas
   */
  calculateSequenceDistance(stops) {
    let total = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (a.lat && a.lng && b.lat && b.lng) {
        total += calculateDistance(Number(a.lat), Number(a.lng), Number(b.lat), Number(b.lng));
      }
    }
    return Math.round(total * 100) / 100;
  }

  /**
   * Optimiza el orden de paradas para minimizar tiempo y distancia en el GAM
   */
  optimizeItinerary(stops = []) {
    if (!Array.isArray(stops) || stops.length <= 2) {
      return {
        optimized: false,
        stops,
        message: 'Se requieren al menos 3 paradas para optimizar la ruta'
      };
    }

    const originalDistance = this.calculateSequenceDistance(stops);

    // Algoritmo Heurístico de Vecino Más Cercano (Nearest Neighbor) manteniendo la primera parada
    const unvisited = [...stops.slice(1)];
    const optimized = [stops[0]];

    let current = stops[0];

    while (unvisited.length > 0) {
      let closestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const candidate = unvisited[i];
        const dist = calculateDistance(
          Number(current.lat || 0),
          Number(current.lng || 0),
          Number(candidate.lat || 0),
          Number(candidate.lng || 0)
        );

        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      }

      const nextStop = unvisited.splice(closestIdx, 1)[0];
      optimized.push(nextStop);
      current = nextStop;
    }

    const optimizedDistance = this.calculateSequenceDistance(optimized);
    const distanceSavedKm = Math.max(0, Math.round((originalDistance - optimizedDistance) * 100) / 100);
    const percentageSaved = originalDistance > 0 
      ? Math.round((distanceSavedKm / originalDistance) * 100) 
      : 0;

    // Velocidad promedio urbana en el GAM ~25 km/h
    const minutesSaved = Math.round((distanceSavedKm / 25) * 60);
    const co2SavedGrams = Math.round(distanceSavedKm * 180); // 180 g CO2/km
    const colonesSaved = Math.round(distanceSavedKm * 70);   // ~70 CRC/km en gasolina

    return {
      optimized: true,
      original_stops_count: stops.length,
      original_distance_km: originalDistance,
      optimized_distance_km: optimizedDistance,
      distance_saved_km: distanceSavedKm,
      percentage_saved: percentageSaved,
      estimated_minutes_saved: minutesSaved,
      co2_saved_grams: co2SavedGrams,
      colones_saved: colonesSaved,
      optimized_stops: optimized.map((s, idx) => ({
        step_number: idx + 1,
        id: s.id,
        name: s.name || s.title || `Parada ${idx + 1}`,
        lat: s.lat,
        lng: s.lng,
        category: s.category || 'parada'
      })),
      traffic_advice: distanceSavedKm > 0
        ? `Ruta optimizada: Ahorras ~${distanceSavedKm} km y ~${minutesSaved} minutos evitando cruzar presas innecesarias en el GAM.`
        : 'La ruta ya se encontraba en su secuencia óptima.'
    };
  }
}

module.exports = new RouteOptimizerService();

