const express = require('express');
const router = express.Router();
const rescueController = require('./rescue-controller');

router.get('/roadside', (req, res) => rescueController.getRoadside(req, res));
router.get('/survival-stops', (req, res) => rescueController.getSurvivalStops(req, res));
router.get('/ev-chargers', (req, res) => rescueController.getEvChargers(req, res));
router.get('/sos', (req, res) => rescueController.getSosReports(req, res));
router.post('/sos', (req, res, next) => rescueController.createSosReport(req, res, next));

module.exports = router;
