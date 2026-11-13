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

  await suite.test('6. Google Gemini AI (Cliente): Conversación Multi-Turn con Historial (/api/concierge/chat)', async () => {
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

  await suite.test('7. Google Gemini AI (Cliente): Generador de Itinerarios Multi-Día (/api/concierge/multi-day-itinerary)', async () => {
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

  await suite.test('26. Auditoría Inmutable Criptográfica (Hash Chain Ledger)', async () => {
    // 1. Registrar dos bloques encadenados
    const block1Res = await executeMockRequest('POST', '/api/audit/chain', {
      body: {
        record_id: 'pln_sabatino_1',
        entity_type: 'plan',
        action: 'PLAN_CREATED',
        actor_id: 'usr_organizer_1',
        data: { title: 'Salida Cafetal', budget: 15000 }
      }
    });
    assert.equal(block1Res.status, 201);
    assert.equal(block1Res.body.ok, true);
    assert.equal(block1Res.body.data.sequence_number, 1);
    assert.equal(block1Res.body.data.previous_hash, '0'.repeat(64));
    assert.ok(block1Res.body.data.block_hash);

    const block2Res = await executeMockRequest('POST', '/api/audit/chain', {
      body: {
        record_id: 'pln_sabatino_1',
        entity_type: 'plan',
        action: 'VOTE_CAST',
        actor_id: 'usr_guest_2',
        data: { option_id: 'opt_cafe_1', vote: 'prefer' }
      }
    });
    assert.equal(block2Res.status, 201);
    assert.equal(block2Res.body.ok, true);
    assert.equal(block2Res.body.data.sequence_number, 2);
    assert.equal(block2Res.body.data.previous_hash, block1Res.body.data.block_hash);

    // 2. Verificar integridad matemática de toda la cadena
    const verifyRes = await executeMockRequest('GET', '/api/audit/verify-chain');
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.ok, true);
    assert.equal(verifyRes.body.data.valid, true);
    assert.ok(verifyRes.body.data.total_blocks >= 2);
    assert.equal(verifyRes.body.data.genesis_hash, block1Res.body.data.block_hash);

    // 3. Consultar la pista encadenada para el plan
    const trailRes = await executeMockRequest('GET', '/api/audit/chain/plan/pln_sabatino_1');
    assert.equal(trailRes.status, 200);
    assert.equal(trailRes.body.ok, true);
    assert.ok(trailRes.body.data.length >= 2);
  });

  await suite.test('27. Notificaciones Multicanal y Patrón Outbox (/api/notifications/*)', async () => {
    // 1. Clave pública VAPID para Web Push
    const vapidRes = await executeMockRequest('GET', '/api/notifications/vapid-public-key');
    assert.equal(vapidRes.status, 200);
    assert.equal(vapidRes.body.ok, true);
    assert.ok(vapidRes.body.data.public_key);

    // 2. Suscripción Web Push
    const subRes = await executeMockRequest('POST', '/api/notifications/subscribe', {
      body: {
        user_id: 'usr_push_1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/fake_token_123',
        keys: {
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A4If_BpEg6VNB0W9g_fpSoO0w7',
          auth: 'tBHItJI5svbpez7KI4CCXg'
        }
      }
    });
    assert.equal(subRes.status, 201);
    assert.equal(subRes.body.ok, true);
    assert.equal(subRes.body.data.channel, 'webpush');

    // 3. Encolar notificación en Outbox
    const queueRes = await executeMockRequest('POST', '/api/notifications/queue', {
      body: {
        channel: 'whatsapp',
        recipient: '+50688887777',
        type: 'plan_confirmed',
        title: 'Tu plan está listo',
        payload: {
          guest_name: 'Daniel',
          plan_title: 'Café y Feria Mora',
          first_stop: 'Cafetería La Colina',
          start_time: '9:00 AM',
          plan_code: 'pln_demo'
        }
      }
    });
    assert.equal(queueRes.status, 201);
    assert.equal(queueRes.body.ok, true);
    assert.equal(queueRes.body.data.enqueued, true);

    // 4. Procesar lote de Outbox
    const processRes = await executeMockRequest('POST', '/api/notifications/outbox/process', {
      body: { batch_size: 5 }
    });
    assert.equal(processRes.status, 200);
    assert.equal(processRes.body.ok, true);

    // 5. Estado y telemetría de la cola
    const statusRes = await executeMockRequest('GET', '/api/notifications/outbox/status');
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.ok, true);
    assert.ok(statusRes.body.data.active_push_subscriptions >= 1);
  });

  await suite.test('28. Generación, Inspección y Canje de Códigos QR Criptográficos (/api/security/qr/*)', async () => {
    // 1. Generar token QR firmado
    const genRes = await executeMockRequest('POST', '/api/security/qr/generate', {
      body: {
        type: 'merchant_voucher',
        ref_id: 'plc_cafe_1',
        ttl_seconds: 3600,
        metadata: { discount_percent: 20, description: '20% en Café Geisha' }
      }
    });
    assert.equal(genRes.status, 201);
    assert.equal(genRes.body.ok, true);
    assert.ok(genRes.body.data.token);
    assert.ok(genRes.body.data.svg_preview.includes('<svg'));

    const qrToken = genRes.body.data.token;

    // 2. Inspeccionar token QR (sin canjear)
    const inspectRes = await executeMockRequest('GET', `/api/security/qr/inspect/${qrToken}`);
    assert.equal(inspectRes.status, 200);
    assert.equal(inspectRes.body.ok, true);
    assert.equal(inspectRes.body.data.valid, true);
    assert.equal(inspectRes.body.data.payload.ref_id, 'plc_cafe_1');

    // 3. Canjear token QR por primera vez
    const redeemRes = await executeMockRequest('POST', '/api/security/qr/redeem', {
      body: {
        token: qrToken,
        redeemed_by: 'caja_restaurante_1'
      }
    });
    assert.equal(redeemRes.status, 200);
    assert.equal(redeemRes.body.ok, true);
    assert.equal(redeemRes.body.data.redeemed, true);
    assert.equal(redeemRes.body.data.redeemed_by, 'caja_restaurante_1');

    // 4. Intentar canjear por segunda vez (debe rechazar con 400 por idempotencia/ya canjeado)
    const doubleRedeemRes = await executeMockRequest('POST', '/api/security/qr/redeem', {
      body: {
        token: qrToken,
        redeemed_by: 'caja_restaurante_1'
      }
    });
    assert.equal(doubleRedeemRes.status, 400);
    assert.equal(doubleRedeemRes.body.ok, false);
    assert.equal(doubleRedeemRes.body.error.already_redeemed, true);
  });

  await suite.test('29. Calculador de Movilidad Sostenible y Huella de Carbono MINAE/IMN (/api/mobility/*)', async () => {
    // 1. Factores oficiales de emisión para Costa Rica
    const factorsRes = await executeMockRequest('GET', '/api/mobility/gam-transit-factors');
    assert.equal(factorsRes.status, 200);
    assert.equal(factorsRes.body.ok, true);
    assert.equal(factorsRes.body.data.country, 'Costa Rica');
    assert.ok(factorsRes.body.data.baseline_car_g_co2_per_km > 0);

    // 2. Cálculo de viaje compartido (carpooling de 3 personas por 12 km en San José)
    const calcRes = await executeMockRequest('POST', '/api/mobility/carbon-footprint', {
      body: {
        distance_km: 12.0,
        transport_mode: 'carpool',
        passengers_count: 3,
        user_id: 'usr_daniel_green'
      }
    });
    assert.equal(calcRes.status, 200);
    assert.equal(calcRes.body.ok, true);
    assert.equal(calcRes.body.data.distance_km, 12.0);
    assert.ok(calcRes.body.data.co2_saved_grams > 1000);
    assert.ok(calcRes.body.data.colones_saved > 0);
    assert.ok(calcRes.body.data.equivalent_trees > 0);

    // 3. Insignias e impacto acumulado del usuario en tiempo real
    const badgesRes = await executeMockRequest('GET', '/api/mobility/badges/usr_daniel_green');
    assert.equal(badgesRes.status, 200);
    assert.equal(badgesRes.body.ok, true);
    assert.ok(badgesRes.body.data.total_co2_saved_kg >= 1.0);
    assert.ok(Array.isArray(badgesRes.body.data.badges));
    assert.ok(badgesRes.body.data.badges.some(b => b.code === 'tico_verde'));
  });

  await suite.test('30. Motor de Webhooks Salientes con Firma HMAC para Comercios (/api/merchants/webhooks/*)', async () => {
    // 1. Registrar webhook para una cafetería socia
    const subRes = await executeMockRequest('POST', '/api/merchants/webhooks/subscriptions', {
      body: {
        merchant_id: 'mch_cafe_mora_1',
        target_url: 'https://httpbin.org/post',
        events: ['plan.confirmed', 'voucher.redeemed']
      }
    });
    assert.equal(subRes.status, 201);
    assert.equal(subRes.body.ok, true);
    assert.ok(subRes.body.data.secret.startsWith('sec_'));

    const subId = subRes.body.data.id;

    // 2. Listar webhooks del comercio
    const listRes = await executeMockRequest('GET', '/api/merchants/webhooks/subscriptions?merchant_id=mch_cafe_mora_1');
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.ok, true);
    assert.equal(listRes.body.data.length, 1);

    // 3. Despachar evento y verificar registro de delivery firmado
    const dispatchRes = await executeMockRequest('POST', '/api/merchants/webhooks/dispatch', {
      body: {
        event_type: 'plan.confirmed',
        payload: {
          plan_code: 'pln_sabatino_1',
          people_count: 5,
          estimated_arrival: '10:30 AM'
        }
      }
    });
    assert.equal(dispatchRes.status, 200);
    assert.equal(dispatchRes.body.ok, true);
    assert.ok(dispatchRes.body.data.dispatched_count >= 1);

    // 4. Consultar bitácora de entregas
    const delivRes = await executeMockRequest('GET', '/api/merchants/webhooks/deliveries?merchant_id=mch_cafe_mora_1');
    assert.equal(delivRes.status, 200);
    assert.equal(delivRes.body.ok, true);
    assert.ok(delivRes.body.data.length >= 1);
    assert.equal(delivRes.body.data[0].event_type, 'plan.confirmed');

    // 5. Eliminar suscripción
    const deleteRes = await executeMockRequest('DELETE', `/api/merchants/webhooks/subscriptions/${subId}?merchant_id=mch_cafe_mora_1`);
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.ok, true);
  });

  await suite.test('31. Motor Financiero BCCR, Multi-divisa y Redondeo en Efectivo (/api/finance/*)', async () => {
    // 1. Tipos de cambio BCCR en vivo
    const ratesRes = await executeMockRequest('GET', '/api/finance/exchange-rates');
    assert.equal(ratesRes.status, 200);
    assert.equal(ratesRes.body.ok, true);
    assert.ok(ratesRes.body.data.usd_to_crc_compra > 400);
    assert.ok(ratesRes.body.data.usd_to_crc_venta > 400);

    // 2. Conversión dinámica CRC a USD
    const convertRes = await executeMockRequest('POST', '/api/finance/convert', {
      body: { amount: 25000, from: 'CRC', to: 'USD' }
    });
    assert.equal(convertRes.status, 200);
    assert.equal(convertRes.body.ok, true);
    assert.ok(convertRes.body.data.converted_amount > 40);

    // 3. Regla oficial de redondeo de efectivo BCCR
    const roundRes = await executeMockRequest('POST', '/api/finance/cash-rounding', {
      body: { amount_crc: 2453 }
    });
    assert.equal(roundRes.status, 200);
    assert.equal(roundRes.body.ok, true);
    assert.equal(roundRes.body.data.cash_rounded_crc, 2455); // 3 sube a 5

    // 4. División de cuenta de restaurante con IVA 13% y 10% ley de servicio
    const billRes = await executeMockRequest('POST', '/api/finance/split-bill-cr', {
      body: { subtotal_crc: 10000, people_count: 2, extra_tip_percentage: 0 }
    });
    assert.equal(billRes.status, 200);
    assert.equal(billRes.body.ok, true);
    assert.equal(billRes.body.data.iva_13_crc, 1300);
    assert.equal(billRes.body.data.service_10_crc, 1000);
    assert.equal(billRes.body.data.total_card_crc, 12300);
    assert.equal(billRes.body.data.per_person.people_count, 2);
    assert.equal(billRes.body.data.per_person.amount_crc_card, 6150);
  });

  await suite.test('32. Confort Urbano, Alerta de Aguacero Tico y Calidad del Aire (/api/weather/*)', async () => {
    // 1. Índice de confort al aire libre y alerta de lluvia
    const comfortRes = await executeMockRequest('GET', '/api/weather/comfort-index?lat=9.9333&lng=-84.0833');
    assert.equal(comfortRes.status, 200);
    assert.equal(comfortRes.body.ok, true);
    assert.equal(typeof comfortRes.body.data.outdoor_comfort_score, 'number');
    assert.ok(comfortRes.body.data.outdoor_comfort_score >= 0 && comfortRes.body.data.outdoor_comfort_score <= 100);
    assert.ok(typeof comfortRes.body.data.aguacero_alert.detected === 'boolean');
    assert.ok(comfortRes.body.data.recommendation);

    // 2. Calidad del aire en el GAM
    const aqiRes = await executeMockRequest('GET', '/api/weather/air-quality?lat=9.9333&lng=-84.0833');
    assert.equal(aqiRes.status, 200);
    assert.equal(aqiRes.body.ok, true);
    assert.ok(aqiRes.body.data.aqi_us >= 0);
    assert.ok(aqiRes.body.data.health_recommendation);
  });

  await suite.test('33. Geocodificación Territorial Inversa en Costa Rica (/api/places/reverse-geocode)', async () => {
    const geoRes = await executeMockRequest('GET', '/api/places/reverse-geocode?lat=9.9148&lng=-84.2421');
    assert.equal(geoRes.status, 200);
    assert.equal(geoRes.body.ok, true);
    assert.ok(geoRes.body.data.territorial_division);
    assert.equal(geoRes.body.data.territorial_division.country, 'Costa Rica');
    assert.ok(geoRes.body.data.formatted_tico_address.includes('Costa Rica'));
  });

  await suite.test('34. Generador Universal de Enlaces de Navegación Waze/Google Maps (/api/places/navigation-links)', async () => {
    const navRes = await executeMockRequest('GET', '/api/places/navigation-links?lat=9.9148&lng=-84.2421&label=Feria+del+Agricultor+Mora');
    assert.equal(navRes.status, 200);
    assert.equal(navRes.body.ok, true);
    assert.ok(navRes.body.data.links.waze_app.includes('waze://'));
    assert.ok(navRes.body.data.links.google_maps.includes('google.com/maps'));
    assert.ok(navRes.body.data.links.apple_maps.includes('maps.apple.com'));
    assert.ok(navRes.body.data.qr_waze_url);
  });

  await suite.test('35. Verificación de Cédula Física y Jurídica ante Hacienda CR (/api/businesses/verify-id/:id)', async () => {
    // 1. Cédula Jurídica (10 dígitos)
    const jurRes = await executeMockRequest('GET', '/api/businesses/verify-id/3101123456');
    assert.equal(jurRes.status, 200);
    assert.equal(jurRes.body.ok, true);
    assert.equal(jurRes.body.data.classification.type, 'juridica');
    assert.ok(jurRes.body.data.legal_name);

    // 2. Rechazo de cédula inválida con menos de 9 dígitos
    const invRes = await executeMockRequest('GET', '/api/businesses/verify-id/1234');
    assert.equal(invRes.status, 400);
    assert.equal(invRes.body.ok, false);
  });

  await suite.test('36. Feriados Oficiales de Costa Rica y Suspensión de Restricción (/api/calendar/holidays/*)', async () => {
    // 1. Lista de feriados de Costa Rica
    const listRes = await executeMockRequest('GET', '/api/calendar/holidays/cr?year=2026');
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.ok, true);
    assert.ok(Array.isArray(listRes.body.data));
    assert.ok(listRes.body.data.length >= 8);
    assert.ok(listRes.body.data.some(h => h.local_name.includes('Juan Santamaría') || h.local_name.includes('Navidad')));

    // 2. Estado de hoy y restricción vehicular
    const statusRes = await executeMockRequest('GET', '/api/calendar/holidays/status');
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.ok, true);
    assert.equal(typeof statusRes.body.data.is_holiday, 'boolean');
    assert.equal(typeof statusRes.body.data.vehicular_restriction_suspended, 'boolean');
    assert.ok(statusRes.body.data.restriction_status_note);
  });

  await suite.test('37. Monitor Sísmico y Tectónico de Costa Rica (/api/rescue/seismic-monitor)', async () => {
    const seismicRes = await executeMockRequest('GET', '/api/rescue/seismic-monitor');
    assert.equal(seismicRes.status, 200);
    assert.equal(seismicRes.body.ok, true);
    assert.equal(seismicRes.body.data.country, 'Costa Rica');
    assert.equal(typeof seismicRes.body.data.emergency_alert_active, 'boolean');
    assert.ok(Array.isArray(seismicRes.body.data.latest_events));
  });

  await suite.test('38. Optimizador de Rutas Multi-Parada para Salidas Grupales (/api/social/plans/optimize-route)', async () => {
    const rawStops = [
      { id: 'stop_1', name: 'Desayuno en Mora', lat: 9.9148, lng: -84.2421 },
      { id: 'stop_2', name: 'Mirador en Salitral', lat: 9.9450, lng: -84.2150 },
      { id: 'stop_3', name: 'Cafetería La Colina', lat: 9.9200, lng: -84.2350 },
      { id: 'stop_4', name: 'Heladería Artesanal', lat: 9.9250, lng: -84.2280 }
    ];

    const optRes = await executeMockRequest('POST', '/api/social/plans/optimize-route', {
      body: { stops: rawStops }
    });
    assert.equal(optRes.status, 200);
    assert.equal(optRes.body.ok, true);
    assert.equal(optRes.body.data.optimized, true);
    assert.equal(optRes.body.data.optimized_stops.length, 4);
    assert.ok(optRes.body.data.optimized_distance_km <= optRes.body.data.original_distance_km);
    assert.ok(optRes.body.data.traffic_advice);
  });

  await suite.test('39. Generador de Enlaces Rápidos y QR para Pagos SINPE Móvil (/api/finance/sinpe-deep-link)', async () => {
    const sinpeRes = await executeMockRequest('POST', '/api/finance/sinpe-deep-link', {
      body: {
        amount_crc: 8500,
        recipient_phone: '88887766',
        description: 'Almuerzo Soda'
      }
    });
    assert.equal(sinpeRes.status, 200);
    assert.equal(sinpeRes.body.ok, true);
    assert.equal(sinpeRes.body.data.recipient_phone, '+50688887766');
    assert.equal(sinpeRes.body.data.amount_crc, 8500);
    assert.ok(sinpeRes.body.data.banks.bac.command_text.includes('PASE 8500 88887766'));
    assert.ok(sinpeRes.body.data.banks.bncr.one_click_sms_uri.includes('sms:2627'));
    assert.ok(sinpeRes.body.data.qr_code_url);
  });

  await suite.test('40. Generador de Tarjetas de Metadatos Sociales Open Graph (/api/social/share-card/:type/:id)', async () => {
    const cardRes = await executeMockRequest('GET', '/api/social/share-card/place/plc_cafe_1');
    assert.equal(cardRes.status, 200);
    assert.equal(cardRes.body.ok, true);
    assert.ok(cardRes.body.data.open_graph['og:title']);
    assert.ok(cardRes.body.data.open_graph['og:image']);
    assert.ok(cardRes.body.data.html_meta_tags.includes('<meta property="og:title"'));
  });

  await suite.test('41. Flujo completo de Registro, Login, /me, Logout y revocación de Refresh Token (/api/auth/*)', async () => {
    // 1. Validación de contraseña corta y email inválido
    const badPwd = await executeMockRequest('POST', '/api/auth/register', {
      body: { name: 'Ana', email: 'ana@gotox.cr', password: '123' }
    });
    assert.equal(badPwd.status, 400);

    const badEmail = await executeMockRequest('POST', '/api/auth/register', {
      body: { name: 'Ana', email: 'correo-invalido', password: 'Password123!' }
    });
    assert.equal(badEmail.status, 400);

    // 2. Registro exitoso (ignora role='admin' y asigna 'client')
    const regRes = await executeMockRequest('POST', '/api/auth/register', {
      body: { name: 'Ana Test', email: 'Ana.Test@GoToX.cr', password: 'Password123!', role: 'admin' }
    });
    assert.equal(regRes.status, 201);
    assert.equal(regRes.body.data.user.role, 'client');
    assert.equal(regRes.body.data.user.email, 'ana.test@gotox.cr');
    assert.ok(regRes.body.data.token);
    assert.ok(regRes.body.data.refresh_token);

    // 3. Correo duplicado devuelve 409 Conflict
    const dupRes = await executeMockRequest('POST', '/api/auth/register', {
      body: { name: 'Ana 2', email: 'ana.test@gotox.cr', password: 'Password123!' }
    });
    assert.equal(dupRes.status, 409);

    // 4. Login con mayúsculas/minúsculas normalizadas y /api/auth/me
    const loginRes = await executeMockRequest('POST', '/api/auth/login', {
      body: { email: 'ANA.TEST@gotox.cr', password: 'Password123!' }
    });
    assert.equal(loginRes.status, 200);
    assert.ok(loginRes.body.data.token);

    const meRes = await executeMockRequest('GET', '/api/auth/me', {
      headers: { Authorization: `Bearer ${loginRes.body.data.token}` }
    });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.data.authenticated, true);
    assert.equal(meRes.body.data.user.email, 'ana.test@gotox.cr');

    // 5. Logout revoca el refresh_token y rechaza reutilización
    const logoutRes = await executeMockRequest('POST', '/api/auth/logout', {
      body: { refresh_token: loginRes.body.data.refresh_token }
    });
    assert.equal(logoutRes.status, 200);

    const reusedRefresh = await executeMockRequest('POST', '/api/auth/refresh', {
      body: { refresh_token: loginRes.body.data.refresh_token }
    });
    assert.equal(reusedRefresh.status, 401);
  });
});
