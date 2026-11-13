const placesRepository = require('./places-repository');
const deepSeekClient = require('../../shared/config/deepseek-config');
const { haversineDistanceKm } = require('../../shared/utils/geo-math');

class PlacesSmartSearchService {
  async smartSearch({ text, lat, lng, limit = 10, language = 'es' } = {}) {
    if (!text || text.trim().length === 0) {
      throw new Error('El término de búsqueda en lenguaje natural es obligatorio');
    }

    // 1. Obtener los lugares reales de la base de datos Supabase
    const allPlaces = await placesRepository.findAll({ limit: 50 });
    if (!allPlaces || allPlaces.length === 0) {
      return [];
    }

    const placesSummary = allPlaces.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      canton: p.canton || 'Costa Rica',
      address: p.address || '',
      price: p.price_level || '$$',
      attributes: Object.keys(p.attributes_metadata || {}).filter(k => p.attributes_metadata[k]?.verified || p.attributes_metadata[k] === true),
      lat: p.lat,
      lng: p.lng
    }));

    // 2. Si DeepSeek está configurado, hacer coincidencia semántica con IA
    if (deepSeekClient.isConfigured()) {
      try {
        const systemInstruction = `Eres un motor de búsqueda semántica y recomendación urbana para Costa Rica.
Analiza la intención del usuario y clasifica los lugares candidatos según su compatibilidad con la solicitud.
Devuelve un JSON con:
- results (array de objetos { id, match_score (0 a 100), reason (explicación breve y amigable en idioma ${language}), matched_tags (array de strings) })`;

        const prompt = `Búsqueda del usuario: "${text}"
Lugares disponibles en el catálogo de Costa Rica:
${JSON.stringify(placesSummary, null, 2)}`;

        const aiResponse = await deepSeekClient.generateJson({
          prompt,
          systemInstruction,
          temperature: 0.2
        });

        if (aiResponse && Array.isArray(aiResponse.results)) {
          const ranked = aiResponse.results
            .map(item => {
              const original = allPlaces.find(p => p.id === item.id);
              if (!original) return null;
              let distanceKm = null;
              if (lat && lng && original.lat && original.lng) {
                distanceKm = Number(haversineDistanceKm(lat, lng, original.lat, original.lng).toFixed(2));
              }
              return {
                ...original,
                match_score: item.match_score || 75,
                ai_reason: item.reason || 'Lugar recomendado para tu búsqueda',
                matched_tags: item.matched_tags || [],
                distance_km: distanceKm,
                search_mode: 'deepseek_semantic'
              };
            })
            .filter(Boolean)
            .sort((a, b) => b.match_score - a.match_score)
            .slice(0, limit);

          if (ranked.length > 0) return ranked;
        }
      } catch (err) {
        console.warn('[SmartSearch] DeepSeek no disponible, usando motor heurístico:', err.message);
      }
    }

    // 3. Fallback heurístico inteligente multi-atributo
    const tokens = text.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const scored = allPlaces.map(p => {
      let score = 0;
      const matched = [];
      const placeText = `${p.name} ${p.category} ${p.address} ${p.canton} ${JSON.stringify(p.attributes_metadata || {})}`.toLowerCase();

      for (const token of tokens) {
        if (placeText.includes(token)) {
          score += 25;
          matched.push(token);
        }
      }

      if (text.toLowerCase().includes('perro') || text.toLowerCase().includes('mascota') || text.toLowerCase().includes('pet')) {
        if (p.attributes_metadata?.pet_friendly) {
          score += 35;
          matched.push('pet_friendly');
        }
      }

      if (text.toLowerCase().includes('silla') || text.toLowerCase().includes('ley 7600') || text.toLowerCase().includes('rampa') || text.toLowerCase().includes('accesible')) {
        if (p.attributes_metadata?.ley_7600_ramp) {
          score += 35;
          matched.push('ley_7600_ramp');
        }
      }

      if (text.toLowerCase().includes('sinpe') || text.toLowerCase().includes('pago')) {
        if (p.attributes_metadata?.sinpe_movil) {
          score += 20;
          matched.push('sinpe_movil');
        }
      }

      let distanceKm = null;
      if (lat && lng && p.lat && p.lng) {
        distanceKm = Number(haversineDistanceKm(lat, lng, p.lat, p.lng).toFixed(2));
        if (distanceKm < 5.0) score += 15;
      }

      return {
        ...p,
        match_score: Math.min(100, Math.max(30, score)),
        ai_reason: matched.length > 0 ? `Coincide con atributos: ${matched.join(', ')}` : 'Lugar relevante en la zona',
        matched_tags: matched,
        distance_km: distanceKm,
        search_mode: 'heuristic_attributes'
      };
    });

    return scored
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, limit);
  }
}

module.exports = new PlacesSmartSearchService();
