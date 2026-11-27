const express = require('express');
const router = express.Router();
const ragService = require('./rag-service');
const { requireAdmin } = require('../../shared/middlewares/auth-role-guard');
const { success, badRequest } = require('../../shared/utils/http-response');

// Búsqueda híbrida RAG (Base de conocimiento + locales reales de Supabase)
router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || req.query.query || '').trim();
    if (!q) {
      return badRequest(res, 'El parámetro q es requerido para buscar en el RAG.');
    }
    if (q.length > 500) return badRequest(res, 'La búsqueda admite hasta 500 caracteres.');
    const maxDocs = Math.min(8, Math.max(1, parseInt(req.query.docs || '3', 10) || 3));
    const maxPlaces = Math.min(8, Math.max(1, parseInt(req.query.places || '4', 10) || 4));
    const result = await ragService.retrieveContext(q, {
      maxDocs,
      maxPlaces,
      includePlaces: req.query.include_places === 'false' ? false : true,
    });
    return success(res, {
      query: q,
      documents: result.documents,
      places: result.places,
    }, {
      total_documents: result.documents.length,
      total_places: result.places.length,
    });
  } catch (err) {
    next(err);
  }
});

// Listar documentos indexados en la base de conocimiento RAG (solo Admin)
router.get('/documents', requireAdmin, async (req, res, next) => {
  try {
    const docs = await ragService.listDocuments({
      category: req.query.category || null,
      sourceType: req.query.source_type || null,
    });
    return success(res, docs, { total: docs.length });
  } catch (err) {
    next(err);
  }
});

// Crear o actualizar documento en el RAG (solo Admin)
router.post('/documents', requireAdmin, async (req, res, next) => {
  try {
    const { id, title, category, source_ref, tags, content, published } = req.body || {};
    const doc = await ragService.upsertDocument({
      id,
      title,
      category,
      published: published === true,
      sourceRef: source_ref || null,
      tags,
      content,
    });
    return success(res, doc, {}, 201);
  } catch (err) {
    if (err.status === 400) return badRequest(res, err.message);
    next(err);
  }
});

// Eliminar un documento del RAG (solo Admin)
router.delete('/documents/:id', requireAdmin, async (req, res, next) => {
  try {
    const result = await ragService.deleteDocument(req.params.id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
