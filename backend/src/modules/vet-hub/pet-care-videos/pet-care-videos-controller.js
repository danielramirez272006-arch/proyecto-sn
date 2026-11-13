const petCareVideosService = require('./pet-care-videos-service');
const { success, failure, notFound, badRequest } = require('../../../shared/utils/http-response');

class PetCareVideosController {
  /**
   * GET /api/admin/pet-videos/search-youtube
   */
  async searchYouTube(req, res, next) {
    try {
      const q = req.query.q || req.query.query || 'cuidado de mascotas';
      const maxResults = req.query.max_results ? parseInt(req.query.max_results, 10) : 8;
      const result = await petCareVideosService.searchYouTube(q, maxResults);
      return success(res, result.videos, {
        provider: result.provider,
        is_live: result.is_live,
        total_results: result.total_results,
        note: result.note
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/pet-videos/register
   */
  async registerVideo(req, res, next) {
    try {
      const { url, youtube_id } = req.body || {};
      if (!url && !youtube_id) {
        return badRequest(res, 'Debe proporcionar la URL o el identificador canónico del video de YouTube.');
      }
      const createdBy = req.user?.id || req.user?.username || 'admin';
      const video = await petCareVideosService.registerVideo({ url, youtubeId: youtube_id, createdBy });
      return success(res, video, { already_registered: video.already_registered }, video.already_registered ? 200 : 201);
    } catch (err) {
      if (err.message.includes('única fuente') || err.message.includes('HTTPS') || err.message.includes('ID canónico')) {
        return badRequest(res, err.message);
      }
      next(err);
    }
  }

  /**
   * POST /api/admin/pet-videos/:id/analyze
   */
  async analyzeVideo(req, res, next) {
    try {
      const forceReanalyze = Boolean(req.body?.force_reanalyze || req.query.force === 'true');
      const result = await petCareVideosService.analyzeVideo(req.params.id, { forceReanalyze });
      return success(res, result, result.analysis_meta || {});
    } catch (err) {
      if (err.message.includes('no encontrado')) {
        return notFound(res, err.message);
      }
      next(err);
    }
  }

  /**
   * PUT /api/admin/pet-videos/:id
   */
  async updateVideo(req, res, next) {
    try {
      const { title, species, topic, summary, fragments } = req.body || {};
      const updated = await petCareVideosService.updateVideo(req.params.id, {
        title,
        species,
        topic,
        summary,
        fragments
      });
      return success(res, updated);
    } catch (err) {
      if (err.message.includes('no encontrado')) {
        return notFound(res, err.message);
      }
      next(err);
    }
  }

  /**
   * POST /api/admin/pet-videos/:id/approve
   */
  async approveVideo(req, res, next) {
    try {
      const approvedBy = req.user?.id || req.user?.username || 'admin';
      const approved = await petCareVideosService.approveVideo(req.params.id, approvedBy);
      return success(res, approved);
    } catch (err) {
      if (err.message.includes('no encontrado')) {
        return notFound(res, err.message);
      }
      if (err.message.includes('sin al menos un fragmento')) {
        return badRequest(res, err.message);
      }
      next(err);
    }
  }

  /**
   * POST /api/admin/pet-videos/:id/retire
   */
  async retireVideo(req, res, next) {
    try {
      const retiredBy = req.user?.id || req.user?.username || 'admin';
      const retired = await petCareVideosService.retireVideo(req.params.id, retiredBy);
      return success(res, retired);
    } catch (err) {
      if (err.message.includes('no encontrado')) {
        return notFound(res, err.message);
      }
      next(err);
    }
  }

  /**
   * GET /api/admin/pet-videos
   */
  async listAllAdmin(req, res, next) {
    try {
      const { status, page, limit } = req.query;
      const list = await petCareVideosService.listAllAdmin({
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50
      });
      return success(res, list.videos, { pagination: list.pagination });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/pet-videos/broken-reports
   */
  async listBrokenReports(req, res, next) {
    try {
      const reports = await petCareVideosService.listBrokenReports();
      return success(res, reports, { total: reports.length });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/pet-videos (Público)
   */
  async listApprovedVideos(req, res, next) {
    try {
      const { species, topic, search, page, limit } = req.query;
      const result = await petCareVideosService.listApprovedVideos({
        species,
        topic,
        search,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20
      });
      return success(res, result.videos, { pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/pet-videos/:id (Público)
   */
  async getVideoDetail(req, res, next) {
    try {
      const video = await petCareVideosService.getVideoDetail(req.params.id, { allowDraft: false });
      if (!video) {
        return notFound(res, 'Video no encontrado o no disponible en el catálogo verificado.');
      }
      return success(res, video);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/pet-videos/:id/questions (Público: «Pregúntale al video»)
   */
  async askQuestion(req, res, next) {
    try {
      const question = req.body?.question || req.body?.pregunta;
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return badRequest(res, 'Debe formular una pregunta en el cuerpo de la solicitud.');
      }
      const useGemini = Boolean(req.body?.use_gemini);
      const result = await petCareVideosService.askQuestion(req.params.id, question, { useGemini });
      return success(res, result);
    } catch (err) {
      if (err.message.includes('no encontrado') || err.message.includes('no disponible')) {
        return notFound(res, err.message);
      }
      next(err);
    }
  }

  /**
   * GET o POST /api/pet-videos/search (o /smart-search)
   * Buscador inteligente de videos para el cliente con IA Gemini
   */
  async smartSearch(req, res, next) {
    try {
      const text = req.body?.text || req.body?.query || req.body?.q || req.query?.q || req.query?.query || req.query?.text;
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return badRequest(res, 'Debe proporcionar un texto de búsqueda o necesidad para buscar con Gemini.');
      }
      const species = req.body?.species || req.query?.species || null;
      const limit = req.body?.limit ? parseInt(req.body.limit, 10) : (req.query?.limit ? parseInt(req.query.limit, 10) : 5);
      const allowYouTubeFallback = req.body?.allow_youtube !== undefined ? Boolean(req.body.allow_youtube) : true;

      const result = await petCareVideosService.smartSearch({
        text,
        species,
        limit,
        allowYouTubeFallback
      });

      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/pet-videos/:id/report-broken (Público: Reportar enlace roto)
   */
  async reportBrokenLink(req, res, next) {
    try {
      const reportedBy = req.user?.id || req.body?.reported_by || 'anon';
      const reason = req.body?.reason || 'Video no disponible en YouTube';
      const result = await petCareVideosService.reportBrokenLink(req.params.id, { reportedBy, reason });
      return success(res, result);
    } catch (err) {
      if (err.message.includes('no encontrado')) {
        return notFound(res, err.message);
      }
      next(err);
    }
  }
}

module.exports = new PetCareVideosController();

