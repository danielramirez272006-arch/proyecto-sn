const express = require('express');
const router = express.Router();
const conciergeController = require('./concierge-controller');

router.post('/voice-intent', (req, res, next) => conciergeController.handleVoiceIntent(req, res, next));
router.post('/vision-scan', (req, res, next) => conciergeController.handleVisionScan(req, res, next));
router.post('/plan-drafts', (req, res, next) => conciergeController.createPlanDraft(req, res, next));

module.exports = router;

