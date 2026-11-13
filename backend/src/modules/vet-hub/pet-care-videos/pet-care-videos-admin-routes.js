const express = require('express');
const router = express.Router();
const controller = require('./pet-care-videos-controller');
const { requireAdmin } = require('../../../shared/middlewares/auth-role-guard');

// Proteger todas las rutas administrativas de videos
router.use(requireAdmin);

router.get('/search-youtube', (req, res, next) => controller.searchYouTube(req, res, next));
router.post('/register', (req, res, next) => controller.registerVideo(req, res, next));
router.post('/:id/analyze', (req, res, next) => controller.analyzeVideo(req, res, next));
router.put('/:id', (req, res, next) => controller.updateVideo(req, res, next));
router.post('/:id/approve', (req, res, next) => controller.approveVideo(req, res, next));
router.post('/:id/retire', (req, res, next) => controller.retireVideo(req, res, next));
router.get('/', (req, res, next) => controller.listAllAdmin(req, res, next));
router.get('/broken-reports', (req, res, next) => controller.listBrokenReports(req, res, next));

module.exports = router;

