const express = require('express');
const router = express.Router();

const { checkHealth, query } = require('../config/database');
const { success } = require('../utils/http-response');
const deepSeekClient = require('../config/deepseek-config');
const geminiClient = require('../config/gemini-config');
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
    client_ai: 'Google Gemini',
    admin_ai: 'DeepSeek AI',
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

  // 3. Benchmark DeepSeek AI (Admin) y Gemini AI (Client)
  benchmarks.deepseek_ai = {
    configured: deepSeekClient.isConfigured(),
    status: deepSeekClient.isConfigured() ? 'active' : 'local_heuristic_mode',
    model: deepSeekClient.model,
    role: 'admin'
  };
  benchmarks.gemini_ai = {
    configured: geminiClient.isConfigured(),
    status: geminiClient.isConfigured() ? 'active' : 'local_heuristic_mode',
    model: geminiClient.model,
    role: 'client'
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
    const deepSeekStatus = deepSeekClient.getMetrics();
    const geminiStatus = geminiClient.getMetrics();
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
      ai_copilot: {
        ...deepSeekStatus,
        client_provider: 'Google Gemini',
        admin_provider: 'DeepSeek',
        client: geminiStatus,
        admin: deepSeekStatus
      },
      client_ai: geminiStatus,
      admin_ai: deepSeekStatus,
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

// ============================================================================
// 1. Auditoría Inmutable Criptográfica (Hash Chain Ledger)
// ============================================================================
const hashChainService = require('../audit/hash-chain-service');

router.get('/audit/verify-chain', async (req, res, next) => {
  try {
    const verification = await hashChainService.verifyChain();
    return success(res, verification);
  } catch (err) {
    next(err);
  }
});

router.post('/audit/chain', async (req, res, next) => {
  try {
    const { record_id, entity_type, action, actor_id, data } = req.body || {};
    if (!record_id || !entity_type || !action) {
      return res.status(400).json({ ok: false, error: { message: 'record_id, entity_type y action son obligatorios' } });
    }
    const block = await hashChainService.recordBlock({
      recordId: record_id,
      entityType: entity_type,
      action,
      actorId: actor_id,
      data
    });
    return success(res, block, {}, 201);
  } catch (err) {
    next(err);
  }
});

router.get('/audit/chain/:entityType/:recordId', async (req, res, next) => {
  try {
    const trail = await hashChainService.getTrail(req.params.entityType, req.params.recordId);
    return success(res, trail, { total: trail.length });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. Notificaciones Multicanal & Patrón Outbox
// ============================================================================
const multichannelService = require('../../modules/notifications/multichannel-notification-service');

router.get('/notifications/vapid-public-key', (req, res) => {
  return success(res, { public_key: multichannelService.getVapidPublicKey() });
});

router.post('/notifications/subscribe', async (req, res, next) => {
  try {
    const { user_id, endpoint, keys } = req.body || {};
    const sub = await multichannelService.subscribePush({
      userId: user_id,
      endpoint,
      keys,
      userAgent: req.headers['user-agent']
    });
    return success(res, sub, {}, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/queue', async (req, res, next) => {
  try {
    const { channel, recipient, type, payload, title, priority } = req.body || {};
    if (!recipient || !type) {
      return res.status(400).json({ ok: false, error: { message: 'recipient y type son obligatorios' } });
    }
    const result = await multichannelService.queueNotification({
      channel: channel || 'email',
      recipient,
      type,
      payload,
      title,
      priority
    });
    return success(res, result, {}, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/outbox/process', async (req, res, next) => {
  try {
    const results = await multichannelService.processOutboxBatch(req.body?.batch_size || 10);
    return success(res, results, { processed: results.length });
  } catch (err) {
    next(err);
  }
});

router.get('/notifications/outbox/status', async (req, res, next) => {
  try {
    const stats = await multichannelService.getQueueStats();
    return success(res, stats);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 3. Generador y Verificador Criptográfico de Códigos QR
// ============================================================================
const cryptoQrService = require('../security/crypto-qr-service');

router.post('/security/qr/generate', async (req, res, next) => {
  try {
    const { type, ref_id, ttl_seconds, metadata } = req.body || {};
    if (!ref_id) {
      return res.status(400).json({ ok: false, error: { message: 'ref_id es requerido para generar QR' } });
    }
    const qr = await cryptoQrService.generateQr({
      type: type || 'event_checkin',
      refId: ref_id,
      ttlSeconds: ttl_seconds !== undefined ? Number(ttl_seconds) : 86400,
      metadata: metadata || {}
    });
    return success(res, qr, {}, 201);
  } catch (err) {
    next(err);
  }
});

router.get('/security/qr/inspect/:token', (req, res) => {
  const inspection = cryptoQrService.inspectQr(req.params.token);
  if (!inspection.valid) {
    return res.status(400).json({ ok: false, error: { message: inspection.error, expired: inspection.expired } });
  }
  return success(res, inspection);
});

router.post('/security/qr/redeem', async (req, res, next) => {
  try {
    const { token, redeemed_by } = req.body || {};
    if (!token) {
      return res.status(400).json({ ok: false, error: { message: 'token es requerido' } });
    }
    const result = await cryptoQrService.redeemQr(token, redeemed_by || 'system');
    if (!result.valid) {
      return res.status(400).json({ ok: false, error: { message: result.error, already_redeemed: result.already_redeemed } });
    }
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 4. Movilidad Sostenible y Huella de Carbono (Costa Rica MINAE / IMN)
// ============================================================================
const carbonFootprintService = require('../../modules/mobility/carbon-footprint-service');

router.get('/mobility/gam-transit-factors', (req, res) => {
  const factors = carbonFootprintService.getGamTransitFactors();
  return success(res, factors);
});

router.post('/mobility/carbon-footprint', async (req, res, next) => {
  try {
    const {
      origin_lat,
      origin_lng,
      dest_lat,
      dest_lng,
      distance_km,
      transport_mode,
      passengers_count,
      user_id
    } = req.body || {};

    const calculation = await carbonFootprintService.calculateFootprint({
      originLat: origin_lat ? Number(origin_lat) : null,
      originLng: origin_lng ? Number(origin_lng) : null,
      destLat: dest_lat ? Number(dest_lat) : null,
      destLng: dest_lng ? Number(dest_lng) : null,
      distanceKm: distance_km ? Number(distance_km) : null,
      transportMode: transport_mode || 'carpool',
      passengersCount: passengers_count ? Number(passengers_count) : 2,
      userId: user_id || null
    });

    return success(res, calculation);
  } catch (err) {
    next(err);
  }
});

router.get('/mobility/badges/:userId', async (req, res, next) => {
  try {
    const stats = await carbonFootprintService.getUserMobilityStats(req.params.userId);
    return success(res, stats);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 5. Motor de Webhooks Salientes para Comercios Aliados
// ============================================================================
const merchantWebhooksService = require('../../modules/merchants/merchant-webhooks-service');

router.post('/merchants/webhooks/subscriptions', async (req, res, next) => {
  try {
    const { merchant_id, target_url, events } = req.body || {};
    const sub = await merchantWebhooksService.registerSubscription({
      merchantId: merchant_id,
      targetUrl: target_url,
      events: events || ['*']
    });
    return success(res, sub, {}, 201);
  } catch (err) {
    next(err);
  }
});

router.get('/merchants/webhooks/subscriptions', async (req, res, next) => {
  try {
    const merchantId = req.query.merchant_id;
    if (!merchantId) {
      return res.status(400).json({ ok: false, error: { message: 'merchant_id es requerido en query param' } });
    }
    const list = await merchantWebhooksService.listSubscriptions(merchantId);
    return success(res, list, { total: list.length });
  } catch (err) {
    next(err);
  }
});

router.delete('/merchants/webhooks/subscriptions/:id', async (req, res, next) => {
  try {
    const del = await merchantWebhooksService.deleteSubscription(req.params.id, req.query.merchant_id);
    return success(res, del);
  } catch (err) {
    next(err);
  }
});

router.post('/merchants/webhooks/dispatch', async (req, res, next) => {
  try {
    const { event_type, payload } = req.body || {};
    if (!event_type) {
      return res.status(400).json({ ok: false, error: { message: 'event_type es requerido' } });
    }
    const dispatchResult = await merchantWebhooksService.dispatch(event_type, payload || {});
    return success(res, dispatchResult);
  } catch (err) {
    next(err);
  }
});

router.get('/merchants/webhooks/deliveries', async (req, res, next) => {
  try {
    const deliveries = await merchantWebhooksService.getDeliveries({
      merchantId: req.query.merchant_id || null,
      limit: req.query.limit ? Number(req.query.limit) : 50
    });
    return success(res, deliveries, { total: deliveries.length });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 6. Motor Financiero BCCR, Multi-divisa y Redondeo en Efectivo Costa Rica
// ============================================================================
const financialEngineService = require('../finance/financial-engine-service');

router.get('/finance/exchange-rates', async (req, res, next) => {
  try {
    const rates = await financialEngineService.getExchangeRates();
    return success(res, rates);
  } catch (err) {
    next(err);
  }
});

router.post('/finance/convert', async (req, res, next) => {
  try {
    const { amount, from, to } = req.body || {};
    const result = await financialEngineService.convert({
      amount,
      from: from || 'CRC',
      to: to || 'USD'
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/finance/cash-rounding', (req, res) => {
  const result = financialEngineService.roundCashBccr(req.body?.amount_crc);
  return success(res, result);
});

router.post('/finance/split-bill-cr', async (req, res, next) => {
  try {
    const { subtotal_crc, people_count, extra_tip_percentage } = req.body || {};
    const bill = await financialEngineService.calculateDiningBill({
      subtotalCrc: subtotal_crc,
      peopleCount: people_count,
      extraTipPercentage: extra_tip_percentage
    });
    return success(res, bill);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 7. Clima: Índice de Confort Urbano, Aguaceros y Calidad del Aire (Open-Meteo)
// ============================================================================
const comfortWeatherService = require('../../modules/weather-activities/comfort-weather-service');
const airQualityService = require('../../modules/weather-activities/air-quality-service');

router.get('/weather/comfort-index', async (req, res, next) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : 9.9333;
    const lng = req.query.lng ? Number(req.query.lng) : -84.0833;
    const comfort = await comfortWeatherService.getUrbanComfortIndex(lat, lng);
    return success(res, comfort);
  } catch (err) {
    next(err);
  }
});

router.get('/weather/air-quality', async (req, res, next) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : 9.9333;
    const lng = req.query.lng ? Number(req.query.lng) : -84.0833;
    const airQuality = await airQualityService.getAirQuality(lat, lng);
    return success(res, airQuality);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 8. Geocodificación Inversa Territorial y Enlaces de Navegación Universal
// ============================================================================
const reverseGeocodeService = require('../../modules/places/reverse-geocode-service');
const { generateNavigationLinks } = require('../utils/navigation-links');

router.get('/places/reverse-geocode', async (req, res, next) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : 9.9333;
    const lng = req.query.lng ? Number(req.query.lng) : -84.0833;
    const address = await reverseGeocodeService.resolveCoordinates(lat, lng);
    return success(res, address);
  } catch (err) {
    next(err);
  }
});

router.get('/places/navigation-links', (req, res) => {
  const lat = req.query.lat ? Number(req.query.lat) : 9.9333;
  const lng = req.query.lng ? Number(req.query.lng) : -84.0833;
  const label = req.query.label || 'Parada Sinergia Urbana';
  const links = generateNavigationLinks(lat, lng, label);
  return success(res, links);
});

// ============================================================================
// 9. Verificación de Cédula Física / Jurídica (Ministerio de Hacienda CR)
// ============================================================================
const idVerifierService = require('../../modules/businesses/id-verifier-service');

router.get('/businesses/verify-id/:id', async (req, res, next) => {
  try {
    const verification = await idVerifierService.verifyIdentification(req.params.id);
    if (!verification.valid) {
      return res.status(400).json({ ok: false, error: { message: verification.error } });
    }
    return success(res, verification);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 10. Calendario de Feriados y Suspensión de Restricción Vehicular en CR
// ============================================================================
const holidaysCrService = require('../../modules/calendar/holidays-cr-service');

router.get('/calendar/holidays/cr', async (req, res, next) => {
  try {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const holidays = await holidaysCrService.getHolidays(year);
    return success(res, holidays, { total: holidays.length, country: 'Costa Rica' });
  } catch (err) {
    next(err);
  }
});

router.get('/calendar/holidays/status', async (req, res, next) => {
  try {
    const status = await holidaysCrService.getTodayStatus();
    return success(res, status);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 11. Monitor Sísmico y Tectónico de Costa Rica (USGS / OVSICORI Feed)
// ============================================================================
const seismicMonitorService = require('../../modules/urban-rescue/seismic-monitor-service');

router.get('/rescue/seismic-monitor', async (req, res, next) => {
  try {
    const activity = await seismicMonitorService.getSeismicActivity();
    return success(res, activity);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 12. Optimizador de Rutas Multi-Parada para Salidas Grupales (TSP Heurístico)
// ============================================================================
const routeOptimizerService = require('../../modules/social-dining/route-optimizer-service');

router.post('/social/plans/optimize-route', (req, res) => {
  const stops = req.body?.stops || [];
  const result = routeOptimizerService.optimizeItinerary(stops);
  return success(res, result);
});

// ============================================================================
// 13. Generador de Enlaces Rápidos y QR para Pagos SINPE Móvil
// ============================================================================
const sinpeDeepLinkService = require('../finance/sinpe-deep-link-service');

router.post('/finance/sinpe-deep-link', (req, res) => {
  try {
    const { amount_crc, recipient_phone, description } = req.body || {};
    const links = sinpeDeepLinkService.generateBankCommands({
      amountCrc: amount_crc,
      recipientPhone: recipient_phone,
      description
    });
    return success(res, links);
  } catch (err) {
    return res.status(400).json({ ok: false, error: { message: err.message } });
  }
});

// ============================================================================
// 14. Generador de Tarjetas de Metadatos Sociales (Open Graph / Twitter Cards)
// ============================================================================
const socialShareCardService = require('../utils/social-share-card');

router.get('/social/share-card/:type/:id', async (req, res, next) => {
  try {
    const meta = await socialShareCardService.generateShareMetadata(req.params.type, req.params.id);
    return success(res, meta);
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
router.use('/vet/videos', require('../../modules/vet-hub').petCareVideosRoutes);
router.use('/pet-videos', require('../../modules/vet-hub').petCareVideosRoutes);
router.use('/businesses', require('../../modules/businesses').businessesRoutes);
router.use('/live', require('../../modules/live-map-waze').liveMapRoutes);
router.use('/rescue', require('../../modules/urban-rescue').rescueRoutes);
router.use('/client', require('../../modules/client-dashboard').clientRoutes);

module.exports = router;
