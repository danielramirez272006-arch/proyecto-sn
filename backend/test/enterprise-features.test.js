const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';

const app = require('../src/app');
const { generateToken } = require('../src/shared/middlewares/auth-role-guard');
const { runMigrations, runSeeds, withTransaction, query } = require('../src/shared/config/database');
const authService = require('../src/modules/auth/auth-service');
const webhookDispatcher = require('../src/shared/realtime/webhook-dispatcher');
const auditService = require('../src/shared/audit/audit-service');

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
      end(data) {
        if (data && !responseBody) responseBody = data;
        resolve({ status: statusCode, headers: responseHeaders, body: responseBody });
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

test('Suite Enterprise: Observabilidad, Transacciones, Seguridad y DeepSeek AI', async (suite) => {
  await runMigrations();
  await runSeeds();
  const adminToken = generateToken({ id: 'usr_admin_1', role: 'admin', name: 'Admin Test' });

  await suite.test('1. Inyección de x-request-id para trazabilidad distribuida', async () => {
    const res = await executeMockRequest('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.ok(res.headers['x-request-id'], 'Debe retornar cabecera x-request-id');
    assert.ok(res.headers['x-request-id'].startsWith('req_'));
  });

  await suite.test('2. Endpoint de métricas en formato estándar Prometheus (/api/metrics)', async () => {
    const res = await executeMockRequest('GET', '/api/metrics');
    assert.equal(res.status, 200);
    assert.ok(typeof res.body === 'string', 'El cuerpo debe ser texto plano');
    assert.ok(res.body.includes('nodejs_uptime_seconds'));
    assert.ok(res.body.includes('http_requests_total'));
    assert.ok(res.body.includes('deepseek_requests_total'));
  });

  await suite.test('3. Transaccionalidad ACID y Rollback ante errores', async () => {
    const testId = `plc_tx_${Date.now()}`;
    
    // Intento con error que debe provocar Rollback
    await assert.rejects(async () => {
      await withTransaction(async (conn) => {
        await conn.execute(`
          INSERT INTO places (id, name, category, lat, lng, address)
          VALUES (?, 'Lugar Transaccional Fallido', 'cafe', 9.93, -84.08, 'San José')
        `, [testId]);
        throw new Error('SIMULATED_DB_ERROR');
      });
    }, /SIMULATED_DB_ERROR/);

    // Verificar que el registro NO quedó en la base de datos tras el rollback
    const check = await query('SELECT id FROM places WHERE id = ?', [testId]);
    assert.equal(check.length, 0, 'El rollback debe haber revertido el insert');
  });

  await suite.test('4. Seguridad: PBKDF2 Password Hashing con Sal Aleatoria', () => {
    const rawPass = 'PuraVida2026!';
    const hash = authService.hashPassword(rawPass);
    assert.ok(hash.includes(':'), 'El hash debe contener formato salt:hash');
    
    const isValid = authService.verifyPassword(rawPass, hash);
    assert.equal(isValid, true, 'La contraseña válida debe verificarse correctamente');

    const isInvalid = authService.verifyPassword('PasswordIncorrecto', hash);
    assert.equal(isInvalid, false, 'Una contraseña incorrecta debe ser rechazada');
  });

  await suite.test('5. Rotación de Refresh Tokens y Renovación de Sesión (/api/auth/refresh)', async () => {
    const email = `test_${Date.now()}@cr.dev`;
    const regRes = await executeMockRequest('POST', '/api/auth/register', {
      body: { name: 'Usuario Prueba', email, password: 'password123' }
    });
    assert.equal(regRes.status, 201);
    const refreshToken = regRes.body.data.refresh_token;
    assert.ok(refreshToken, 'Debe emitir refresh_token');

    const refreshRes = await executeMockRequest('POST', '/api/auth/refresh', {
      body: { refresh_token: refreshToken }
    });
    assert.equal(refreshRes.status, 200);
    assert.ok(refreshRes.body.data.token, 'Debe emitir nuevo access token');
    assert.ok(refreshRes.body.data.refresh_token, 'Debe emitir nuevo refresh token rotado');
  });

  await suite.test('6. DeepSeek AI: Conversación Multi-Turn con Historial (/api/concierge/chat)', async () => {
    const sessionId = `test_chat_${Date.now()}`;
    const res1 = await executeMockRequest('POST', '/api/concierge/chat', {
      body: { session_id: sessionId, message: 'Hola, ¿qué opciones de feria del agricultor hay?' }
    });
    assert.equal(res1.status, 200);
    assert.ok(res1.body.data.response);
    assert.equal(res1.body.data.history_length, 2);

    const res2 = await executeMockRequest('POST', '/api/concierge/chat', {
      body: { session_id: sessionId, message: '¿Y tienen parqueo y rampa 7600?' }
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.body.data.history_length, 4);
  });

  await suite.test('7. DeepSeek AI: Generador de Itinerarios Multi-Día (/api/concierge/multi-day-itinerary)', async () => {
    const res = await executeMockRequest('POST', '/api/concierge/multi-day-itinerary', {
      body: { days: 2, zone: 'Valle Central', budget_crc: 40000 }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.total_days, 2);
    assert.equal(res.body.data.days.length, 2);
    assert.ok(res.body.data.days[0].morning_activity);
  });

  await suite.test('8. Catálogo con Búsqueda Radial GPS y Paginación Avanzada (/api/places)', async () => {
    const res = await executeMockRequest('GET', '/api/places?lat=9.9152&lng=-84.2415&radius_km=10&page=1&limit=5');
    assert.equal(res.status, 200);
    assert.ok(res.body.meta.page);
    assert.ok(res.body.meta.total_records >= 1);
    assert.ok(res.body.data[0].distance_km !== undefined);
  });

  await suite.test('9. Verificación de Firmas HMAC-SHA256 en Webhooks', () => {
    const payload = { event: 'plan.confirmed', plan_code: 'PLAN-777' };
    const secret = 'super_secret_test_key';
    const crypto = require('node:crypto');
    const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

    const isValid = webhookDispatcher.verifySignature(JSON.stringify(payload), signature, secret);
    assert.equal(isValid, true, 'La firma HMAC-SHA256 debe ser validada');

    const isTampered = webhookDispatcher.verifySignature(JSON.stringify({ ...payload, tampered: true }), signature, secret);
    assert.equal(isTampered, false, 'Un payload alterado debe ser rechazado');
  });

  await suite.test('10. Pista Inmutable de Auditoría (/api/audit/history)', async () => {
    await auditService.record({
      userId: 'usr_admin_1',
      action: 'SYSTEM_CONFIG_UPDATED',
      resource: 'config',
      details: { updated_key: 'deepseek_model' }
    });

    const res = await executeMockRequest('GET', '/api/audit/history', {
      headers: { 'authorization': `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });

  await suite.test('11. Integración Supabase: Endpoint de salud y cliente resiliente (/api/health/supabase)', async () => {
    const res = await executeMockRequest('GET', '/api/health/supabase');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.provider.includes('Supabase'));
    assert.equal(typeof res.body.data.configured, 'boolean');

    // Test de fallback seguro de almacenamiento cuando no hay credenciales activas
    const supabaseClient = require('../src/shared/config/supabase-config');
    const uploadRes = await supabaseClient.uploadStorageFile('receipts', 'test.jpg', Buffer.from('fake-image'));
    assert.ok(uploadRes.url);
  });
});
