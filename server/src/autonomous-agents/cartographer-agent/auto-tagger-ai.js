class AutoTaggerAi {
  suggestTags(placeName = '', rawDescription = '') {
    const text = `${placeName} ${rawDescription}`.toLowerCase();
    const tags = [];

    if (text.includes('café') || text.includes('coffee') || text.includes('espresso')) {
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

    return tags;
  }
}

module.exports = new AutoTaggerAi();

