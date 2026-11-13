const express = require('express');
const router = express.Router();
const groupPlanController = require('./group-plan-controller');
const socialController = require('./social-controller');
const { authenticateOptional } = require('../../shared/middlewares/auth-role-guard');

// Planes
router.post('/plans', authenticateOptional, (req, res, next) => groupPlanController.createPlan(req, res, next));
router.get('/plans/:code', authenticateOptional, (req, res, next) => groupPlanController.getPlan(req, res, next));
router.put('/plans/:code', authenticateOptional, (req, res, next) => groupPlanController.updateManual(req, res, next));
router.post('/plans/:code/guests', (req, res, next) => groupPlanController.joinAsGuest(req, res, next));
router.put('/plans/:code/votes/:optionId', (req, res, next) => groupPlanController.vote(req, res, next));
router.post('/plans/:code/confirm', authenticateOptional, (req, res, next) => groupPlanController.confirm(req, res, next));
router.post('/plans/:code/proposals/:id/decision', authenticateOptional, (req, res, next) => groupPlanController.decideProposal(req, res, next));
router.get('/plans/:code/stream', (req, res) => socialController.subscribePlanStream(req, res));

// Herramientas de mesa y grupales
router.post('/midpoint', (req, res, next) => socialController.midpoint(req, res, next));
router.post('/split-bill', (req, res, next) => socialController.splitBill(req, res, next));
router.post('/sinpe-sms', (req, res, next) => socialController.sinpeSms(req, res, next));

module.exports = router;

