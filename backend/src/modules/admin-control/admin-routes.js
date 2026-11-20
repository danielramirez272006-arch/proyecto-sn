const express = require('express');
const router = express.Router();
const adminController = require('./admin-controller');
const placeCorrectionReviewController = require('./place-correction-review-controller');
const { requireAdmin } = require('../../shared/middlewares/auth-role-guard');

// Proteger todas las rutas de administración
router.use(requireAdmin);

// Gestión de usuarios registrados (solo administradores exclusivos)
router.get('/users', (req, res, next) => adminController.listUsers(req, res, next));

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

// Orquestador de agentes autónomos y ejecución forzada
router.get('/agents/status', (req, res) => adminController.getAgentsStatus(req, res));
router.post('/agents/:jobName/run', (req, res, next) => adminController.runAgentJob(req, res, next));

// Catálogo «Videos para cuidar a tu mascota»
router.use('/pet-videos', require('../vet-hub').petCareVideosAdminRoutes);

// Telemetría del copiloto IA, auditoría y consultas directas con DeepSeek
router.get('/telemetry', (req, res) => adminController.getCopilotTelemetry(req, res));
router.post('/ai/query', (req, res, next) => adminController.runAdminAiQuery(req, res, next));
router.get('/audit-logs', (req, res, next) => adminController.getAuditLogs(req, res, next));

// Gestión administrativa de usuarios y roles
router.get('/users', (req, res, next) => adminController.listUsers(req, res, next));
router.patch('/users/:id/role', (req, res, next) => adminController.updateUserRole(req, res, next));

// Verificación pet-friendly de establecimientos y automatización n8n
router.put('/places/:id/pet-policy', (req, res, next) => adminController.upsertPlacePetPolicy(req, res, next));
router.post('/places/:id/pet-confirm', (req, res, next) => adminController.confirmPlacePetPolicy(req, res, next));
router.post('/places/:id/pet-outdated', (req, res, next) => adminController.markPlacePetOutdated(req, res, next));
router.post('/places/:id/pet-resolve-conflict', (req, res, next) => adminController.resolvePlacePetConflict(req, res, next));
router.delete('/places/:id/pet-confirm', (req, res, next) => adminController.withdrawPlacePetConfirmation(req, res, next));
router.get('/pet-automation/events', (req, res, next) => adminController.scanPetAutomationEvents(req, res, next));
router.post('/pet-automation/confirmations', (req, res, next) => adminController.recordPetAutomationConfirmation(req, res, next));

module.exports = router;
