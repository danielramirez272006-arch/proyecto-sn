const deepSeekClient = require('../../shared/config/deepseek-config');

class AutoTaggerAi {
  async suggestTagsWithAi(placeName = '', rawDescription = '') {
    if (deepSeekClient.isConfigured()) {
      try {
        const response = await deepSeekClient.generateJson({
          systemInstruction: 'Eres un clasificador semántico para comercios y eventos en Costa Rica. Devuelve un array de objetos en "tags" con { tag, confidence }.',
          prompt: `Analiza: Lugar: "${placeName}", Descripción: "${rawDescription}".
Genera etiquetas aplicables de esta lista o similares: specialty_coffee, pet_friendly, sinpe_movil, ley_7600_ramp, outdoor_terrace, vegan_options, craft_beer.`
        });
        if (Array.isArray(response.tags) && response.tags.length > 0) {
          return response.tags;
        }
      } catch (err) {
        // Fallback a heurística
      }
    }
    return this.suggestTags(placeName, rawDescription);
  }

  suggestTags(placeName = '', rawDescription = '') {
    const text = `${placeName} ${rawDescription}`.toLowerCase();
    const tags = [];

    if (text.includes('café') || text.includes('coffee') || text.includes('espresso') || text.includes('yodito')) {
      tags.push({ tag: 'specialty_coffee', confidence: 0.95 });
    }
    if (text.includes('terraza') || text.includes('perro') || text.includes('pet')) {
      tags.push({ tag: 'pet_friendly', confidence: 0.90 });
    }
    if (text.includes('sinpe') || text.includes('móvil')) {
      tags.push({ tag: 'sinpe_movil', confidence: 0.98 });
    }
    if (text.includes('rampa') || text.includes('plano') || text.includes('7600')) {
      tags.push({ tag: 'ley_7600_ramp', confidence: 0.85 });
    }
    if (text.includes('artesanal') || text.includes('cerveza') || text.includes('feria')) {
      tags.push({ tag: 'local_producer', confidence: 0.92 });
    }

    return tags;
  }
}

module.exports = new AutoTaggerAi();
