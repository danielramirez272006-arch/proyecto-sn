const { query } = require('../../../shared/config/database');
const geminiClient = require('../../../shared/config/gemini-config');
const youtubeApiClient = require('../../../shared/clients/youtube-api-client');

const EMERGENCY_SYMPTOMS = [
  'sangre', 'sangrado', 'vómito', 'vomito', 'convulsión', 'convulsion',
  'diarrea', 'envenenamiento', 'intoxicación', 'intoxicacion', 'chocolate',
  'veneno', 'atragantó', 'atraganto', 'ahogo', 'asfixia', 'fractura',
  'atropellado', 'inconsciente', 'no respira', 'no puede respirar', 'golpe de calor',
  'parálisis', 'paralisis', 'herida profunda'
];

class PetVideoSmartSearchService {
  /**
   * Buscador inteligente de videos para el cliente con Google Gemini
   */
  async smartSearch({ text, species = null, limit = 5, allowYouTubeFallback = true } = {}) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Debe ingresar una consulta o necesidad para buscar con Gemini.');
    }

    const cleanQuery = text.trim();
    const isClinicalEmergency = this.detectEmergencySymptoms(cleanQuery);

    // 1. Obtener videos aprobados con sus fragmentos de la base de datos
    const approvedVideos = await this.getApprovedVideosWithFragments(species);

    // 2. Si Gemini está disponible, ejecutar recomendación semántica profunda
    if (geminiClient.isConfigured()) {
      try {
        const aiResult = await this.rankWithGemini(cleanQuery, approvedVideos, species);
        if (aiResult) {
          // Si el catálogo verificado tiene un video adecuado seleccionado por Gemini
          if (aiResult.best_video_id) {
            const bestVideo = approvedVideos.find(v => v.id === aiResult.best_video_id || v.youtube_id === aiResult.best_video_id);
            if (bestVideo) {
              return this.formatSuccessfulResponse({
                query: cleanQuery,
                searchMode: 'gemini_ai',
                aiResult,
                bestVideo,
                candidateVideos: approvedVideos,
                isClinicalEmergency
              });
            }
          }

          // Si el catálogo verificado no tiene coincidencia satisfactoria y se permite fallback a YouTube
          if (allowYouTubeFallback && (aiResult.has_satisfactory_match === false || approvedVideos.length === 0)) {
            const ytDiscovery = await this.discoverFromYouTube(
              aiResult.suggested_youtube_search || cleanQuery,
              cleanQuery,
              aiResult
            );
            if (ytDiscovery) {
              return {
                ...ytDiscovery,
                is_medical_emergency: isClinicalEmergency || Boolean(aiResult.is_medical_emergency),
                emergency_alert: this.buildEmergencyAlert(isClinicalEmergency || Boolean(aiResult.is_medical_emergency), aiResult.emergency_advice)
              };
            }
          }
        }
      } catch (err) {
        console.warn('[PetVideoSmartSearch] Error en Gemini, ejecutando motor heurístico local:', err.message);
      }
    }

    // 3. Fallback Heurístico Local ($0 Resilient Mode)
    return this.fallbackHeuristicSearch(cleanQuery, approvedVideos, isClinicalEmergency, limit);
  }

  detectEmergencySymptoms(text) {
    const lower = text.toLowerCase();
    return EMERGENCY_SYMPTOMS.some(s => lower.includes(s));
  }

  buildEmergencyAlert(isEmergency, customAdvice = '') {
    if (!isEmergency) return null;
    return {
      active: true,
      severity: 'critical',
      title: '🚨 Atención Veterinaria Inmediata Requerida',
      message: customAdvice || 'La consulta describe síntomas o accidentes que pueden comprometer la vida de tu mascota. Aplica primeros auxilios mientras te diriges a una clínica de guardia.',
      action_label: 'Ver Directorio Veterinario 24/7 en Costa Rica',
      directory_link: '/vet-hub/emergencies'
    };
  }

  async getApprovedVideosWithFragments(speciesFilter = null) {
    const conditions = ["status = 'approved'"];
    const params = [];

    if (speciesFilter && speciesFilter !== 'all') {
      conditions.push('species = ?');
      params.push(speciesFilter.toLowerCase());
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const videos = await query(
      `SELECT id, youtube_id, youtube_url, title, channel_title, duration_seconds,
              thumbnail_url, species, topic, summary
       FROM pet_videos
       ${whereClause}
       ORDER BY approved_at DESC, created_at DESC
       LIMIT 50`,
      params
    );

    if (!videos || videos.length === 0) return [];

    const videoIds = videos.map(v => v.id);
    const placeholders = videoIds.map(() => '?').join(',');
    const fragments = await query(
      `SELECT id, video_id, question, answer, start_seconds, end_seconds, order_index
       FROM pet_video_fragments
       WHERE video_id IN (${placeholders})
       ORDER BY order_index ASC`,
      videoIds
    );

    const fragsMap = {};
    if (fragments) {
      for (const f of fragments) {
        if (!fragsMap[f.video_id]) fragsMap[f.video_id] = [];
        fragsMap[f.video_id].push(f);
      }
    }

    return videos.map(v => ({
      ...v,
      fragments: fragsMap[v.id] || []
    }));
  }

  async rankWithGemini(userQuery, candidateVideos, speciesFilter) {
    const catalogSummary = candidateVideos.map(v => ({
      id: v.id,
      youtube_id: v.youtube_id,
      title: v.title,
      channel: v.channel_title,
      species: v.species,
      topic: v.topic,
      summary: v.summary,
      fragments: (v.fragments || []).map(f => ({
        question: f.question,
        answer: f.answer,
        start_seconds: f.start_seconds,
        end_seconds: f.end_seconds
      }))
    }));

    const systemInstruction = `Eres el Asistente Veterinario y Buscador Experto de Videos de Mascotas de Sinergia Urbana Costa Rica, potenciado por Google Gemini.
Tu misión es recibir cualquier duda, síntoma o situación de un dueño de mascota y encontrar el video MÁS INDICADO del catálogo que responda exactamente a su necesidad.
Si el usuario describe síntomas médicos graves (intoxicación, hemorragia, atragantamiento, golpe de calor, parálisis), marca is_medical_emergency = true y redacta emergency_advice conciso.
Evalúa los videos disponibles considerando especie, tema y fragmentos específicos de respuesta.

Devuelve estrictamente un JSON con los siguientes campos:
- interpreted_need: (string breve explicando qué necesita el usuario)
- detected_species: 'perros' | 'gatos' | 'aves' | 'conejos' | 'general'
- detected_topic: 'primeros_auxilios' | 'higiene' | 'alimentacion' | 'conducta' | 'salud'
- is_medical_emergency: (boolean)
- emergency_advice: (string con consejo inmediato o vacío si no aplica)
- has_satisfactory_match: (boolean: true si hay un video del catálogo que responde bien, false si ninguno es adecuado)
- best_video_id: (id del video más indicado de la lista suministrada, o null si ninguno sirve)
- best_start_seconds: (número entero con el segundo exacto donde se explica la solución)
- why_recommended: (explicación empática y clara de por qué este video es el mejor para la situación del usuario)
- direct_answer: (respuesta directa en 1 o 2 oraciones para el usuario)
- ranked_video_ids: (array con los IDs de videos alternativos ordenados por relevancia)
- suggested_youtube_search: (término de búsqueda optimizado para YouTube por si se requiere buscar videos adicionales)`;

    const prompt = `Consulta del dueño de mascota: "${userQuery}"
${speciesFilter ? `Filtro de especie sugerido: ${speciesFilter}` : ''}

Videos aprobados en el catálogo:
${JSON.stringify(catalogSummary, null, 2)}`;

    return await geminiClient.generateJson({
      prompt,
      systemInstruction,
      temperature: 0.2
    });
  }

  async discoverFromYouTube(searchQuery, userQuery, aiContext) {
    try {
      const ytResult = await youtubeApiClient.searchVideos(searchQuery, 3);
      if (!ytResult || !ytResult.videos || ytResult.videos.length === 0) {
        return null;
      }

      const topVideo = ytResult.videos[0];
      return {
        query: userQuery,
        search_mode: 'gemini_youtube_discovery',
        source: 'youtube_live',
        interpreted_need: aiContext?.interpreted_need || userQuery,
        detected_species: aiContext?.detected_species || 'general',
        detected_topic: aiContext?.detected_topic || 'cuidado_general',
        best_match: {
          id: `yt_${topVideo.youtube_id}`,
          youtube_id: topVideo.youtube_id,
          canonical_url: topVideo.canonical_url,
          title: topVideo.title,
          channel_title: topVideo.channel_title,
          duration_seconds: topVideo.duration_seconds,
          thumbnail_url: topVideo.thumbnail_url,
          start_seconds: 0,
          why_recommended: `Gemini seleccionó este video educativo de YouTube («${topVideo.title}») como el recurso más relevante para tu consulta: "${userQuery}".`,
          direct_answer: aiContext?.direct_answer || 'Revisa este video explicativo en YouTube para conocer el procedimiento adecuado.',
          is_catalog_item: false
        },
        alternative_matches: ytResult.videos.slice(1).map(v => ({
          id: `yt_${v.youtube_id}`,
          youtube_id: v.youtube_id,
          canonical_url: v.canonical_url,
          title: v.title,
          channel_title: v.channel_title,
          duration_seconds: v.duration_seconds,
          thumbnail_url: v.thumbnail_url,
          start_seconds: 0
        })),
        total_found: ytResult.videos.length
      };
    } catch (err) {
      console.warn('[PetVideoSmartSearch] Fallo en búsqueda YouTube Discovery:', err.message);
      return null;
    }
  }

  formatSuccessfulResponse({ query, searchMode, aiResult, bestVideo, candidateVideos, isClinicalEmergency }) {
    const isEmergency = isClinicalEmergency || Boolean(aiResult.is_medical_emergency);
    const startSec = typeof aiResult.best_start_seconds === 'number'
      ? Math.max(0, Math.min(aiResult.best_start_seconds, bestVideo.duration_seconds || 600))
      : 0;

    // Buscar fragmento asociado
    const matchedFragment = (bestVideo.fragments || []).find(f => 
      Math.abs(f.start_seconds - startSec) <= 15
    ) || (bestVideo.fragments && bestVideo.fragments[0]) || null;

    // Preparar videos alternativos
    const alternativeIds = Array.isArray(aiResult.ranked_video_ids) ? aiResult.ranked_video_ids : [];
    const alternativeMatches = alternativeIds
      .filter(id => id !== bestVideo.id && id !== bestVideo.youtube_id)
      .map(id => candidateVideos.find(v => v.id === id || v.youtube_id === id))
      .filter(Boolean)
      .slice(0, 4)
      .map(v => ({
        id: v.id,
        youtube_id: v.youtube_id,
        canonical_url: v.youtube_url || `https://www.youtube.com/watch?v=${v.youtube_id}`,
        title: v.title,
        channel_title: v.channel_title,
        duration_seconds: v.duration_seconds,
        thumbnail_url: v.thumbnail_url,
        species: v.species,
        topic: v.topic,
        start_seconds: (v.fragments && v.fragments[0]) ? v.fragments[0].start_seconds : 0
      }));

    return {
      query,
      search_mode: searchMode,
      source: 'verified_catalog',
      interpreted_need: aiResult.interpreted_need || query,
      detected_species: aiResult.detected_species || bestVideo.species || 'general',
      detected_topic: aiResult.detected_topic || bestVideo.topic || 'cuidado_general',
      is_medical_emergency: isEmergency,
      emergency_alert: this.buildEmergencyAlert(isEmergency, aiResult.emergency_advice),
      best_match: {
        id: bestVideo.id,
        youtube_id: bestVideo.youtube_id,
        canonical_url: bestVideo.youtube_url || `https://www.youtube.com/watch?v=${bestVideo.youtube_id}`,
        title: bestVideo.title,
        channel_title: bestVideo.channel_title,
        duration_seconds: bestVideo.duration_seconds,
        thumbnail_url: bestVideo.thumbnail_url,
        species: bestVideo.species,
        topic: bestVideo.topic,
        summary: bestVideo.summary,
        start_seconds: startSec,
        why_recommended: aiResult.why_recommended || `Gemini determinó que este video de «${bestVideo.channel_title}» es el más adecuado para responder a tu consulta.`,
        direct_answer: aiResult.direct_answer || (matchedFragment ? matchedFragment.answer : bestVideo.summary),
        matched_fragment: matchedFragment ? {
          question: matchedFragment.question,
          answer: matchedFragment.answer,
          start_seconds: matchedFragment.start_seconds,
          end_seconds: matchedFragment.end_seconds
        } : null,
        is_catalog_item: true
      },
      alternative_matches: alternativeMatches,
      total_found: 1 + alternativeMatches.length
    };
  }

  fallbackHeuristicSearch(userQuery, approvedVideos, isEmergency, limit = 5) {
    if (!approvedVideos || approvedVideos.length === 0) {
      return {
        query: userQuery,
        search_mode: 'resilient_fallback',
        source: 'none',
        interpreted_need: userQuery,
        is_medical_emergency: isEmergency,
        emergency_alert: this.buildEmergencyAlert(isEmergency),
        best_match: null,
        alternative_matches: [],
        message: 'No hay videos aprobados actualmente en el catálogo para esta búsqueda.'
      };
    }

    const queryLower = userQuery.toLowerCase();
    const tokens = queryLower.split(/\s+/).filter(t => t.length > 2);

    let bestScore = -1;
    let bestVideo = approvedVideos[0];
    let bestFragment = (bestVideo.fragments && bestVideo.fragments[0]) || null;

    const scoredVideos = approvedVideos.map(video => {
      let score = 0;
      const titleLower = (video.title || '').toLowerCase();
      const topicLower = (video.topic || '').toLowerCase();
      const summaryLower = (video.summary || '').toLowerCase();

      for (const token of tokens) {
        if (titleLower.includes(token)) score += 5;
        if (topicLower.includes(token)) score += 4;
        if (summaryLower.includes(token)) score += 2;
      }

      let matchedFrag = null;
      let fragBestScore = 0;

      for (const frag of (video.fragments || [])) {
        let fScore = 0;
        const qLower = (frag.question || '').toLowerCase();
        const aLower = (frag.answer || '').toLowerCase();
        for (const token of tokens) {
          if (qLower.includes(token)) fScore += 8;
          if (aLower.includes(token)) fScore += 4;
        }
        if (fScore > fragBestScore) {
          fragBestScore = fScore;
          matchedFrag = frag;
        }
      }

      score += fragBestScore;

      if (score > bestScore) {
        bestScore = score;
        bestVideo = video;
        bestFragment = matchedFrag || (video.fragments && video.fragments[0]) || null;
      }

      return {
        video,
        score,
        matchedFrag
      };
    });

    const startSeconds = bestFragment ? bestFragment.start_seconds : 0;
    const sortedAlts = scoredVideos
      .filter(item => item.video.id !== bestVideo.id)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => ({
        id: item.video.id,
        youtube_id: item.video.youtube_id,
        canonical_url: item.video.youtube_url || `https://www.youtube.com/watch?v=${item.video.youtube_id}`,
        title: item.video.title,
        channel_title: item.video.channel_title,
        duration_seconds: item.video.duration_seconds,
        thumbnail_url: item.video.thumbnail_url,
        species: item.video.species,
        topic: item.video.topic,
        start_seconds: (item.video.fragments && item.video.fragments[0]) ? item.video.fragments[0].start_seconds : 0
      }));

    return {
      query: userQuery,
      search_mode: 'resilient_heuristic',
      source: 'verified_catalog',
      interpreted_need: `Búsqueda de cuidado animal sobre: "${userQuery}"`,
      detected_species: bestVideo.species || 'general',
      detected_topic: bestVideo.topic || 'cuidado_general',
      is_medical_emergency: isEmergency,
      emergency_alert: this.buildEmergencyAlert(isEmergency),
      best_match: {
        id: bestVideo.id,
        youtube_id: bestVideo.youtube_id,
        canonical_url: bestVideo.youtube_url || `https://www.youtube.com/watch?v=${bestVideo.youtube_id}`,
        title: bestVideo.title,
        channel_title: bestVideo.channel_title,
        duration_seconds: bestVideo.duration_seconds,
        thumbnail_url: bestVideo.thumbnail_url,
        species: bestVideo.species,
        topic: bestVideo.topic,
        summary: bestVideo.summary,
        start_seconds: startSeconds,
        why_recommended: `Video seleccionado por coincidencia temática con "${userQuery}".`,
        direct_answer: bestFragment ? bestFragment.answer : (bestVideo.summary || 'Consulta el video para ver el paso a paso.'),
        matched_fragment: bestFragment ? {
          question: bestFragment.question,
          answer: bestFragment.answer,
          start_seconds: bestFragment.start_seconds,
          end_seconds: bestFragment.end_seconds
        } : null,
        is_catalog_item: true
      },
      alternative_matches: sortedAlts,
      total_found: 1 + sortedAlts.length
    };
  }
}

module.exports = new PetVideoSmartSearchService();
