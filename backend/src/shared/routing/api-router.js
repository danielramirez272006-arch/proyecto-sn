const express = require('express');
const router = express.Router();

const { checkHealth } = require('../config/database');
const { success } = require('../utils/http-response');
const placesRepository = require('../../modules/places/places-repository');

// 1. Chequeo de Salud del Backend
router.get('/health', (req, res) => {
  return success(res, {
    status: 'healthy',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'Sistema de Sinergia Urbana Costa Rica API',
    version: '1.0.0',
    mode: process.env.NODE_ENV || 'development'
  });
});

// Chequeo de disponibilidad de la base de datos por separado
router.get('/health/db', async (req, res, next) => {
  try {
    const health = await checkHealth();
    return success(res, health);
  } catch (err) {
    next(err);
  }
});

// 2. Catálogo Compartido de Lugares
router.get('/places', async (req, res, next) => {
  try {
    const { category, verified_only, search, limit, offset } = req.query;
    const places = await placesRepository.findAll({
      category,
      verifiedOnly: verified_only === 'true',
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return success(res, places, { total: places.length });
  } catch (err) {
    next(err);
  }
});

// 3. Montaje de Módulos de Dominio
router.use('/auth', require('../../modules/auth').authRoutes);
router.use('/events', require('../../modules/events').eventsRoutes);
router.use('/social', require('../../modules/social-dining').socialRoutes);
router.use('/admin', require('../../modules/admin-control').adminRoutes);
router.use('/concierge', require('../../modules/voice-ai-concierge').conciergeRoutes);
router.use('/synergy', require('../../modules/synergy-engine').synergyRoutes);
router.use('/a11y', require('../../modules/accessibility').a11yRoutes);
router.use('/weather', require('../../modules/weather-activities').weatherRoutes);
router.use('/food', require('../../modules/food-radar').foodRoutes);
router.use('/vet', require('../../modules/vet-hub').vetRoutes);
router.use('/businesses', require('../../modules/businesses').businessesRoutes);
router.use('/live', require('../../modules/live-map-waze').liveMapRoutes);
router.use('/rescue', require('../../modules/urban-rescue').rescueRoutes);
router.use('/client', require('../../modules/client-dashboard').clientRoutes);

module.exports = router;

