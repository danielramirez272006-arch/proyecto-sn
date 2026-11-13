const express = require('express');
const router = express.Router();
const controller = require('./pet-care-videos-controller');

// Rutas Públicas del Catálogo «Videos para cuidar a tu mascota»
router.get('/', (req, res, next) => controller.listApprovedVideos(req, res, next));
router.get('/:id', (req, res, next) => controller.getVideoDetail(req, res, next));
router.post('/:id/questions', (req, res, next) => controller.askQuestion(req, res, next));
router.post('/:id/report-broken', (req, res, next) => controller.reportBrokenLink(req, res, next));

module.exports = router;

