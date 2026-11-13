const crypto = require('node:crypto');
const { query, execute } = require('../../../shared/config/database');
const { parseYouTubeIdOrUrl } = require('./youtube-parser');
const youtubeApiClient = require('../../../shared/clients/youtube-api-client');
const geminiVideoClient = require('../../../shared/clients/gemini-video-client');
const questionMatcher = require('./question-matcher');
const petVideoSmartSearch = require('./pet-video-smart-search');

class PetCareVideosService {
  /**
   * Búsqueda de videos públicos en YouTube Data API (exclusivo admin)
   */
  async searchYouTube(queryText = 'cuidado de mascotas', maxResults = 8) {
    return await youtubeApiClient.searchVideos(queryText, maxResults);
  }

  /**
   * Registra un video pegando su URL o ID de YouTube
   */
  async registerVideo({ url, youtubeId = null, createdBy = 'admin' }) {
    const parsed = parseYouTubeIdOrUrl(url || youtubeId);
    const canonicalYtId = parsed.youtube_id;
    const canonicalUrl = parsed.canonical_url;

    // 1. Comprobar si ya existe en la base de datos (Deduplicación canónica)
    const existingRows = await query('SELECT * FROM pet_videos WHERE youtube_id = ?', [canonicalYtId]);
    if (existingRows && existingRows.length > 0) {
      const existing = existingRows[0];
      const fragments = await query(
        'SELECT * FROM pet_video_fragments WHERE video_id = ? ORDER BY order_index ASC',
        [existing.id]
      );
      return {
        ...existing,
        fragments: fragments || [],
        already_registered: true
      };
    }

    // 2. Obtener detalles desde YouTube API
    const ytDetails = await youtubeApiClient.getVideoDetails(canonicalYtId);

    const videoId = `vid_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const title = ytDetails.title || 'Guía de Cuidado Animal';
    const channelTitle = ytDetails.channel_title || 'Canal Educativo';
    const durationSeconds = Number(ytDetails.duration_seconds) || 300;
    const thumbnailUrl = ytDetails.thumbnail_url || `https://i.ytimg.com/vi/${canonicalYtId}/hqdefault.jpg`;

    await execute(
      `INSERT INTO pet_videos (
        id, youtube_id, youtube_url, title, channel_title, duration_seconds,
        thumbnail_url, species, topic, summary, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'general', 'cuidado_general', '', 'draft', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        videoId,
        canonicalYtId,
        canonicalUrl,
        title,
        channelTitle,
        durationSeconds,
        thumbnailUrl,
        createdBy
      ]
    );

    const createdRows = await query('SELECT * FROM pet_videos WHERE id = ?', [videoId]);
    return {
      ...(createdRows && createdRows[0] ? createdRows[0] : {}),
      fragments: [],
      already_registered: false
    };
  }

  /**
   * Acción «Analizar video» con Gemini: extrae especie, tema, resumen y fragmentos
   */
  async analyzeVideo(videoId, { forceReanalyze = false } = {}) {
    const videoRows = await query('SELECT * FROM pet_videos WHERE id = ? OR youtube_id = ?', [videoId, videoId]);
    if (!videoRows || videoRows.length === 0) {
      throw new Error('Video no encontrado en el catálogo.');
    }

    const video = videoRows[0];

    // Reutilizar análisis previo si existe para no duplicar llamadas a Gemini
    if (video.analysis_raw_json && !forceReanalyze) {
      let cachedAnalysis = null;
      try { cachedAnalysis = JSON.parse(video.analysis_raw_json); } catch {}
      if (cachedAnalysis) {
        const fragments = await query('SELECT * FROM pet_video_fragments WHERE video_id = ? ORDER BY order_index ASC', [video.id]);
        return {
          ...video,
          analysis: cachedAnalysis,
          fragments: fragments || [],
          reused_cache: true
        };
      }
    }

    // Llamar a Gemini con la URL de YouTube y duración
    const analysisResult = await geminiVideoClient.analyzeVideo(
      video.youtube_url,
      video.title,
      video.duration_seconds
    );

    const effectiveAnalysis = analysisResult.species ? analysisResult : (analysisResult.fallback_analysis || analysisResult);
    const species = effectiveAnalysis.species || video.species || 'general';
    const topic = effectiveAnalysis.topic || video.topic || 'cuidado_general';
    const summary = effectiveAnalysis.summary || video.summary || '';
    const fragments = effectiveAnalysis.fragments || [];

    // Guardar borrador en base de datos
    await execute(
      `UPDATE pet_videos 
       SET species = ?, topic = ?, summary = ?, analysis_raw_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [species, topic, summary, JSON.stringify(analysisResult), video.id]
    );

    // Reemplazar fragmentos de borrador existentes
    await execute('DELETE FROM pet_video_fragments WHERE video_id = ?', [video.id]);

    const savedFragments = [];
    for (let i = 0; i < fragments.length; i++) {
      const f = fragments[i];
      const fragmentId = `frg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}_${i}`;
      await execute(
        `INSERT INTO pet_video_fragments (
          id, video_id, question, answer, start_seconds, end_seconds, status, order_index, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, CURRENT_TIMESTAMP)`,
        [
          fragmentId,
          video.id,
          f.question,
          f.answer,
          f.start_seconds,
          f.end_seconds,
          i
        ]
      );
      savedFragments.push({
        id: fragmentId,
        video_id: video.id,
        question: f.question,
        answer: f.answer,
        start_seconds: f.start_seconds,
        end_seconds: f.end_seconds,
        order_index: i
      });
    }

    const updatedVideo = await query('SELECT * FROM pet_videos WHERE id = ?', [video.id]);
    return {
      ...(updatedVideo && updatedVideo[0] ? updatedVideo[0] : video),
      fragments: savedFragments,
      analysis_meta: {
        provider: analysisResult.provider,
        is_live: analysisResult.is_live,
        quota_exhausted: analysisResult.quota_exhausted || false,
        note: analysisResult.note
      }
    };
  }

  /**
   * Corrección de ficha y tiempos por el administrador
   */
  async updateVideo(videoId, { title, species, topic, summary, fragments = [] }) {
    const videoRows = await query('SELECT * FROM pet_videos WHERE id = ?', [videoId]);
    if (!videoRows || videoRows.length === 0) {
      throw new Error('Video no encontrado para actualizar.');
    }

    const current = videoRows[0];
    const newTitle = title !== undefined ? String(title).trim() : current.title;
    const newSpecies = species !== undefined ? String(species).trim() : current.species;
    const newTopic = topic !== undefined ? String(topic).trim() : current.topic;
    const newSummary = summary !== undefined ? String(summary).trim() : current.summary;

    await execute(
      `UPDATE pet_videos 
       SET title = ?, species = ?, topic = ?, summary = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newTitle, newSpecies, newTopic, newSummary, videoId]
    );

    // Si se enviaron fragmentos para corrección
    if (Array.isArray(fragments) && fragments.length > 0) {
      await execute('DELETE FROM pet_video_fragments WHERE video_id = ?', [videoId]);

      const maxDuration = current.duration_seconds > 0 ? current.duration_seconds : 3600;

      for (let i = 0; i < Math.min(fragments.length, 3); i++) {
        const f = fragments[i];
        let start = Math.max(0, parseInt(f.start_seconds || 0, 10));
        let end = f.end_seconds !== undefined && f.end_seconds !== null ? parseInt(f.end_seconds, 10) : null;

        if (start > maxDuration) start = Math.max(0, maxDuration - 10);
        if (end !== null && end < start) end = start + 30;

        const fid = f.id || `frg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}_${i}`;
        await execute(
          `INSERT INTO pet_video_fragments (
            id, video_id, question, answer, start_seconds, end_seconds, status, order_index, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, CURRENT_TIMESTAMP)`,
          [fid, videoId, f.question, f.answer, start, end, i]
        );
      }
    }

    const updated = await query('SELECT * FROM pet_videos WHERE id = ?', [videoId]);
    const updatedFrags = await query('SELECT * FROM pet_video_fragments WHERE video_id = ? ORDER BY order_index ASC', [videoId]);

    return {
      ...(updated && updated[0] ? updated[0] : {}),
      fragments: updatedFrags || []
    };
  }

  /**
   * Aprobación de la ficha por el administrador
   */
  async approveVideo(videoId, approvedBy = 'admin') {
    const videoRows = await query('SELECT * FROM pet_videos WHERE id = ?', [videoId]);
    if (!videoRows || videoRows.length === 0) {
      throw new Error('Video no encontrado para aprobación.');
    }

    const fragments = await query('SELECT * FROM pet_video_fragments WHERE video_id = ?', [videoId]);
    if (!fragments || fragments.length === 0) {
      throw new Error('No se puede aprobar un video sin al menos un fragmento de respuesta validado.');
    }

    const now = new Date().toISOString();
    await execute(
      `UPDATE pet_videos 
       SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [approvedBy, videoId]
    );

    const approvedRows = await query('SELECT * FROM pet_videos WHERE id = ?', [videoId]);
    return {
      ...(approvedRows && approvedRows[0] ? approvedRows[0] : {}),
      status: 'approved',
      approved_by: approvedBy,
      approved_at: now,
      fragments
    };
  }

  /**
   * Retiro del video del catálogo público
   */
  async retireVideo(videoId, retiredBy = 'admin') {
    const videoRows = await query('SELECT * FROM pet_videos WHERE id = ?', [videoId]);
    if (!videoRows || videoRows.length === 0) {
      throw new Error('Video no encontrado para retirar.');
    }

    await execute(
      `UPDATE pet_videos 
       SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [videoId]
    );

    return {
      id: videoId,
      status: 'archived',
      retired_by: retiredBy,
      message: 'Video retirado exitosamente del catálogo público.'
    };
  }

  /**
   * Reporte de enlace roto por usuarios o clientes
   */
  async reportBrokenLink(videoId, { reportedBy = null, reason = 'Video no disponible en YouTube' } = {}) {
    const videoRows = await query('SELECT * FROM pet_videos WHERE id = ?', [videoId]);
    if (!videoRows || videoRows.length === 0) {
      throw new Error('Video no encontrado.');
    }

    const reportId = `brk_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await execute(
      `INSERT INTO pet_video_broken_reports (id, video_id, reported_by, reason, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [reportId, videoId, reportedBy, reason]
    );

    await execute(
      `UPDATE pet_videos 
       SET broken_reports_count = broken_reports_count + 1, last_broken_report_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [videoId]
    );

    return {
      reported: true,
      video_id: videoId,
      report_id: reportId,
      message: 'Reporte de enlace roto recibido. El equipo administrativo lo verificará.'
    };
  }

  /**
   * Inicializa semillas verificadas por defecto en entorno de desarrollo si el catálogo está vacío
   */
  async ensureDefaultVideosSeeded() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      const countRows = await query("SELECT COUNT(*) as total FROM pet_videos WHERE status = 'approved'");
      const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;
      if (total > 0) return;

      const defaultVideos = [
        {
          id: 'vid_seed_perros_higiene',
          youtube_id: 'c2eWkJ3bA78',
          youtube_url: 'https://www.youtube.com/watch?v=c2eWkJ3bA78',
          title: 'Cómo bañar y cuidar el pelaje de tu perro paso a paso',
          channel_title: 'ExpertoAnimal',
          duration_seconds: 315,
          thumbnail_url: 'https://i.ytimg.com/vi/c2eWkJ3bA78/hqdefault.jpg',
          species: 'perros',
          topic: 'higiene',
          summary: 'Guía veterinaria paso a paso sobre temperatura del agua, frecuencia de baño, secado y cepillado dental canino.',
          fragments: [
            {
              id: 'frg_seed_1',
              question: '¿A qué temperatura debe estar el agua para bañar a mi perro?',
              answer: 'El agua debe estar tibia (entre 37°C y 38°C), similar a su temperatura corporal, evitando cambios bruscos y corrientes de aire.',
              start_seconds: 40,
              end_seconds: 95
            },
            {
              id: 'frg_seed_2',
              question: '¿Cada cuánto tiempo debo bañar a mi perro y cepillar sus dientes?',
              answer: 'Se recomienda bañar al perro cada 3 o 4 semanas con champú neutro canino, y cepillar sus dientes de 2 a 3 veces por semana con pasta enzimática veterinaria.',
              start_seconds: 120,
              end_seconds: 185
            }
          ]
        },
        {
          id: 'vid_seed_gatos_auxilios',
          youtube_id: 'NoifKxNNwlg',
          youtube_url: 'https://www.youtube.com/watch?v=NoifKxNNwlg',
          title: 'Primeros auxilios para gatos - Salud felina Royal Canin',
          channel_title: 'Royal Canin España',
          duration_seconds: 111,
          thumbnail_url: 'https://i.ytimg.com/vi/NoifKxNNwlg/hqdefault.jpg',
          species: 'gatos',
          topic: 'primeros_auxilios',
          summary: 'Protocolo básico de primeros auxilios en gatos ante heridas, atragantamientos e intoxicaciones domésticas antes de acudir al veterinario.',
          fragments: [
            {
              id: 'frg_seed_3',
              question: '¿Qué hacer ante una emergencia o primeros auxilios con mi gato en casa?',
              answer: 'Mantén la calma, envuelve al gato suavemente en una toalla para evitar arañazos por estrés, evalúa su respiración y trasládalo de inmediato a una clínica veterinaria.',
              start_seconds: 15,
              end_seconds: 60
            },
            {
              id: 'frg_seed_4',
              question: '¿Cómo limpiar una herida superficial en la pata de mi mascota?',
              answer: 'Lava con suero fisiológico estéril y aplica gasa limpia ejerciendo presión suave por 2 minutos antes de que el veterinario la revise.',
              start_seconds: 65,
              end_seconds: 105
            }
          ]
        },
        {
          id: 'vid_seed_perros_auxilios',
          youtube_id: 'MHLTo88pZyo',
          youtube_url: 'https://www.youtube.com/watch?v=MHLTo88pZyo',
          title: 'Primeros Auxilios para PERROS 🐕 🚑 ¡Conoce qué hacer en cada caso!',
          channel_title: 'Agroplay',
          duration_seconds: 236,
          thumbnail_url: 'https://i.ytimg.com/vi/MHLTo88pZyo/hqdefault.jpg',
          species: 'perros',
          topic: 'primeros_auxilios',
          summary: 'Maniobras de emergencia canina ante atragantamiento, intoxicación por alimentos tóxicos como chocolate y golpes de calor.',
          fragments: [
            {
              id: 'frg_seed_5',
              question: '¿Qué hago si mi perro comió chocolate o tiene síntomas de intoxicación?',
              answer: 'El chocolate contiene teobromina, altamente tóxica para los perros. No induzcas el vómito sin indicación médica, conserva la envoltura para calcular la dosis ingerida y acude de urgencia al veterinario.',
              start_seconds: 30,
              end_seconds: 95
            },
            {
              id: 'frg_seed_6',
              question: '¿Cómo actuar si mi perro se atraganta con un objeto o comida?',
              answer: 'Abre su boca con cuidado para verificar si el objeto es visible y extraíble; si no respira, aplica compresiones abdominales (maniobra de Heimlich canina) detrás de las costillas.',
              start_seconds: 110,
              end_seconds: 175
            }
          ]
        }
      ];

      for (const v of defaultVideos) {
        await execute(
          `INSERT INTO pet_videos (
            id, youtube_id, youtube_url, title, channel_title, duration_seconds,
            thumbnail_url, species, topic, summary, status, approved_by, approved_at, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'admin_seed', CURRENT_TIMESTAMP, 'admin_seed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO NOTHING`,
          [v.id, v.youtube_id, v.youtube_url, v.title, v.channel_title, v.duration_seconds, v.thumbnail_url, v.species, v.topic, v.summary]
        );

        for (let i = 0; i < v.fragments.length; i++) {
          const f = v.fragments[i];
          await execute(
            `INSERT INTO pet_video_fragments (
              id, video_id, question, answer, start_seconds, end_seconds, status, order_index, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO NOTHING`,
            [f.id, v.id, f.question, f.answer, f.start_seconds, f.end_seconds, i + 1]
          );
        }
      }
    } catch (err) {
      console.warn('[PetCareVideos] Aviso al inicializar semillas de videos:', err.message);
    }
  }

  /**
   * Lista pública: devuelve ÚNICAMENTE fichas aprobadas con filtros
   */
  async listApprovedVideos({ species = null, topic = null, search = null, page = 1, limit = 20 } = {}) {
    await this.ensureDefaultVideosSeeded();
    const conditions = ["status = 'approved'"];
    const params = [];

    if (species && species !== 'all') {
      conditions.push('species = ?');
      params.push(species.toLowerCase());
    }

    if (topic && topic !== 'all') {
      conditions.push('topic = ?');
      params.push(topic.toLowerCase());
    }

    if (search && search.trim().length > 0) {
      conditions.push('(title LIKE ? OR summary LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const offset = (Math.max(1, page) - 1) * limit;

    const countRows = await query(`SELECT COUNT(*) as total FROM pet_videos ${whereClause}`, params);
    const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

    const queryParams = [...params, Number(limit), Number(offset)];
    const videos = await query(
      `SELECT id, youtube_id, youtube_url, title, channel_title, duration_seconds,
              thumbnail_url, species, topic, summary, status, approved_at, broken_reports_count
       FROM pet_videos
       ${whereClause}
       ORDER BY approved_at DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    // Enriquecer con conteo de fragmentos verificados
    const videoIds = (videos || []).map(v => v.id);
    let fragmentsCountMap = {};

    if (videoIds.length > 0) {
      const placeholders = videoIds.map(() => '?').join(',');
      const frgRows = await query(
        `SELECT video_id, COUNT(*) as count FROM pet_video_fragments WHERE video_id IN (${placeholders}) GROUP BY video_id`,
        videoIds
      );
      if (frgRows) {
        for (const row of frgRows) {
          fragmentsCountMap[row.video_id] = Number(row.count);
        }
      }
    }

    const enriched = (videos || []).map(v => ({
      ...v,
      verified_fragments_count: fragmentsCountMap[v.id] || 0
    }));

    return {
      videos: enriched,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Detalle de un video con sus fragmentos aprobados
   */
  async getVideoDetail(videoId, { allowDraft = false } = {}) {
    const videoRows = await query('SELECT * FROM pet_videos WHERE id = ? OR youtube_id = ?', [videoId, videoId]);
    if (!videoRows || videoRows.length === 0) return null;

    const video = videoRows[0];
    if (!allowDraft && video.status !== 'approved') {
      return null; // Oculto al público si no está aprobado
    }

    const fragments = await query(
      'SELECT id, video_id, question, answer, start_seconds, end_seconds, order_index FROM pet_video_fragments WHERE video_id = ? ORDER BY order_index ASC',
      [video.id]
    );

    return {
      ...video,
      fragments: fragments || []
    };
  }

  /**
   * «Pregúntale al video»: busca primero en el video actual, luego en otros videos aprobados
   * y (cuando useGemini=true o es un video dinámico) utiliza Google Gemini + YouTube para responder y sugerir el mejor video.
   */
  async askQuestion(videoId, userQuestion, { useGemini = false } = {}) {
    if (!userQuestion || typeof userQuestion !== 'string' || userQuestion.trim().length === 0) {
      throw new Error('La pregunta no puede estar vacía.');
    }

    await this.ensureDefaultVideosSeeded();

    // 1. Obtener el video abierto (o permitir video dinámico de YouTube si useGemini=true)
    const isDynamicVideo = Boolean(useGemini || videoId === 'general' || String(videoId).startsWith('yt_'));
    const currentVideo = await this.getVideoDetail(videoId, { allowDraft: false });
    if (!currentVideo && !isDynamicVideo) {
      throw new Error('Video no encontrado o no disponible en el catálogo verificado.');
    }

    const currentFragments = currentVideo ? (currentVideo.fragments || []) : [];

    // 2. Obtener los demás videos aprobados con sus fragmentos (para fallback entre videos)
    const otherApprovedRows = currentVideo
      ? await query(
          "SELECT id, youtube_id, title, channel_title, species, topic FROM pet_videos WHERE status = 'approved' AND id != ?",
          [currentVideo.id]
        )
      : await query(
          "SELECT id, youtube_id, title, channel_title, species, topic FROM pet_videos WHERE status = 'approved'"
        );

    const otherVideosWithFragments = [];
    if (otherApprovedRows && otherApprovedRows.length > 0) {
      const otherIds = otherApprovedRows.map(v => v.id);
      const placeholders = otherIds.map(() => '?').join(',');
      const otherFrags = await query(
        `SELECT id, video_id, question, answer, start_seconds, end_seconds FROM pet_video_fragments WHERE video_id IN (${placeholders})`,
        otherIds
      );

      const fragsByVideo = {};
      if (otherFrags) {
        for (const f of otherFrags) {
          if (!fragsByVideo[f.video_id]) fragsByVideo[f.video_id] = [];
          fragsByVideo[f.video_id].push(f);
        }
      }

      for (const ov of otherApprovedRows) {
        otherVideosWithFragments.push({
          ...ov,
          fragments: fragsByVideo[ov.id] || []
        });
      }
    }

    // 3. Ejecutar correspondencia con el QuestionMatcher
    const matchResult = questionMatcher.matchQuestion({
      userQuestion: userQuestion.trim(),
      currentVideoFragments: currentFragments,
      otherVideosWithFragments
    });

    // 4. Si la coincidencia fue en el video actual, inyectar los metadatos del video actual
    if (matchResult.matched && matchResult.match_source === 'current_video' && currentVideo) {
      return {
        ...matchResult,
        video_id: currentVideo.id,
        youtube_id: currentVideo.youtube_id,
        video_title: currentVideo.title,
        channel_title: currentVideo.channel_title
      };
    }

    // 5. Si no hubo coincidencia en fragmentos locales y el cliente usa Gemini (modo interactivo)
    if (!matchResult.matched && isDynamicVideo) {
      try {
        const smartResult = await petVideoSmartSearch.smartSearch({
          text: userQuestion.trim(),
          allowYouTubeFallback: true
        });
        if (smartResult && smartResult.best_match) {
          const best = smartResult.best_match;
          return {
            matched: true,
            match_source: smartResult.source === 'youtube_live' ? 'gemini_youtube_ai' : 'other_video',
            ai_powered: true,
            provider: 'Google Gemini Cloud',
            answer: best.direct_answer || best.why_recommended,
            why_recommended: best.why_recommended,
            question_matched: smartResult.interpreted_need || userQuestion.trim(),
            start_seconds: best.start_seconds || 0,
            end_seconds: (best.start_seconds || 0) + 45,
            video_id: best.id,
            youtube_id: best.youtube_id,
            video_title: best.title,
            channel_title: best.channel_title,
            thumbnail_url: best.thumbnail_url,
            duration_seconds: best.duration_seconds,
            clinical_notice: matchResult.clinical_notice || (smartResult.is_medical_emergency ? questionMatcher.detectClinicalEmergency('vómito urgencia') : null),
            recommended_video: best
          };
        }
      } catch (err) {
        console.warn('[PetCareVideos] Error en asistencia Gemini para askQuestion:', err.message);
      }
    }

    return matchResult;
  }

  /**
   * Lista todos los videos para panel administrativo (drafts, approved, archived)
   */
  async listAllAdmin({ status = null, page = 1, limit = 50 } = {}) {
    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Math.max(1, page) - 1) * limit;

    const countRows = await query(`SELECT COUNT(*) as total FROM pet_videos ${whereClause}`, params);
    const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

    const rows = await query(
      `SELECT * FROM pet_videos ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return {
      videos: rows || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total
      }
    };
  }

  /**
   * Lista reportes de enlaces rotos para el administrador
   */
  async listBrokenReports() {
    const rows = await query(
      `SELECT r.id, r.video_id, r.reported_by, r.reason, r.created_at, v.title, v.youtube_id, v.youtube_url, v.status
       FROM pet_video_broken_reports r
       JOIN pet_videos v ON r.video_id = v.id
       ORDER BY r.created_at DESC LIMIT 50`
    );
    return rows || [];
  }

  /**
   * Buscador inteligente de videos para el cliente con IA Gemini
   */
  async smartSearch({ text, species = null, limit = 5, allowYouTubeFallback = true } = {}) {
    return await petVideoSmartSearch.smartSearch({ text, species, limit, allowYouTubeFallback });
  }
}

module.exports = new PetCareVideosService();

