process.env.NODE_ENV = 'test';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initDatabase, runMigrations, query, execute } = require('../src/shared/config/database');
const placesRepository = require('../src/modules/places/places-repository');
const petVerificationService = require('../src/modules/admin-control/pet-verification-service');
const petPolicyHintDetector = require('../src/modules/admin-control/pet-policy-hint-detector');
const ragService = require('../src/modules/rag/rag-service');

async function seedPlace({ id, name, address, canton = 'Escazú', attributes_metadata = {}, verified_by_admin = false }) {
  await execute('DELETE FROM automation_events WHERE place_id = ?', [id]).catch(() => {});
  await execute('DELETE FROM place_pet_evidence WHERE place_id = ?', [id]).catch(() => {});
  await execute('DELETE FROM places WHERE id = ?', [id]).catch(() => {});
  await placesRepository.create({
    id,
    name,
    category: 'restaurante',
    address,
    canton,
    lat: 9.9189,
    lng: -84.1398,
    verified_by_admin,
    attributes_metadata,
  });
  return placesRepository.findById(id);
}

describe('Revisión automática pet-friendly vía Supabase Cron y Edge Function', () => {
  before(async () => {
    await initDatabase();
    await runMigrations();
  });

  it('protege la invocación del programador (rechaza sin secreto o secreto inválido)', () => {
    const { authorizeCronRequest } = petPolicyHintDetector;
    assert.equal(authorizeCronRequest({}, '').status, 503);
    assert.equal(authorizeCronRequest({}, 'mi-secreto-cron-123').status, 401);
    assert.equal(authorizeCronRequest({ 'x-cron-secret': 'otro-secreto' }, 'mi-secreto-cron-123').status, 401);
    assert.equal(authorizeCronRequest({ 'x-cron-secret': 'mi-secreto-cron-123' }, 'mi-secreto-cron-123').ok, true);
    assert.equal(authorizeCronRequest({ Authorization: 'Bearer mi-secreto-cron-123' }, 'mi-secreto-cron-123').ok, true);

    // Verificar que existen la Edge Function y la migración de Supabase Cron
    const edgeFnPath = path.resolve(__dirname, '../supabase/functions/pet-policy-review-batch/index.ts');
    const cronSqlPath = path.resolve(__dirname, '../supabase/migrations/20261127_pet_policy_review_cron.sql');
    assert.equal(fs.existsSync(edgeFnPath), true);
    assert.equal(fs.existsSync(cronSqlPath), true);
    const cronSql = fs.readFileSync(cronSqlPath, 'utf8');
    assert.match(cronSql, /cron\.schedule/);
    assert.match(cronSql, /synodos_pet_policy_daily_review/);
  });

  it('ejecutar el lote dos veces no duplica evidencia y detiene el lote ante cuota agotada (429)', async () => {
    const p1 = 'plc_cron_quota_1';
    const p2 = 'plc_cron_quota_2';
    await seedPlace({ id: p1, name: 'Café Mirador Rohrmoser', address: 'Rohrmoser, San José', canton: 'San José' });
    await seedPlace({ id: p2, name: 'Soda Jardín Heredia', address: 'Centro de Heredia', canton: 'Heredia' });

    const stableSources = async (place) => [
      {
        source_type: 'official_website',
        provider_name: 'official_website',
        source_url: `https://ejemplo.cr/${place.id}`,
        branch_name: place.name,
        branch_address: place.address,
        text: 'Se admiten perros con correa en nuestra terraza.',
      },
    ];

    // Dos corridas idénticas -> cero duplicados
    const first = await petPolicyHintDetector.runBatchDetection({ placeIds: [p1], limit: 10, sourcesProvider: stableSources });
    const second = await petPolicyHintDetector.runBatchDetection({ placeIds: [p1], limit: 10, sourcesProvider: stableSources });
    assert.equal(first.suggestions_created, 1);
    assert.equal(second.suggestions_created, 0);
    assert.equal(second.duplicates_skipped, 1);

    const evCount = await query('SELECT COUNT(*) AS cnt FROM place_pet_evidence WHERE place_id = ?', [p1]);
    assert.equal(Number(evCount[0].cnt), 1);

    // Cuota gratuita agotada (HTTP 429) -> detiene el lote y deja el resto pendiente
    let calls = 0;
    const quotaRun = await petPolicyHintDetector.runBatchDetection({
      placeIds: [p1, p2],
      limit: 10,
      sourcesProvider: async () => {
        calls += 1;
        const err = new Error('HTTP_429_QUOTA_EXCEEDED');
        err.status = 429;
        throw err;
      },
    });

    assert.equal(calls, 1, 'Debe detenerse inmediatamente al recibir HTTP 429');
    assert.equal(quotaRun.stopped_due_to_quota, true);
    assert.equal(quotaRun.remaining_pending, 2);
  });

  it('con Cron desactivado o API externa caída, el mapa y Argos siguen funcionando y Argos muestra «admisión por confirmar» para evidencia sin confirmar o política vencida', async () => {
    const pUnconfirmed = 'plc_cron_argos_unconf';
    const pExpired = 'plc_cron_argos_expired';

    await seedPlace({
      id: pUnconfirmed,
      name: 'Cafetería Sol Sabana',
      address: 'Sabana Sur, San José',
      canton: 'San José',
      verified_by_admin: false,
      attributes_metadata: {},
    });

    await seedPlace({
      id: pExpired,
      name: 'Restaurante Luna Curridabat',
      address: 'Curridabat, San José',
      canton: 'Curridabat',
    });

    // Política vencida hace 10 días
    const expiredDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    await petVerificationService.upsertPetPolicy(
      pExpired,
      {
        access_status: 'allowed',
        source_type: 'business_confirmation',
        conditions: { species_allowed: ['dog'], seating_access: 'outdoor' },
        evidence_ref: 'confirmacion_antigua',
        expires_at: expiredDate,
      },
      'owner_luna'
    );

    // Simular caída total de API externa en el lote
    const failedBatch = await petPolicyHintDetector.runBatchDetection({
      placeIds: [pUnconfirmed],
      sourcesProvider: async () => {
        throw new Error('EXTERNAL_API_DOWN');
      },
    });
    assert.equal(failedBatch.provider_failures, 1);

    // El mapa (catálogo) sigue operando normalmente
    const mapPlaces = await placesRepository.findAll({ limit: 50 });
    assert.ok(mapPlaces.some((p) => p.id === pUnconfirmed));
    assert.ok(mapPlaces.some((p) => p.id === pExpired));

    // Argos sigue funcionando y muestra «admisión por confirmar» tanto para sin confirmar como para vencida
    const ctxUnconf = await ragService.retrieveContext('cafeteria sol sabana perros', { maxPlaces: 5, includePlaces: true });
    const itemUnconf = ctxUnconf.places.find((p) => p.id === pUnconfirmed);
    assert.ok(itemUnconf);
    assert.equal(itemUnconf.pet_access, 'unknown');
    assert.match(ctxUnconf.promptBlock, /Cafetería Sol Sabana[\s\S]*admisión por confirmar/);

    const ctxExp = await ragService.retrieveContext('restaurante luna curridabat perros', { maxPlaces: 5, includePlaces: true });
    const itemExp = ctxExp.places.find((p) => p.id === pExpired);
    assert.ok(itemExp);
    assert.equal(itemExp.pet_access, 'unknown');
    assert.match(ctxExp.promptBlock, /Restaurante Luna Curridabat[\s\S]*admisión por confirmar/);

    // Verificar bandeja unificada de revisión administrativa y acknowledge
    const queue = await petVerificationService.getReviewQueue({ limit: 20 });
    assert.equal(typeof queue.total, 'number');
    assert.ok(queue.counts);
    if (queue.items.length > 0) {
      const ack = await petVerificationService.acknowledgeAutomationEvent(queue.items[0].id, 'usr_admin_1');
      assert.equal(ack.status, 'acknowledged');
    }
  });
});
