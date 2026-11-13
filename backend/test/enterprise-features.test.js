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

  await suite.test('12. Endpoint de Carga a Storage con Validación y Fallback (/api/storage/upload)', async () => {
    // 1. Estado de Storage
    const statusRes = await executeMockRequest('GET', '/api/storage/status');
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.ok, true);
    assert.ok(statusRes.body.data.allowed_buckets.includes('receipts'));

    // 2. Subida de archivo válida (comprobante SINPE base64)
    const base64Data = Buffer.from('comprobante-sinpe-costa-rica-2026').toString('base64');
    const uploadRes = await executeMockRequest('POST', '/api/storage/upload', {
      body: {
        bucket: 'receipts',
        file_name: 'sinpe_comprobante_506.png',
        content_base64: base64Data,
        content_type: 'image/png'
      }
    });
    assert.equal(uploadRes.status, 201);
    assert.equal(uploadRes.body.ok, true);
    assert.ok(uploadRes.body.data.url);
    assert.equal(uploadRes.body.data.bucket, 'receipts');

    // 3. Rechazo de tipo MIME inválido
    const invalidMimeRes = await executeMockRequest('POST', '/api/storage/upload', {
      body: {
        bucket: 'receipts',
        file_name: 'malware.exe',
        content_base64: base64Data,
        content_type: 'application/x-msdownload'
      }
    });
    assert.equal(invalidMimeRes.status, 400);
    assert.equal(invalidMimeRes.body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
  });

  await suite.test('13. Receptor de Webhooks de Supabase y Retransmisión SSE (/api/webhooks/supabase)', async () => {
    const webhookPayload = {
      type: 'UPDATE',
      table: 'events',
      schema: 'app_private',
      record: {
        id: 'evt_feria_sabado_1',
        title: 'Feria de Mora',
        status: 'published'
      }
    };

    const res = await executeMockRequest('POST', '/api/webhooks/supabase', {
      body: webhookPayload
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.received, true);
    assert.equal(res.body.data.table, 'events');
  });

  await suite.test('14. Servicio de Caché LRU con TTL y Métricas de Acierto (/api/cache/stats)', async () => {
    const { ttlCache } = require('../src/shared/cache/ttl-cache-service');
    ttlCache.clear();

    // Guardar y recuperar
    ttlCache.set('test_recope_diesel', { price: 650 }, 5000);
    assert.equal(ttlCache.has('test_recope_diesel'), true);

    const val = ttlCache.get('test_recope_diesel');
    assert.equal(val.price, 650);

    // Método .wrap()
    let fetchCount = 0;
    const asyncFetcher = async () => {
      fetchCount++;
      return { usd_crc: 520 };
    };

    const r1 = await ttlCache.wrap('tipo_cambio_bccr', 5000, asyncFetcher);
    const r2 = await ttlCache.wrap('tipo_cambio_bccr', 5000, asyncFetcher);

    assert.equal(r1.usd_crc, 520);
    assert.equal(r2.usd_crc, 520);
    assert.equal(fetchCount, 1); // Solo se invocó una vez debido a la caché

    // Endpoint /api/cache/stats
    const statsRes = await executeMockRequest('GET', '/api/cache/stats');
    assert.equal(statsRes.status, 200);
    assert.ok(statsRes.body.data.hits >= 2);
    assert.ok(statsRes.body.data.hit_ratio > 0);
  });

  await suite.test('15. Rate Limiting Avanzado con Cabeceras de Control', async () => {
    const rateLimiter = require('../src/shared/middlewares/rate-limiter');
    const limiter = rateLimiter.registry.createLimiter({
      name: 'test-limiter',
      maxRequests: 2,
      windowMs: 5000,
      skipInTest: false
    });

    let blocked = false;
    let statusCode = 200;
    const headers = {};

    const req = { headers: {}, socket: { remoteAddress: '10.0.0.1' } };
    const res = {
      setHeader(k, v) { headers[k] = v; },
      status(code) { statusCode = code; return this; },
      json(payload) { blocked = true; return payload; }
    };
    const next = () => {};

    // Req 1 (OK)
    limiter(req, res, next);
    assert.equal(headers['X-RateLimit-Remaining'], 1);

    // Req 2 (OK)
    limiter(req, res, next);
    assert.equal(headers['X-RateLimit-Remaining'], 0);

    // Req 3 (Excedido -> 429)
    limiter(req, res, next);
    assert.equal(statusCode, 429);
    assert.equal(blocked, true);
    assert.ok(headers['Retry-After']);
  });

  await suite.test('16. Catálogo de 10 Idiomas Oficiales Soportados (/api/i18n/languages)', async () => {
    const res = await executeMockRequest('GET', '/api/i18n/languages');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.total >= 10);
    assert.equal(res.body.data.default_language, 'es');

    const codes = res.body.data.languages.map(l => l.code);
    assert.ok(codes.includes('es'));
    assert.ok(codes.includes('en'));
    assert.ok(codes.includes('fr'));
    assert.ok(codes.includes('de'));
    assert.ok(codes.includes('pt'));
    assert.ok(codes.includes('it'));
    assert.ok(codes.includes('zh'));
    assert.ok(codes.includes('ja'));
    assert.ok(codes.includes('ko'));
    assert.ok(codes.includes('ru'));
  });

  await suite.test('17. Descarga de Diccionario Completo por Idioma (/api/i18n/translations/:lang)', async () => {
    // 1. Probar Francés
    const resFr = await executeMockRequest('GET', '/api/i18n/translations/fr');
    assert.equal(resFr.status, 200);
    assert.equal(resFr.body.data.language, 'fr');
    assert.ok(resFr.body.data.dictionary.system.healthy.includes('opérationnel'));

    // 2. Probar Japonés
    const resJa = await executeMockRequest('GET', '/api/i18n/translations/ja');
    assert.equal(resJa.status, 200);
    assert.equal(resJa.body.data.language, 'ja');
    assert.ok(resJa.body.data.dictionary.concierge.greeting.includes('DeepSeek AI'));

    // 3. Probar Alemán
    const resDe = await executeMockRequest('GET', '/api/i18n/translations/de');
    assert.equal(resDe.status, 200);
    assert.equal(resDe.body.data.language, 'de');
    assert.ok(resDe.body.data.dictionary.system.healthy.includes('betriebsbereit'));

    // 4. Rechazo de idioma no soportado
    const resInvalid = await executeMockRequest('GET', '/api/i18n/translations/klingon');
    assert.equal(resInvalid.status, 400);
  });

  await suite.test('18. Detección Automática de Idioma por Headers y Query Param (/api/i18n/detect)', async () => {
    // 1. Detección por Accept-Language: fr-FR
    const resHeader = await executeMockRequest('GET', '/api/i18n/detect', {
      headers: { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' }
    });
    assert.equal(resHeader.status, 200);
    assert.equal(resHeader.body.data.detected_locale, 'fr');

    // 2. Detección por Query Param ?lang=ja
    const resQuery = await executeMockRequest('GET', '/api/i18n/detect?lang=ja');
    assert.equal(resQuery.status, 200);
    assert.equal(resQuery.body.data.detected_locale, 'ja');

    // 3. Fallback a Español si idioma no soportado
    const resFallback = await executeMockRequest('GET', '/api/i18n/detect', {
      headers: { 'accept-language': 'xx-YY' }
    });
    assert.equal(resFallback.status, 200);
    assert.equal(resFallback.body.data.detected_locale, 'es');
  });

  await suite.test('19. Traducción Dinámica de Claves (/api/i18n/translate)', async () => {
    const res = await executeMockRequest('POST', '/api/i18n/translate', {
      body: {
        key: 'concierge.greeting',
        target_lang: 'en'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.translated.includes('urban AI copilot'));
  });

  await suite.test('20. Diagnóstico de Latencia Profunda con Benchmarks en Paralelo (/api/health/deep)', async () => {
    const res = await executeMockRequest('GET', '/api/health/deep');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.benchmarks);
    assert.ok(res.body.data.benchmarks.postgres);
    assert.equal(typeof res.body.data.benchmarks.postgres.latency_ms, 'number');
    assert.ok(res.body.data.benchmarks.supabase_cloud);
    assert.ok(res.body.data.benchmarks.deepseek_ai);
    assert.equal(typeof res.body.data.total_probe_duration_ms, 'number');
  });

  await suite.test('21. Búsqueda Semántica Inteligente de Lugares (/api/places/smart-search)', async () => {
    const res = await executeMockRequest('GET', '/api/places/smart-search?q=café pet friendly con terraza');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data[0].match_score >= 30);
    assert.ok(res.body.data[0].ai_reason);
  });

  await suite.test('22. Exportador GeoJSON Estándar RFC 7946 (/api/places/export/geojson)', async () => {
    const res = await executeMockRequest('GET', '/api/places/export/geojson');
    assert.equal(res.status, 200);
    assert.equal(res.body.type, 'FeatureCollection');
    assert.ok(Array.isArray(res.body.features));
    assert.ok(res.body.features.length >= 1);
    assert.equal(res.body.features[0].geometry.type, 'Point');
    assert.equal(res.body.features[0].geometry.coordinates.length, 2);
    assert.ok(res.body.features[0].properties.name);
  });

  await suite.test('23. Exportador iCalendar RFC 5545 para Google/Apple Calendar (/api/events/export/ics)', async () => {
    // 1. Exportación de todos los eventos
    const resAll = await executeMockRequest('GET', '/api/events/export/ics');
    assert.equal(resAll.status, 200);
    assert.ok(typeof resAll.body === 'string');
    assert.ok(resAll.body.includes('BEGIN:VCALENDAR'));
    assert.ok(resAll.body.includes('BEGIN:VEVENT'));
    assert.ok(resAll.body.includes('END:VCALENDAR'));

    // 2. Exportación de un evento específico
    const resSingle = await executeMockRequest('GET', '/api/events/evt_feria_sabado_1/export/ics');
    assert.equal(resSingle.status, 200);
    assert.ok(typeof resSingle.body === 'string');
    assert.ok(resSingle.body.includes('BEGIN:VCALENDAR'));
    assert.ok(resSingle.body.includes('Mora') || resSingle.body.includes('Sabatina'));
    assert.ok(resSingle.body.includes('END:VCALENDAR'));
  });

  await suite.test('24. Extractor Inteligente de Facturas y Comprobantes SINPE (/api/social/scan-invoice)', async () => {
    const invoiceText = `
      RESTAURANTE EL ROBLE S.A.
      Cedula Juridica: 3-101-998877
      Consumo: 2 Cafes Geisha + Torta de Zanahoria
      SUBTOTAL: ₡15,000
      IVA (13%): ₡1,950
      SERVICIO (10%): ₡1,500
      TOTAL A PAGAR: ₡18,450
      Pago realizado por SINPE Movil al 8888-1111
    `;

    const res = await executeMockRequest('POST', '/api/social/scan-invoice', {
      body: { text: invoiceText }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.total_crc, 18450);
    assert.equal(res.body.data.currency, 'CRC');
    assert.ok(res.body.data.subtotal_crc > 0);
    assert.ok(res.body.data.iva_13_crc > 0);
    assert.ok(res.body.data.service_10_crc > 0);
  });

  await suite.test('25. Matcher Inteligente de Mascotas Extraviadas (/api/rescue/match-pet)', async () => {
    const lostPet = {
      id: 'lost_dog_1',
      species: 'perro',
      breed: 'Zaguate mestizo',
      color: 'Cafe con blanco',
      lat: 9.9148,
      lng: -84.2421,
      notes: 'Lleva collar rojo y plaquita'
    };

    const foundPets = [
      {
        id: 'found_dog_1',
        species: 'perro',
        breed: 'Mestizo mediano',
        color: 'Cafe con manchas blancas',
        lat: 9.9160,
        lng: -84.2410,
        notes: 'Visto cerca de la plaza con collar rojo'
      },
      {
        id: 'found_cat_1',
        species: 'gato',
        breed: 'Siames',
        color: 'Blanco y gris',
        lat: 9.9148,
        lng: -84.2421,
        notes: 'Gato siames en un arbol'
      }
    ];

    const res = await executeMockRequest('POST', '/api/rescue/match-pet', {
      body: {
        lost_pet: lostPet,
        found_pets: foundPets,
        max_distance_km: 3.0
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 1); // Solo debe coincidir el perro, no el gato
    assert.equal(res.body.data[0].found_id, 'found_dog_1');
    assert.ok(res.body.data[0].match_confidence >= 60);
    assert.ok(res.body.data[0].distance_km < 1.0);
  });
});
