const express = require('express');
const router = express.Router();
const synergyController = require('./synergy-controller');
const { cacheGuard } = require('../../shared/middlewares/cache-guard');

router.get('/combo-route', cacheGuard(300000), (req, res, next) => synergyController.getComboRoute(req, res, next));
router.get('/trip-cost', (req, res, next) => synergyController.getTripCost(req, res, next));
router.get('/shelter', (req, res, next) => synergyController.getShelter(req, res, next));
router.get('/holiday-escape', cacheGuard(3600000), (req, res, next) => synergyController.getHolidayEscape(req, res, next));

module.exports = router;

