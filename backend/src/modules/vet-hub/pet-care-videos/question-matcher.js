/**
 * Motor de correspondencia semántica para «Pregúntale al video».
 * Prioriza fragmentos del video abierto, recurre a otros videos aprobados y
 * detecta consultas sobre síntomas clínicos para derivar al directorio veterinario.
 */

const CLINICAL_SYMPTOMS_REGEX = /\b(v[oó]mit[aoe]|sangr[ae]|convulsi[oó]n|fiebre|diarrea|envenena|intoxica|atraganta|asfixi|paracetamol|ibuprofeno|acetaminof[eé]n|antibi[oó]tic[ao]|dosis|medicament[ao]|f[aá]rmac[ao]|fractur[ae]|atropell|herida\s+abierta|infecci[oó]n|moquillo|parvovirus|rabia|letarg[ao]|dolor\s+agudo|diagn[oó]stic[ao]|tratamient[ao]\s+m[eé]dico)\b/i;

const SPANISH_STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'a', 'al', 'en', 'con', 'por', 'para',
  'como', 'que', 'qué', 'cuándo', 'cuando', 'cuánto', 'cuanto', 'cuánta', 'cuanta',
  'dónde', 'donde', 'por qué', 'porque', 'es', 'son', 'se', 'mi', 'su', 'tu',
  'debe', 'puedo', 'hacer', 'hago', 'tener', 'tiene'
]);

function tokenize(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !SPANISH_STOPWORDS.has(token));
}

function calculateRelevanceScore(questionTokens, targetQuestion, targetAnswer, extraContext = '') {
  if (questionTokens.length === 0) return 0;

  const targetTokens = new Set([
    ...tokenize(targetQuestion),
    ...tokenize(targetAnswer),
    ...tokenize(extraContext)
  ]);

  let matches = 0;
  for (const token of questionTokens) {
    if (targetTokens.has(token)) {
      matches += 1.0;
    } else {
      // Coincidencia por prefijo / raíz (mínimo 4 caracteres)
      for (const t of targetTokens) {
        if (token.length >= 4 && (t.startsWith(token) || token.startsWith(t))) {
          matches += 0.75;
          break;
        }
      }
    }
  }

  return matches / questionTokens.length;
}

class QuestionMatcher {
  /**
   * Evalúa si una pregunta involucra síntomas clínicos que ameritan advertencia médica
   */
  detectClinicalEmergency(question = '') {
    const isClinical = CLINICAL_SYMPTOMS_REGEX.test(question);
    if (!isClinical) return null;

    return {
      clinical_warning: true,
      alert_message: '⚠️ Tu consulta menciona síntomas de alerta clínica, posible intoxicación o uso de fármacos. No automediques a tu mascota. Acude de inmediato a un centro veterinario colegiado.',
      veterinary_directory: {
        directory_url: '/api/places?category=veterinaria',
        sos_clinics_url: '/api/vet/sos-24h',
        emergency_hotlines: [
          '9-1-1 (Emergencias Nacionales Costa Rica)',
          'Hospital Veterinario Especies Menores UNA: 2277-3600',
          'Cruz Roja Costarricense Rescate Animal: 1322'
        ],
        urgent_consultation_recommended: true
      }
    };
  }

  /**
   * Busca la mejor respuesta primero en el video actual y luego en otros videos aprobados
   */
  matchQuestion({ userQuestion, currentVideoFragments = [], otherVideosWithFragments = [] }) {
    const clinicalNotice = this.detectClinicalEmergency(userQuestion);
    const questionTokens = tokenize(userQuestion);

    // 1. Buscar en los fragmentos del video abierto
    let bestCurrentMatch = null;
    let highestCurrentScore = 0;

    for (const f of currentVideoFragments) {
      const score = calculateRelevanceScore(questionTokens, f.question, f.answer);
      if (score > highestCurrentScore) {
        highestCurrentScore = score;
        bestCurrentMatch = f;
      }
    }

    const MATCH_THRESHOLD = 0.30;

    if (bestCurrentMatch && highestCurrentScore >= MATCH_THRESHOLD) {
      return {
        matched: true,
        match_source: 'current_video',
        confidence: Math.round(highestCurrentScore * 100) / 100,
        answer: bestCurrentMatch.answer,
        question_matched: bestCurrentMatch.question,
        start_seconds: bestCurrentMatch.start_seconds,
        end_seconds: bestCurrentMatch.end_seconds,
        fragment_id: bestCurrentMatch.id,
        clinical_notice: clinicalNotice
      };
    }

    // 2. Si no hubo coincidencia en el video actual, buscar en otros videos aprobados
    let bestOtherMatch = null;
    let bestOtherVideo = null;
    let highestOtherScore = 0;

    for (const video of otherVideosWithFragments) {
      const fragments = video.fragments || [];
      const extraContext = `${video.title || ''} ${video.species || ''} ${video.topic || ''}`;
      for (const f of fragments) {
        const score = calculateRelevanceScore(questionTokens, f.question, f.answer, extraContext);
        if (score > highestOtherScore) {
          highestOtherScore = score;
          bestOtherMatch = f;
          bestOtherVideo = video;
        }
      }
    }

    if (bestOtherMatch && highestOtherScore >= MATCH_THRESHOLD) {
      return {
        matched: true,
        match_source: 'other_video',
        confidence: Math.round(highestOtherScore * 100) / 100,
        answer: bestOtherMatch.answer,
        question_matched: bestOtherMatch.question,
        start_seconds: bestOtherMatch.start_seconds,
        end_seconds: bestOtherMatch.end_seconds,
        video_id: bestOtherVideo.id,
        youtube_id: bestOtherVideo.youtube_id,
        video_title: bestOtherVideo.title,
        channel_title: bestOtherVideo.channel_title,
        note: 'Respuesta encontrada en otro video verificado de nuestro catálogo',
        clinical_notice: clinicalNotice
      };
    }

    // 3. Ausencia de coincidencias respaldadas
    return {
      matched: false,
      message: 'Todavía no tenemos un fragmento que responda esa pregunta',
      suggested_topics: [
        'alimentacion',
        'higiene',
        'adiestramiento',
        'primeros_auxilios',
        'salud_preventiva'
      ],
      clinical_notice: clinicalNotice
    };
  }
}

module.exports = new QuestionMatcher();

