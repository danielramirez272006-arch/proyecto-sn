const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';

const app = require('../src/app');
const { generateToken } = require('../src/shared/middlewares/auth-role-guard');

function executeMockRequest(method, url, { headers = {}, body = null } = {}) {
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      originalUrl: url,
      headers: { ...headers },
      body: body || {},
      query: {},
      params: {},
      socket: { remoteAddress: '127.0.0.1' }
    };

    // Parse query params if any
    const [pathOnly, queryString] = url.split('?');
    req.path = pathOnly;
    if (queryString) {
      const q = new URLSearchParams(queryString);
      for (const [k, v] of q.entries()) req.query[k] = v;
    }

    let statusCode = 200;
    const responseHeaders = {};
    let responseBody = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      setHeader(name, value) {
        responseHeaders[name] = value;
      },
      getHeader(name) {
        return responseHeaders[name];
      },
      json(data) {
        responseBody = data;
        resolve({ status: statusCode, headers: responseHeaders, body: responseBody });
        return this;
      },
      send(data) {
        responseBody = data;
        resolve({ status: statusCode, headers: responseHeaders, body: responseBody });
        return this;
      },
      writeHead(code, hdrs) {
        statusCode = code;
        Object.assign(responseHeaders, hdrs);
        return this;
      },
      write(chunk) {},
      on(evt, handler) {}
    };

    app(req, res, (err) => {
      if (err) {
        resolve({ status: 500, headers: responseHeaders, body: { ok: false, error: { message: err.message } } });
      } else {
        resolve({ status: 404, headers: responseHeaders, body: { ok: false, error: { message: 'Not found' } } });
      }
    });
  });
}

const { runMigrations, runSeeds } = require('../src/shared/config/database');

test('Suite de Endpoints HTTP y Contrato de API en Memoria', async (suite) => {
  await runMigrations();
  await runSeeds();
  const adminToken = generateToken({ id: 'usr_admin_1', role: 'admin', name: 'Admin Test' });

  await suite.test('GET /api/health responde con estado healthy y soporte DeepSeek', async () => {
    const res = await executeMockRequest('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.status, 'healthy');
    assert.equal(res.body.data.ai_copilot, 'DeepSeek AI Active');
  });

  await suite.test('GET /api/health/db responde con estado de base conectada', async () => {
    const res = await executeMockRequest('GET', '/api/health/db');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.status, 'connected');
  });

  await suite.test('GET /api/health/system devuelve telemetría completa de memoria, IA y agentes', async () => {
    const res = await executeMockRequest('GET', '/api/health/system');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.system.memory.rss_mb >= 0);
    assert.equal(res.body.data.ai_copilot.provider, 'DeepSeek');
    assert.ok(Array.isArray(res.body.data.autonomous_agents.jobs));
  });

  await suite.test('GET /api/docs/openapi.json devuelve especificación OpenAPI 3.0', async () => {
    const res = await executeMockRequest('GET', '/api/docs/openapi.json');
    assert.equal(res.status, 200);
    assert.equal(res.body.openapi, '3.0.3');
    assert.ok(res.body.paths['/social/plans']);
  });

  await suite.test('GET /api/places devuelve el catálogo de locales', async () => {
    const res = await executeMockRequest('GET', '/api/places');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(Array.isArray(res.body.data));
  });

  await suite.test('POST /api/auth/guest-session crea sesión temporal para invitados sin cuenta', async () => {
    const res = await executeMockRequest('POST', '/api/auth/guest-session', {
      body: { alias: 'Mariana' }
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.guest_name, 'Mariana');
    assert.ok(res.body.data.guest_token.startsWith('gst_tok_'));
  });

  await suite.test('GET /api/concierge/status reporta estado de Google Gemini AI (Cliente)', async () => {
    const res = await executeMockRequest('GET', '/api/concierge/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.provider, 'Google Gemini');
    assert.ok(res.body.data.activeModel.includes('gemini'));
  });

  await suite.test('POST /api/social/midpoint triangula el punto medio de coordenadas', async () => {
    const res = await executeMockRequest('POST', '/api/social/midpoint', {
      body: {
        locations: [
          { lat: 9.9152, lng: -84.2415 },
          { lat: 9.9168, lng: -84.2431 }
        ]
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.fair_midpoint.lat);
  });

  await suite.test('POST /api/social/split-bill calcula IVA 13% y 10% de propina oficial', async () => {
    const res = await executeMockRequest('POST', '/api/social/split-bill', {
      body: {
        items: [{ price_crc: 5000, qty: 2 }],
        diner_count: 2
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.subtotal_crc, 10000);
    assert.equal(res.body.data.iva_13_crc, 1300);
    assert.equal(res.body.data.service_10_crc, 1000);
    assert.equal(res.body.data.total_real_crc, 12300);
    assert.equal(res.body.data.amount_per_diner_crc, 6150);
  });

  await suite.test('POST /api/social/sinpe-sms genera comandos nativos SMS para bancos CR', async () => {
    const res = await executeMockRequest('POST', '/api/social/sinpe-sms', {
      body: {
        bank: 'BAC',
        phone_number: '88112233',
        amount_crc: 6150,
        note: 'Café feria'
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.recipient_sms_shortcode, '2223');
    assert.ok(res.body.data.sms_body.includes('PASE 6150 88112233'));
  });

  await suite.test('POST /api/concierge/voice-intent clasifica intenciones con Google Gemini (Cliente)', async () => {
    const res = await executeMockRequest('POST', '/api/concierge/voice-intent', {
      body: { text: 'Quiero un café con terraza pet friendly' }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.intent, 'SEARCH_FOOD');
  });

  await suite.test('POST /api/rescue/sos crea una alerta ciudadana y la expone en el feed', async () => {
    const res = await executeMockRequest('POST', '/api/rescue/sos', {
      body: {
        title: 'Llanta desinflada frente a la iglesia',
        type: 'roadside_hazard',
        lat: 9.9140,
        lng: -84.2420,
        contact_phone: '+506 8811-0022'
      }
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.title, 'Llanta desinflada frente a la iglesia');

    const listRes = await executeMockRequest('GET', '/api/rescue/sos');
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.length >= 1);
  });

  await suite.test('GET /api/client/overview calcula restricción vehicular y resumen', async () => {
    const res = await executeMockRequest('GET', '/api/client/overview');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(typeof res.body.data.has_vehicular_restriction_today, 'boolean');
  });

  await suite.test('Rutas protegidas de administración rechazan acceso no autorizado', async () => {
    const res = await executeMockRequest('GET', '/api/admin/duplicates');
    assert.equal(res.status, 401);
  });

  await suite.test('Rutas protegidas de administración aceptan token y permiten ver agentes', async () => {
    const res = await executeMockRequest('GET', '/api/admin/agents/status', {
      headers: { 'authorization': `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.jobs.length >= 5);
  });

  await suite.test('GET /api/admin/telemetry reporta telemetría de DeepSeek AI (Admin)', async () => {
    const res = await executeMockRequest('GET', '/api/admin/telemetry', {
      headers: { 'authorization': `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.ai_metrics.provider, 'DeepSeek');
    assert.equal(res.body.data.ai_metrics.activeModel, 'deepseek-chat');
  });

  await suite.test('POST /api/admin/agents/:jobName/run ejecuta tarea de agente manualmente', async () => {
    const res = await executeMockRequest('POST', '/api/admin/agents/affected-plans-monitor/run', {
      headers: { 'authorization': `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.job, 'affected-plans-monitor');
  });
});
