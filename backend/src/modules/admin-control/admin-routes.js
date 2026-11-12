const express = require('express');
const router = express.Router();
const adminController = require('./admin-controller');
const placeCorrectionReviewController = require('./place-correction-review-controller');
const { requireAdmin } = require('../../shared/middlewares/auth-role-guard');

// Proteger todas las rutas de administración
router.use(requireAdmin);

// Gestión y reprogramación de eventos
router.patch('/events/:id', (req, res, next) => adminController.patchEvent(req, res, next));

// Catálogo de locales y candado humano
router.post('/places', (req, res, next) => adminController.createPlace(req, res, next));
router.put('/places/:id', (req, res, next) => adminController.updatePlace(req, res, next));
router.put('/places/:id/lock', (req, res, next) => adminController.setPlaceLock(req, res, next));
router.get('/duplicates', (req, res, next) => adminController.getDuplicateCandidates(req, res, next));
router.post('/merge-duplicates', (req, res, next) => adminController.mergePlaces(req, res, next));

// Cola de correcciones propuestas por comercios/usuarios
router.get('/corrections', (req, res, next) => placeCorrectionReviewController.listCorrections(req, res, next));
router.post('/corrections/:id/decision', (req, res, next) => placeCorrectionReviewController.decideCorrection(req, res, next));

// Monitoreo de notificaciones y reintentos manuales
router.get('/notifications', (req, res, next) => adminController.getNotificationsStatus(req, res, next));
router.post('/notifications/:id/retry', (req, res, next) => adminController.retryNotification(req, res, next));

// Telemetría del copiloto IA y agentes autónomos
router.get('/telemetry', (req, res) => adminController.getCopilotTelemetry(req, res));
router.get('/audit-logs', (req, res, next) => adminController.getAuditLogs(req, res, next));

module.exports = router;

