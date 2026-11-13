const express = require('express');
const router = express.Router();
const conciergeController = require('./concierge-controller');

router.get('/status', (req, res, next) => conciergeController.getAiStatus(req, res, next));
router.post('/voice-intent', (req, res, next) => conciergeController.handleVoiceIntent(req, res, next));
router.post('/chat', (req, res, next) => conciergeController.handleChat(req, res, next));
router.post('/multi-day-itinerary', (req, res, next) => conciergeController.handleMultiDayItinerary(req, res, next));
router.post('/deep-reason', (req, res, next) => conciergeController.handleDeepReason(req, res, next));
router.post('/vision-scan', (req, res, next) => conciergeController.handleVisionScan(req, res, next));
router.post('/plan-drafts', (req, res, next) => conciergeController.createPlanDraft(req, res, next));

module.exports = router;
