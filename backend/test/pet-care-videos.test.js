process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { initDatabase, runMigrations, execute } = require('../src/shared/config/database');
const apiRouter = require('../src/shared/routing/api-router');
const { generateToken } = require('../src/shared/middlewares/auth-role-guard');
const { parseAndValidateYouTubeUrl, parseYouTubeIdOrUrl } = require('../src/modules/vet-hub/pet-care-videos/youtube-parser');
const petCareVideosService = require('../src/modules/vet-hub/pet-care-videos/pet-care-videos-service');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  return app;
}

async function executeMockRequest(app, method, url, { headers = {}, body = null } = {}) {
  const req = {
    method,
    url,
    headers: { 'content-type': 'application/json', ...headers },
    body: body || {},
    socket: { remoteAddress: '127.0.0.1' }
  };

  return new Promise((resolve) => {
    let statusCode = 200;
    const responseHeaders = {};
    let responseBody = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      setHeader(k, v) {
        responseHeaders[k.toLowerCase()] = v;
      },
      getHeader(k) {
        return responseHeaders[k.toLowerCase()];
      },
      json(data) {
        responseBody = data;
        resolve({ status: statusCode, headers: responseHeaders, body: responseBody });
      },
      send(data) {
        responseBody = data;
        resolve({ status: statusCode, headers: responseHeaders, body: responseBody });
      }
    };

    app.handle(req, res, (err) => {
      if (err) {
        resolve({
          status: err.status || 500,
          headers: responseHeaders,
          body: { ok: false, error: { message: err.message } }
        });
      } else {
        resolve({ status: 404, headers: responseHeaders, body: { ok: false, error: { message: 'Not found' } } });
      }
    });
  });
}

test('Suite Módulo «Videos para cuidar a tu mascota» y «Pregúntale al video»', async (suite) => {
  let app;
  let adminToken;
  let clientToken;

  suite.before(async () => {
    process.env.NODE_ENV = 'test';
    await initDatabase();
    await runMigrations();

    await execute('DELETE FROM pet_video_broken_reports');
    await execute('DELETE FROM pet_video_fragments');
    await execute('DELETE FROM pet_videos');

    app = createTestApp();
    adminToken = generateToken({ id: 'usr_admin_vet', username: 'admin_vet', role: 'admin' });
    clientToken = generateToken({ id: 'usr_client_vet', username: 'client_vet', role: 'client' });
  });

  await suite.test('1. Validador canónico de YouTube: Rechaza URLs externas y no HTTPS', () => {
    // 1. Rechazar HTTP inseguro
    assert.throws(
      () => parseAndValidateYouTubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      /Únicamente se permiten enlaces HTTPS/
    );

    // 2. Rechazar dominios externos (Vimeo, TikTok, phishing)
    assert.throws(
      () => parseAndValidateYouTubeUrl('https://vimeo.com/123456789'),
      /YouTube es la única fuente de videos permitida/
    );

    assert.throws(
      () => parseAndValidateYouTubeUrl('https://malicious-site.com/youtube.com/watch?v=dQw4w9WgXcQ'),
      /YouTube es la única fuente de videos permitida/
    );

    // 3. Aceptar URLs HTTPS válidas y extraer ID canónico de 11 caracteres
    const r1 = parseAndValidateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(r1.youtube_id, 'dQw4w9WgXcQ');
    assert.equal(r1.canonical_url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    const r2 = parseAndValidateYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?t=45');
    assert.equal(r2.youtube_id, 'dQw4w9WgXcQ');

    const r3 = parseAndValidateYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    assert.equal(r3.youtube_id, 'dQw4w9WgXcQ');

    const r4 = parseYouTubeIdOrUrl('dQw4w9WgXcQ');
    assert.equal(r4.youtube_id, 'dQw4w9WgXcQ');
  });

  await suite.test('2. Control de Acceso: Rutas administrativas rechazan a no administradores', async () => {
    // Sin token
    const resNoAuth = await executeMockRequest(app, 'GET', '/api/admin/pet-videos/search-youtube');
    assert.equal(resNoAuth.status, 401);

    // Con rol client (no admin)
    const resClient = await executeMockRequest(app, 'GET', '/api/admin/pet-videos/search-youtube', {
      headers: { authorization: `Bearer ${clientToken}` }
    });
    assert.equal(resClient.status, 403);
  });

  await suite.test('3. Búsqueda de videos públicos en YouTube Data API (Admin)', async () => {
    const res = await executeMockRequest(app, 'GET', '/api/admin/pet-videos/search-youtube?q=bano+perro', {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data[0].youtube_id);
    assert.ok(res.body.data[0].title);
  });

  let video1Id;
  let video2Id;

  await suite.test('4. Registrar video pegando URL de YouTube y Deduplicación canónica', async () => {
    // 1. Rechazo de URL externa al registrar
    const badRes = await executeMockRequest(app, 'POST', '/api/admin/pet-videos/register', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { url: 'https://vimeo.com/987654321' }
    });
    assert.equal(badRes.status, 400);

    // 2. Registro exitoso de video 1 (perro / baño)
    const res1 = await executeMockRequest(app, 'POST', '/api/admin/pet-videos/register', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { url: 'https://www.youtube.com/watch?v=c2eWkJ3bA78' }
    });

    assert.equal(res1.status, 201);
    assert.equal(res1.body.ok, true);
    assert.equal(res1.body.data.youtube_id, 'c2eWkJ3bA78');
    assert.equal(res1.body.data.status, 'draft');
    assert.ok(res1.body.data.id);
    video1Id = res1.body.data.id;

    // 3. Deduplicación: Intentar registrar el mismo video con otro formato de URL (youtu.be)
    const dupRes = await executeMockRequest(app, 'POST', '/api/admin/pet-videos/register', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { url: 'https://youtu.be/c2eWkJ3bA78?si=sample' }
    });

    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.body.ok, true);
    assert.equal(dupRes.body.data.id, video1Id);
    assert.equal(dupRes.body.meta.already_registered, true);

    // 4. Registro de video 2 (gato / primeros auxilios)
    const res2 = await executeMockRequest(app, 'POST', '/api/admin/pet-videos/register', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' }
    });
    assert.equal(res2.status, 201);
    video2Id = res2.body.data.id;
  });

  await suite.test('5. Acción «Analizar video» con Gemini: Estructura, validación de tiempos y borrador', async () => {
    const resAnalyze = await executeMockRequest(app, 'POST', `/api/admin/pet-videos/${video1Id}/analyze`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.equal(resAnalyze.status, 200);
    assert.equal(resAnalyze.body.ok, true);
    assert.ok(resAnalyze.body.data.summary);
    assert.ok(resAnalyze.body.data.species);
    assert.ok(resAnalyze.body.data.topic);
    assert.ok(Array.isArray(resAnalyze.body.data.fragments));
    assert.ok(resAnalyze.body.data.fragments.length >= 1);
    assert.ok(resAnalyze.body.data.fragments.length <= 3);

    // Comprobar que los fragmentos tengan segundo inicial y segundo final coherentes
    for (const f of resAnalyze.body.data.fragments) {
      assert.ok(f.question);
      assert.ok(f.answer);
      assert.ok(typeof f.start_seconds === 'number');
      assert.ok(f.start_seconds >= 0);
      if (f.end_seconds !== null && f.end_seconds !== undefined) {
        assert.ok(f.end_seconds >= f.start_seconds);
      }
    }

    // Comprobar que permanece como borrador oculto al público
    assert.equal(resAnalyze.body.data.status, 'draft');

    // 2. Reutilización de análisis previo (evitar doble consumo de cuota)
    const resReused = await executeMockRequest(app, 'POST', `/api/admin/pet-videos/${video1Id}/analyze`, {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { force_reanalyze: false }
    });
    assert.equal(resReused.status, 200);
    assert.equal(resReused.body.data.reused_cache, true);

    // Analizar también el video 2
    await executeMockRequest(app, 'POST', `/api/admin/pet-videos/${video2Id}/analyze`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
  });

  await suite.test('6. Borradores permanecen ocultos del catálogo público', async () => {
    // GET /api/pet-videos público
    const resPublic = await executeMockRequest(app, 'GET', '/api/pet-videos');
    assert.equal(resPublic.status, 200);
    assert.equal(resPublic.body.ok, true);
    // Ninguno de los dos videos está aprobado aún
    assert.equal(resPublic.body.data.length, 0);

    // GET /api/pet-videos/:id público para borrador debe devolver 404
    const resDetail = await executeMockRequest(app, 'GET', `/api/pet-videos/${video1Id}`);
    assert.equal(resDetail.status, 404);
  });

  await suite.test('7. Corrección de respuestas y tiempos por el administrador (PUT)', async () => {
    const resUpdate = await executeMockRequest(app, 'PUT', `/api/admin/pet-videos/${video1Id}`, {
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Cómo bañar a tu perro sin estrés en Costa Rica',
        species: 'perro',
        topic: 'higiene',
        summary: 'Guía práctica corregida por el veterinario para baño en casa.',
        fragments: [
          {
            question: '¿Cada cuánto tiempo se debe bañar al perro?',
            answer: 'Se recomienda bañar al perro cada 3 o 4 semanas para no dañar los aceites naturales de su piel.',
            start_seconds: 40,
            end_seconds: 90
          },
          {
            question: '¿Qué temperatura del agua es la adecuada?',
            answer: 'El agua debe estar templada, entre 36 y 38 grados centígrados.',
            start_seconds: 110,
            end_seconds: 150
          }
        ]
      }
    });

    assert.equal(resUpdate.status, 200);
    assert.equal(resUpdate.body.ok, true);
    assert.equal(resUpdate.body.data.title, 'Cómo bañar a tu perro sin estrés en Costa Rica');
    assert.equal(resUpdate.body.data.fragments.length, 2);
    assert.equal(resUpdate.body.data.fragments[0].start_seconds, 40);
  });

  await suite.test('8. Aprobación del video por el Administrador', async () => {
    const resApprove = await executeMockRequest(app, 'POST', `/api/admin/pet-videos/${video1Id}/approve`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.equal(resApprove.status, 200);
    assert.equal(resApprove.body.ok, true);
    assert.equal(resApprove.body.data.status, 'approved');
    assert.ok(resApprove.body.data.approved_by);
    assert.ok(resApprove.body.data.approved_at);

    // Aprobar también video 2
    await executeMockRequest(app, 'POST', `/api/admin/pet-videos/${video2Id}/approve`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    // Ahora sí deben aparecer en el catálogo público
    const resPublicApproved = await executeMockRequest(app, 'GET', '/api/pet-videos?species=perro');
    assert.equal(resPublicApproved.status, 200);
    assert.equal(resPublicApproved.body.ok, true);
    assert.ok(resPublicApproved.body.data.length >= 1);
    const foundV1 = resPublicApproved.body.data.find(v => v.id === video1Id);
    assert.ok(foundV1, 'El video 1 debe estar presente en el catálogo público');
    assert.equal(foundV1.verified_fragments_count, 2);

    // Detalle público accesible
    const resDetailApproved = await executeMockRequest(app, 'GET', `/api/pet-videos/${video1Id}`);
    assert.equal(resDetailApproved.status, 200);
    assert.equal(resDetailApproved.body.ok, true);
    assert.equal(resDetailApproved.body.data.fragments.length, 2);
  });

  await suite.test('9. «Pregúntale al video»: Coincidencia en fragmentos del video abierto', async () => {
    const resAsk = await executeMockRequest(app, 'POST', `/api/pet-videos/${video1Id}/questions`, {
      body: { question: '¿Cada cuánto tiempo debo bañar a mi perro?' }
    });

    assert.equal(resAsk.status, 200);
    assert.equal(resAsk.body.ok, true);
    assert.equal(resAsk.body.data.matched, true);
    assert.equal(resAsk.body.data.match_source, 'current_video');
    assert.equal(resAsk.body.data.start_seconds, 40);
    assert.ok(resAsk.body.data.answer.includes('3 o 4 semanas'));
    assert.equal(resAsk.body.data.youtube_id, 'c2eWkJ3bA78');
    assert.ok(resAsk.body.data.video_title);
  });

  await suite.test('10. «Pregúntale al video»: Búsqueda y coincidencia en OTRO video aprobado', async () => {
    // Estamos en video 1 (perro/baño), pero preguntamos sobre primeros auxilios felinos
    const resAskOther = await executeMockRequest(app, 'POST', `/api/pet-videos/${video1Id}/questions`, {
      body: { question: '¿Qué hacer ante una emergencia o primeros auxilios en casa con mi gato?' }
    });

    assert.equal(resAskOther.status, 200);
    assert.equal(resAskOther.body.ok, true);
    assert.equal(resAskOther.body.data.matched, true);
    assert.equal(resAskOther.body.data.match_source, 'other_video');
    assert.equal(resAskOther.body.data.video_id, video2Id);
    assert.equal(resAskOther.body.data.youtube_id, 'jNQXAC9IVRw');
    assert.ok(resAskOther.body.data.start_seconds >= 0);
    assert.ok(resAskOther.body.data.answer);
  });

  await suite.test('11. «Pregúntale al video»: Ausencia de coincidencias respaldadas', async () => {
    const resNoMatch = await executeMockRequest(app, 'POST', `/api/pet-videos/${video1Id}/questions`, {
      body: { question: '¿Cómo construir un cohete espacial para loros?' }
    });

    assert.equal(resNoMatch.status, 200);
    assert.equal(resNoMatch.body.ok, true);
    assert.equal(resNoMatch.body.data.matched, false);
    assert.equal(resNoMatch.body.data.message, 'Todavía no tenemos un fragmento que responda esa pregunta');
    assert.ok(Array.isArray(resNoMatch.body.data.suggested_topics));
  });

  await suite.test('12. «Pregúntale al video»: Consulta sobre síntomas clínicos deriva al directorio veterinario', async () => {
    const resEmergency = await executeMockRequest(app, 'POST', `/api/pet-videos/${video1Id}/questions`, {
      body: { question: 'Mi perro tiene vómito con sangre y convulsiones, qué dosis de paracetamol le doy?' }
    });

    assert.equal(resEmergency.status, 200);
    assert.equal(resEmergency.body.ok, true);
    assert.ok(resEmergency.body.data.clinical_notice);
    assert.equal(resEmergency.body.data.clinical_notice.clinical_warning, true);
    assert.ok(resEmergency.body.data.clinical_notice.alert_message.includes('No automediques a tu mascota'));
    assert.ok(resEmergency.body.data.clinical_notice.veterinary_directory.directory_url);
    assert.ok(resEmergency.body.data.clinical_notice.veterinary_directory.emergency_hotlines.length >= 1);
  });

  await suite.test('13. Reporte de enlace roto y visualización administrativa', async () => {
    // 1. Reporte público
    const resReport = await executeMockRequest(app, 'POST', `/api/pet-videos/${video1Id}/report-broken`, {
      body: { reason: 'El creador puso el video en privado' }
    });

    assert.equal(resReport.status, 200);
    assert.equal(resReport.body.ok, true);
    assert.equal(resReport.body.data.reported, true);

    // 2. Visualización administrativa de reportes
    const resBrokenList = await executeMockRequest(app, 'GET', '/api/admin/pet-videos/broken-reports', {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.equal(resBrokenList.status, 200);
    assert.equal(resBrokenList.body.ok, true);
    assert.ok(Array.isArray(resBrokenList.body.data));
    assert.ok(resBrokenList.body.data.length >= 1);
    assert.equal(resBrokenList.body.data[0].video_id, video1Id);
  });

  await suite.test('14. Retiro del catálogo por el Administrador', async () => {
    const resRetire = await executeMockRequest(app, 'POST', `/api/admin/pet-videos/${video1Id}/retire`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.equal(resRetire.status, 200);
    assert.equal(resRetire.body.ok, true);
    assert.equal(resRetire.body.data.status, 'archived');

    // Ahora video 1 no debe aparecer en el catálogo público
    const resPublicAfterRetire = await executeMockRequest(app, 'GET', `/api/pet-videos/${video1Id}`);
    assert.equal(resPublicAfterRetire.status, 404);
  });

  await suite.test('15. Buscador inteligente de videos con Gemini (Cliente): selección del video más indicado y alertas médicas', async () => {
    // 15.1 Búsqueda normal con síntomas de emergencia (debe activar alerta médica y devolver video)
    const resEmergency = await executeMockRequest(app, 'POST', '/api/pet-videos/smart-search', {
      body: { text: 'Mi perro comió chocolate y está temblando', species: 'perros' }
    });

    assert.equal(resEmergency.status, 200);
    assert.equal(resEmergency.body.ok, true);
    assert.equal(resEmergency.body.data.is_medical_emergency, true);
    assert.ok(resEmergency.body.data.emergency_alert);
    assert.equal(resEmergency.body.data.emergency_alert.active, true);
    assert.ok(resEmergency.body.data.emergency_alert.directory_link.includes('/vet-hub'));
    assert.ok(resEmergency.body.data.best_match);
    assert.ok(resEmergency.body.data.best_match.why_recommended);

    // 15.2 Búsqueda vía GET /api/pet-videos/search
    const resGetSearch = await executeMockRequest(app, 'GET', '/api/pet-videos/search?q=primeros+auxilios+gato');
    assert.equal(resGetSearch.status, 200);
    assert.equal(resGetSearch.body.ok, true);
    assert.ok(resGetSearch.body.data.best_match);
  });
});

