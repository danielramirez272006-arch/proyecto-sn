const express = require('express');
const router = express.Router();
const liveMapController = require('./live-map-controller');
const { validateGpsCoords } = require('../../shared/middlewares/gps-validator');

router.get('/pins', (req, res, next) => liveMapController.getPins(req, res, next));
router.get('/outages', (req, res) => liveMapController.getOutages(req, res));
router.post('/report', validateGpsCoords, (req, res) => liveMapController.postReport(req, res));
router.get('/stream', (req, res) => liveMapController.subscribeStream(req, res));

module.exports = router;

