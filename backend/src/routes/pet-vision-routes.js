const express = require('express');
const router = express.Router();
const petVisionController = require('../controllers/pet-vision-controller');
const { authenticateOptional } = require('../shared/middlewares/auth-role-guard');
const { aiLimiter } = require('../shared/middlewares/rate-limiter');

// GET /api/pets/analyze-photo/focus-areas — Catálogo de 10 áreas clínicas soportadas
router.get('/analyze-photo/focus-areas', (req, res) =>
  petVisionController.getFocusAreas(req, res)
);

// POST /api/pets/analyze-photo — Análisis multimodal (1 a 3 fotos) + derivación veterinaria GAM
router.post('/analyze-photo', authenticateOptional, aiLimiter, (req, res, next) =>
  petVisionController.analyzePhoto(req, res, next)
);

// POST /api/pets/analyze-photo/follow-up — Seguimiento evolutivo comparando contra previous_analysis_id
router.post('/analyze-photo/follow-up', authenticateOptional, aiLimiter, (req, res, next) =>
  petVisionController.compareFollowUp(req, res, next)
);

// GET /api/pets/analyze-photo/history — Historial reciente en ai_interaction_logs
router.get('/analyze-photo/history', authenticateOptional, (req, res, next) =>
  petVisionController.listHistory(req, res, next)
);

// GET /api/pets/analyze-photo/:analysisId — Consultar detalle de un reporte generado
router.get('/analyze-photo/:analysisId', authenticateOptional, (req, res) =>
  petVisionController.getAnalysisById(req, res)
);

module.exports = router;
