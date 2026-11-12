const express = require('express');
const router = express.Router();
const a11yController = require('./a11y-controller');

router.get('/flat-route', (req, res, next) => a11yController.getFlatRoute(req, res, next));
router.get('/sensory-places', (req, res, next) => a11yController.getSensoryPlaces(req, res, next));
router.post('/barrier-report', (req, res, next) => a11yController.reportBarrier(req, res, next));

module.exports = router;

