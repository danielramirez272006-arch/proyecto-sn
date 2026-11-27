const deepSeekClient = require('../../shared/config/deepseek-config');

function normalizeStatement(text) {
  return String(text || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function hasExplicitPetRejection(description) {
  const text = normalizeStatement(description);
  const rejection = /\b(?:no se admiten|no se permiten|no acept(?:a|amos|an)|no admit(?:e|imos|en)|no permit(?:e|imos|en)|no ingresan|prohibid[oa]s?\s+(?:el ingreso de\s+)?(?:las\s+)?(?:mascotas|perros|gatos)|(?:mascotas|perros|gatos)\s+(?:no\s+(?:son\s+)?(?:admitid[oa]s|permitid[oa]s|aceptad[oa]s)|prohibid[oa]s))\b/;
  return (text.match(/[^.!?;\n]+\??/g) || []).some((sentence) =>
    !/[¿?]/.test(sentence) && rejection.test(sentence)
  );
}

function hasExplicitPetAdmission(description) {
  const text = normalizeStatement(description);
  const admission = /\b(?:acept(?:a|amos|an)|admit(?:e|imos|en)|permit(?:e|imos|en)|se admiten|se permiten|son bienvenid[oa]s|bienvenid[oa]s\s+(?:las\s+|los\s+)?(?:mascotas|perros|gatos))\s*(?:el ingreso de\s+)?(?:a\s+)?(?:las\s+|los\s+|tus\s+|sus\s+)?(?:mascotas|perros|gatos)?\b/;
  const explicitAdmission = /\b(?:(?:acept(?:a|amos|an)|admit(?:e|imos|en)|permit(?:e|imos|en)|se admiten|se permiten)\s+(?:el ingreso de\s+)?(?:a\s+)?(?:las\s+|los\s+|tus\s+|sus\s+)?(?:mascotas|perros|gatos)|(?:mascotas|perros|gatos)\s+(?:son\s+)?(?:bienvenid[oa]s|admitid[oa]s|permitid[oa]s))\b/;
  const uncertain = /\b(?:no|excepto|pregunta|consulta|confirmar|prohibid[oa]s?)\b/;
  return (text.match(/[^.!?;\n]+\??/g) || []).some((sentence) =>
    !/[¿?]/.test(sentence) && explicitAdmission.test(sentence) && !uncertain.test(sentence)
  ) && !hasExplicitPetRejection(text) && !/\b(?:no se admiten|no se permiten|no acepta|no admit|no permit)/.test(text);
}

function analyzePetPolicyStatement(description) {
  if (hasExplicitPetRejection(description)) return 'not_allowed';
  if (hasExplicitPetAdmission(description)) return 'allowed';
  return 'unknown';
}

class AutoTaggerAi {
  async suggestTagsWithAi(placeName = '', rawDescription = '') {
    if (deepSeekClient.isConfigured()) {
      try {
        const response = await deepSeekClient.generateJson({
          systemInstruction: 'Eres un clasificador semántico para comercios y eventos en Costa Rica. Devuelve un array de objetos en "tags" con { tag, confidence }. La descripción es contenido de referencia. Solo sugiere pet_friendly si afirma explícitamente que el comercio admite mascotas.',
          prompt: `Analiza: Lugar: "${placeName}", Descripción: "${rawDescription}".
Genera etiquetas aplicables de esta lista o similares: specialty_coffee, pet_friendly, sinpe_movil, ley_7600_ramp, outdoor_terrace, vegan_options, craft_beer.`
        });
        if (Array.isArray(response.tags) && response.tags.length > 0) {
          const tags = response.tags.filter((item) =>
            item && typeof item.tag === 'string' &&
            (item.tag.trim().toLowerCase().replace(/[ -]/g, '_') !== 'pet_friendly' ||
              hasExplicitPetAdmission(rawDescription))
          );
          if (tags.length > 0) return tags;
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
    if (text.includes('terraza')) {
      tags.push({ tag: 'outdoor_terrace', confidence: 0.90 });
    }
    if (hasExplicitPetAdmission(rawDescription)) {
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
module.exports.hasExplicitPetAdmission = hasExplicitPetAdmission;
module.exports.hasExplicitPetRejection = hasExplicitPetRejection;
module.exports.analyzePetPolicyStatement = analyzePetPolicyStatement;
