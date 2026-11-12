const express = require('express');
const router = express.Router();
const weatherController = require('./weather-controller');
const { cacheGuard } = require('../../shared/middlewares/cache-guard');

router.get('/forecast', cacheGuard(300000), (req, res, next) => weatherController.getForecast(req, res, next));
router.get('/doppler', cacheGuard(120000), (req, res, next) => weatherController.getDoppler(req, res, next));
router.get('/indices', cacheGuard(600000), (req, res, next) => weatherController.getIndices(req, res, next));
router.get('/marine-hazards', cacheGuard(600000), (req, res, next) => weatherController.getMarineHazards(req, res, next));

module.exports = router;

