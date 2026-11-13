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

// Chequeo de latencia profunda y benchmarks en milisegundos
router.get('/health/deep', async (req, res) => {
  const t0 = Date.now();
  const benchmarks = {};

  // 1. Benchmark PostgreSQL / Supabase
  const tPg0 = Date.now();
  try {
    await query('SELECT 1 AS probe');
    benchmarks.postgres = { status: 'healthy', latency_ms: Date.now() - tPg0 };
  } catch (err) {
    benchmarks.postgres = { status: 'degraded', error: err.message, latency_ms: Date.now() - tPg0 };
  }

  // 2. Benchmark Supabase Cloud
  const tSb0 = Date.now();
  try {
    const sbStatus = await supabaseClient.checkHealth();
    benchmarks.supabase_cloud = { status: sbStatus.status, latency_ms: Date.now() - tSb0 };
  } catch (err) {
    benchmarks.supabase_cloud = { status: 'error', latency_ms: Date.now() - tSb0 };
  }

  // 3. Benchmark DeepSeek AI
  benchmarks.deepseek_ai = {
    configured: deepSeekClient.isConfigured(),
    status: deepSeekClient.isConfigured() ? 'active' : 'local_heuristic_mode',
    model: deepSeekClient.model
  };

  const totalDurationMs = Date.now() - t0;
  return success(res, {
    overall_status: benchmarks.postgres.status === 'healthy' ? 'healthy' : 'degraded',
    total_probe_duration_ms: totalDurationMs,
    benchmarks,
    probed_at: new Date().toISOString()
  });
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
router.get('/places/smart-search', async (req, res, next) => {
  try {
    const { q, query: textQuery, lat, lng, limit } = req.query;
    const searchText = q || textQuery;
    const smartSearchService = require('../../modules/places/places-smart-search');
    const results = await smartSearchService.smartSearch({
      text: searchText,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      limit: limit ? parseInt(limit, 10) : 10,
      language: req.locale || 'es'
    });
    return success(res, results, { total: results.length });
  } catch (err) {
    next(err);
  }
});

router.get('/places/export/geojson', async (req, res, next) => {
  try {
    const places = await placesRepository.findAll({ limit: 200 });
    const { placesToGeoJson } = require('../utils/export-formats');
    const geojson = placesToGeoJson(places);
    res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="lugares-costa-rica.geojson"');
    return res.json(geojson);
  } catch (err) {
    next(err);
  }
});

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

// 6. Montaje de Módulos de Dominio y Servicios Enterprise
router.use('/i18n', require('../i18n/i18n-routes'));
router.use('/storage', require('../../modules/storage').storageRoutes);
router.post('/webhooks/supabase', (req, res) => require('../webhooks/supabase-webhook-handler').handleWebhook(req, res));
router.get('/cache/stats', (req, res) => {
  const { ttlCache } = require('../cache/ttl-cache-service');
  return success(res, ttlCache.getStats());
});

// Exportación en formato iCalendar RFC 5545 (todos los eventos)
router.get('/events/export/ics', async (req, res, next) => {
  try {
    const eventsService = require('../../modules/events/events-service');
    const events = await eventsService.listEvents({ limit: 100 });
    const { eventsToIcs } = require('../utils/export-formats');
    const icsContent = eventsToIcs(events);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="eventos-costa-rica.ics"');
    return res.send(icsContent);
  } catch (err) {
    next(err);
  }
});

// Exportación individual de evento en formato iCalendar RFC 5545
router.get('/events/:id/export/ics', async (req, res, next) => {
  try {
    const eventsService = require('../../modules/events/events-service');
    const event = await eventsService.getEventById(req.params.id);
    if (!event) return res.status(404).json({ ok: false, error: { message: 'Evento no encontrado' } });
    const { eventToIcs } = require('../utils/export-formats');
    const icsContent = eventToIcs(event);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="evento-${event.id}.ics"`);
    return res.send(icsContent);
  } catch (err) {
    next(err);
  }
});

// Escaneo inteligente de tickets y facturas con DeepSeek AI
router.post('/social/scan-invoice', async (req, res, next) => {
  try {
    const { text, content_base64 } = req.body || {};
    let invoiceText = text;
    if (!invoiceText && content_base64) {
      invoiceText = Buffer.from(content_base64, 'base64').toString('utf8');
    }
    const invoiceExtractor = require('../../autonomous-agents/consensus-moderator-agent/invoice-price-extractor');
    const result = await invoiceExtractor.extractFromText(invoiceText || '');
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// Matcher inteligente de mascotas extraviadas con DeepSeek AI
router.post('/rescue/match-pet', async (req, res, next) => {
  try {
    const { lost_pet, found_pets, max_distance_km } = req.body || {};
    const petMatcher = require('../../autonomous-agents/consensus-moderator-agent/lost-pet-visual-matcher');
    const matches = await petMatcher.matchPets(lost_pet, found_pets || [], max_distance_km ? parseFloat(max_distance_km) : 5.0);
    return success(res, matches, { total_matches: matches.length });
  } catch (err) {
    next(err);
  }
});

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
