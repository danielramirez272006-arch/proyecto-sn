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

  await suite.test('GET /api/health responde con estado healthy', async () => {
    const res = await executeMockRequest('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.status, 'healthy');
  });

  await suite.test('GET /api/health/db responde con estado de base conectada', async () => {
    const res = await executeMockRequest('GET', '/api/health/db');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.status, 'connected');
  });

  await suite.test('GET /api/places devuelve el catálogo de locales', async () => {
    const res = await executeMockRequest('GET', '/api/places');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(Array.isArray(res.body.data));
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

  await suite.test('POST /api/concierge/voice-intent clasifica intenciones de usuario', async () => {
    const res = await executeMockRequest('POST', '/api/concierge/voice-intent', {
      body: { text: 'Quiero un café con terraza pet friendly' }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.intent, 'SEARCH_FOOD');
  });

  await suite.test('Rutas protegidas de administración rechazan acceso no autorizado', async () => {
    const res = await executeMockRequest('GET', '/api/admin/duplicates');
    assert.equal(res.status, 401);
  });

  await suite.test('Rutas protegidas de administración aceptan token de administrador', async () => {
    const res = await executeMockRequest('GET', '/api/admin/duplicates', {
      headers: { 'authorization': `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });
});
