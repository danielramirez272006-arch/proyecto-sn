const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');

// Construye un JPEG válido con dimensiones 640x480 y segmento APP1 (EXIF GPS) para verificar sanitización EXIF
function createTestJpegDataUrl(width = 640, height = 480) {
  const soi = Buffer.from([0xff, 0xd8]);
  const exifPayload = Buffer.from('Exif\0\0GPSLat=9.9352', 'ascii');
  const app1 = Buffer.alloc(4 + exifPayload.length);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1.writeUInt16BE(2 + exifPayload.length, 2);
  exifPayload.copy(app1, 4);

  const sof0 = Buffer.alloc(13);
  sof0[0] = 0xff;
  sof0[1] = 0xc0;
  sof0.writeUInt16BE(11, 2);
  sof0[4] = 8;
  sof0.writeUInt16BE(height, 5);
  sof0.writeUInt16BE(width, 7);
  sof0[9] = 1;
  sof0[10] = 1;
  sof0[11] = 0x11;
  sof0[12] = 0;

  const sos = Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x00]);
  const eoi = Buffer.from([0xff, 0xd9]);
  const buf = Buffer.concat([soi, app1, sof0, sos, eoi]);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

const SAMPLE_JPEG_DATA_URL = createTestJpegDataUrl(640, 480);

function requestJson(server, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(raw) });
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('Pre-Triaje Visual de Mascotas con Google Gemini Vision (/api/pets/analyze-photo)', () => {
  let server;
  let firstAnalysisId = null;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('debe listar las 10 áreas clínicas soportadas en GET /api/pets/analyze-photo/focus-areas', async () => {
    const res = await requestJson(server, 'GET', '/api/pets/analyze-photo/focus-areas');
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.equal(res.json.data.focus_areas.length, 10);
  });

  it('debe rechazar con 400 cuando no se envía image_base64 ni photo_url', async () => {
    const res = await requestJson(server, 'POST', '/api/pets/analyze-photo', {
      symptoms: 'Se rasca la oreja'
    });
    assert.equal(res.status, 400);
    assert.equal(res.json.ok, false);
  });

  it('debe analizar una foto general, sanitizar EXIF GPS, e incluir plan veterinario, clima GAM y rutas GPS', async () => {
    const res = await requestJson(server, 'POST', '/api/pets/analyze-photo', {
      image_base64: SAMPLE_JPEG_DATA_URL,
      focus_area: 'general',
      lat: 9.9361,
      lng: -84.0631,
      pet_context: {
        nombre: 'Bruno',
        raza: 'Golden Retriever',
        pesoKg: 28,
        edadAnos: 4
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    const data = res.json.data;
    firstAnalysisId = data.analysis_id;

    assert.ok(data.analysis_id.startsWith('pva_'));
    assert.equal(data.image_telemetry.exif_sanitized, true);
    assert.equal(data.image_telemetry.exif_metadata_removed, true);
    assert.equal(data.image_telemetry.width, 640);
    assert.equal(data.image_telemetry.height, 480);
    assert.ok(data.approximate_profile.estimated_breed);
    assert.ok(data.veterinary_action_plan.recommended_specialist);
    assert.ok(Array.isArray(data.veterinary_action_plan.questions_for_your_vet));
    assert.ok(Array.isArray(data.veterinary_action_plan.vital_signs_checklist));
    assert.ok(data.gam_outing_recommendation.live_gam_weather.estimated_asphalt_temp_c > 0);
    assert.ok(typeof data.recommended_vet_clinics[0].distance_km === 'number');
    assert.ok(data.recommended_vet_clinics[0].navigation_links.waze);
    assert.ok(data.legal_disclaimer.includes('aproximada'));
  });

  it('debe permitir recuperar el detalle del reporte por ID y comparar evolución en /follow-up cuando empeora', async () => {
    const detailRes = await requestJson(server, 'GET', `/api/pets/analyze-photo/${firstAnalysisId}`);
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.json.data.analysis_id, firstAnalysisId);

    const followUpRes = await requestJson(server, 'POST', '/api/pets/analyze-photo/follow-up', {
      previous_analysis_id: firstAnalysisId,
      images_base64: [SAMPLE_JPEG_DATA_URL, SAMPLE_JPEG_DATA_URL],
      focus_area: 'patas_almohadillas',
      symptoms: 'Empeoró, ahora tiene quemadura grave y herida abierta con sangrado en la almohadilla por asfalto caliente',
      pet_context: {
        nombre: 'Bruno',
        raza: 'Golden Retriever',
        pesoKg: 28,
        edadAnos: 4
      }
    });

    assert.equal(followUpRes.status, 200);
    const data = followUpRes.json.data;
    assert.equal(data.images_analyzed_count, 2);
    assert.equal(data.visual_health_triage.severity_level, 'urgente');
    assert.equal(data.visual_health_triage.requires_vet_visit, true);
    assert.equal(data.visual_health_triage.immediate_emergency, true);
    assert.equal(data.evolution_comparison.evolution_status, 'empeorando');
    assert.equal(data.evolution_comparison.worsened, true);
    assert.equal(data.recommended_vet_clinics[0].is_24h_verified, true);
  });

  it('debe registrar la consulta en ai_interaction_logs y listarla en /api/pets/analyze-photo/history', async () => {
    const res = await requestJson(server, 'GET', '/api/pets/analyze-photo/history?limit=5');
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.ok(Array.isArray(res.json.data.analyses));
    assert.ok(res.json.data.analyses.length >= 2);
  });
});
