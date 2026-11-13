const express = require('express');
const router = express.Router();

const { checkHealth, query } = require('../config/database');
const { success } = require('../utils/http-response');
const deepSeekClient = require('../config/deepseek-config');
const supabaseClient = require('../config/supabase-config');
const metricsCollector = require('../telemetry/metrics-collector');
const { scheduler } = require('../../autonomous-agents');
const { openApiSpec, renderSwaggerUiHtml } = require('../docs/swagger-ui-handler');
const placesRepository = require('../../modules/places/places-repository');
const auditService = require('../audit/audit-service');
const { requireAdmin } = require('../middlewares/auth-role-guard');

// 1. Documentación Interactiva OpenAPI / Swagger UI
router.get('/docs/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.json(openApiSpec);
});

router.get('/docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(renderSwaggerUiHtml('/api/docs/openapi.json'));
});

// 2. Métricas Estándar Prometheus
router.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  return res.send(metricsCollector.toPrometheusFormat());
});

// 3. Chequeo de Salud del Backend
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

// Chequeo de conexión y estado de Supabase Cloud
router.get('/health/supabase', async (req, res) => {
  const status = await supabaseClient.checkHealth();
  return success(res, status);
});

// Chequeo de telemetría completa del sistema
router.get('/health/system', async (req, res, next) => {
  try {
    const mem = process.memoryUsage();
    const dbHealth = await checkHealth();
    const supabaseHealth = await supabaseClient.checkHealth();
    const aiStatus = deepSeekClient.getMetrics();
    const agentsStatus = scheduler.getStatus();
    const metricsSummary = metricsCollector.getMetricsSummary();

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
      supabase: supabaseHealth,
      ai_copilot: aiStatus,
      autonomous_agents: agentsStatus,
      http_telemetry: metricsSummary.http
    });
  } catch (err) {
    next(err);
  }
});

// 4. Catálogo Compartido de Lugares (con Paginación Avanzada y Filtro Radial GPS)
router.get('/places', async (req, res, next) => {
  try {
    const { category, verified_only, search, page, limit, offset, lat, lng, radius_km, sort_by, sort_order } = req.query;

    if (page || lat || radius_km || sort_by) {
      const paginatedResult = await placesRepository.findPaginated({
        category,
        verifiedOnly: verified_only === 'true',
        search,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        radiusKm: radius_km ? parseFloat(radius_km) : undefined,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        sortBy: sort_by || 'name',
        sortOrder: sort_order || 'ASC'
      });
      return success(res, paginatedResult.items, paginatedResult.pagination);
    }

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

// 5. Pista de Auditoría Enterprise (Admin)
router.get('/audit/history', requireAdmin, async (req, res, next) => {
  try {
    const { resource, resource_id, user_id, limit, offset } = req.query;
    const history = await auditService.getHistory({
      resource,
      resourceId: resource_id,
      userId: user_id,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    return success(res, history, { total: history.length });
  } catch (err) {
    next(err);
  }
});

// 6. Montaje de Módulos de Dominio
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
