const { haversineDistanceKm } = require('../../shared/utils/geo-math');
const deepSeekClient = require('../../shared/config/deepseek-config');

class LostPetVisualMatcher {
  /**
   * Cruza en tiempo real una mascota perdida con la lista de mascotas avistadas o reportadas
   */
  async matchPets(lostPet, foundPetsList = [], maxDistanceKm = 5.0) {
    if (!lostPet || !Array.isArray(foundPetsList) || foundPetsList.length === 0) {
      return [];
    }

    const matches = [];

    for (const found of foundPetsList) {
      // 1. Filtrar por especie básica si está definida
      if (lostPet.species && found.species && lostPet.species.toLowerCase() !== found.species.toLowerCase()) {
        continue;
      }

      // 2. Calcular distancia geográfica
      let distanceKm = null;
      if (lostPet.lat && lostPet.lng && found.lat && found.lng) {
        distanceKm = Number(haversineDistanceKm(lostPet.lat, lostPet.lng, found.lat, found.lng).toFixed(2));
        if (distanceKm > maxDistanceKm) {
          continue;
        }
      }

      // 3. Evaluar coincidencia con DeepSeek AI si está activo
      let confidence = 50;
      let matchReason = 'Coincidencia por proximidad geográfica';

      if (deepSeekClient.isConfigured()) {
        try {
          const aiCheck = await deepSeekClient.generateJson({
            prompt: `Evalúa si estos dos reportes corresponden a la misma mascota:
REPORTE PERDIDO: ${JSON.stringify(lostPet)}
REPORTE ENCONTRADO: ${JSON.stringify(found)}`,
            systemInstruction: `Eres un veterinario y rescatista experto en identificación de animales perdidos.
Devuelve un JSON con:
- match_confidence (number de 0 a 100)
- is_probable_match (boolean)
- reason (string con la explicación detallada de similitud morfológica y pelaje)`,
            temperature: 0.1
          });

          if (aiCheck && aiCheck.match_confidence !== undefined) {
            confidence = aiCheck.match_confidence;
            matchReason = aiCheck.reason || matchReason;
          }
        } catch (_) {}
      } else {
        // Evaluación heurística de similitud de texto (raza, color, collar)
        let score = 50;
        const lostText = `${lostPet.breed || ''} ${lostPet.color || ''} ${lostPet.notes || ''}`.toLowerCase();
        const foundText = `${found.breed || ''} ${found.color || ''} ${found.notes || ''}`.toLowerCase();

        const words = lostText.split(/\s+/).filter(w => w.length > 3);
        let matchesCount = 0;
        for (const w of words) {
          if (foundText.includes(w)) matchesCount++;
        }

        score += matchesCount * 15;
        if (distanceKm !== null && distanceKm < 1.0) score += 20;
        confidence = Math.min(95, score);
        matchReason = `Similitud de características morfológicas y distancia de ${distanceKm || 0} km`;
      }

      if (confidence >= 60) {
        matches.push({
          lost_id: lostPet.id,
          found_id: found.id,
          match_confidence: confidence,
          is_probable_match: confidence >= 75,
          distance_km: distanceKm,
          reason: matchReason,
          evaluated_at: new Date().toISOString()
        });
      }
    }

    return matches.sort((a, b) => b.match_confidence - a.match_confidence);
  }
}

module.exports = new LostPetVisualMatcher();
