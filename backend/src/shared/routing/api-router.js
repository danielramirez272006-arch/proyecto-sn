const express = require('express');
const router = express.Router();

const { checkHealth, query } = require('../config/database');
const { success } = require('../utils/http-response');
const deepSeekClient = require('../config/deepseek-config');
const { scheduler } = require('../../autonomous-agents');
const { openApiSpec, renderSwaggerUiHtml } = require('../docs/swagger-ui-handler');
const placesRepository = require('../../modules/places/places-repository');

// 1. Documentación Interactiva OpenAPI / Swagger UI
router.get('/docs/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.json(openApiSpec);
});

router.get('/docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(renderSwaggerUiHtml('/api/docs/openapi.json'));
});

// 2. Chequeo de Salud del Backend
router.get('/health', (req, res) => {
  return success(res, {
    status: 'healthy',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'Sistema de Sinergia Urbana Costa Rica API',
    ai_copilot: 'DeepSeek AI Active',
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

// Chequeo de telemetría completa del sistema
router.get('/health/system', async (req, res, next) => {
  try {
    const mem = process.memoryUsage();
    const dbHealth = await checkHealth();
    const aiStatus = deepSeekClient.getMetrics();
    const agentsStatus = scheduler.getStatus();

    return success(res, {
      system: {
        node_version: process.version,
        platform: process.platform,
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        memory: {
          rss_mb: Math.round(mem.rss / 1024 / 1024),
          heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024)
        }
      },
      database: dbHealth,
      ai_copilot: aiStatus,
      autonomous_agents: agentsStatus
    });
  } catch (err) {
    next(err);
  }
});

// 3. Catálogo Compartido de Lugares
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

// 4. Montaje de Módulos de Dominio
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
