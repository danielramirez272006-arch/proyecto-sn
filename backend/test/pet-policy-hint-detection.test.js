process.env.NODE_ENV = 'test';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase, runMigrations, query, execute } = require('../src/shared/config/database');
const placesRepository = require('../src/modules/places/places-repository');
const petCompatibilityService = require('../src/modules/places/pet-compatibility-service');
const petVerificationService = require('../src/modules/admin-control/pet-verification-service');
const petPolicyHintDetector = require('../src/modules/admin-control/pet-policy-hint-detector');
const autoTaggerAi = require('../src/autonomous-agents/cartographer-agent/auto-tagger-ai');
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

describe('Detección automática de indicios de admisión de mascotas', () => {
  before(async () => {
    await initDatabase();
    await runMigrations();
  });

  it('conserva las reglas estrictas del etiquetador (falsos positivos y rechazo explícito)', () => {
    assert.equal(autoTaggerAi.analyzePetPolicyStatement('Tiene terraza amplia con sombra'), 'unknown');
    assert.equal(autoTaggerAi.analyzePetPolicyStatement('Vendemos comida para perros y snacks'), 'unknown');
    assert.equal(autoTaggerAi.analyzePetPolicyStatement('¿Se admiten mascotas?'), 'unknown');
    assert.equal(autoTaggerAi.analyzePetPolicyStatement('No se admiten mascotas en el establecimiento.'), 'not_allowed');
    assert.equal(autoTaggerAi.analyzePetPolicyStatement('Aceptamos perros con correa en nuestra terraza.'), 'allowed');

    const tags = autoTaggerAi.suggestTags('Café Brisa', 'Tiene terraza. Vendemos comida para perros. ¿Se admiten mascotas?');
    assert.equal(tags.some((t) => t.tag === 'pet_friendly'), false);
  });

  it('una reseña genera solo una sugerencia para revisión sin confirmar ni sobrescribir política, y Argos muestra «admisión por confirmar»', async () => {
    await initDatabase();
    const placeId = 'plc_hint_review_only';
    await seedPlace({
      id: placeId,
      name: 'Café Brisa Escazú',
      address: 'San Rafael de Escazú, 100m norte de Plaza',
      canton: 'Escazú',
      attributes_metadata: {},
      verified_by_admin: false,
    });

    const summary = await petPolicyHintDetector.runBatchDetection({
      placeIds: [placeId],
      sourcesProvider: async () => [
        {
          source_type: 'authorized_review',
          provider_name: 'google_places_review',
          source_url: 'https://maps.google.com/?cid=1001',
          branch_name: 'Café Brisa Escazú',
          branch_address: 'San Rafael de Escazú',
          text: 'Excelente café, aceptamos perros con correa en la terraza exterior.',
        },
      ],
    });

    assert.equal(summary.processed_places, 1);
    assert.equal(summary.suggestions_created, 1);

    // 1. Verificar evidencia guardada en place_pet_evidence con metadatos y condiciones desconocidas en null
    const evRows = await query('SELECT * FROM place_pet_evidence WHERE place_id = ?', [placeId]);
    assert.equal(evRows.length, 1);
    assert.equal(evRows[0].source_type, 'external_provider');
    assert.equal(evRows[0].access_status, 'allowed');
    assert.equal(evRows[0].evidence_ref, 'https://maps.google.com/?cid=1001');

    const cond = typeof evRows[0].conditions_json === 'string'
      ? JSON.parse(evRows[0].conditions_json)
      : evRows[0].conditions_json;
    assert.deepEqual(cond.species_allowed, ['dog']);
    assert.equal(cond.seating_access, 'outdoor');
    assert.equal(cond.leash_required, true);
    assert.equal(cond.max_pets, null);
    assert.equal(cond.reservation_required, null);
    assert.equal(cond._evidence_meta.suggestion_only, true);
    assert.equal(cond._evidence_meta.hint_source_type, 'authorized_review');
    assert.equal(cond._evidence_meta.source_url, 'https://maps.google.com/?cid=1001');
    assert.ok(cond._evidence_meta.checked_at);

    // 2. La reseña NUNCA confirma la política ni marca verified_by_admin
    const reconciled = petCompatibilityService.reconcileEvidence([
      { ...evRows[0], conditions: cond },
    ]);
    assert.equal(reconciled.is_confirmed, false);

    const placeAfter = await placesRepository.findById(placeId);
    assert.equal(Boolean(placeAfter.verified_by_admin), false);

    // 3. Se envió a la cola de revisión (automation_events)
    const events = await query("SELECT * FROM automation_events WHERE place_id = ? AND event_type = 'review_pending'", [placeId]);
    assert.equal(events.length, 1);

    // 4. Argos debe mostrar «admisión por confirmar» cuando solo hay sugerencias
    const argosCtx = await ragService.retrieveContext('restaurante cafe brisa escazu perros', {
      maxDocs: 1,
      maxPlaces: 5,
      includePlaces: true,
    });
    const matchedPlace = argosCtx.places.find((p) => p.id === placeId);
    assert.ok(matchedPlace, 'Argos debe recuperar el local desde el catálogo');
    assert.equal(matchedPlace.pet_access, 'unknown');
    assert.match(argosCtx.promptBlock, /Café Brisa Escazú[\s\S]*admisión por confirmar/);
  });

  it('una fuente de otra sucursal no se vincula al local y se envía a revisión', async () => {
    await initDatabase();
    const placeId = 'plc_hint_branch_escazu';
    await seedPlace({
      id: placeId,
      name: 'Café Alma Escazú',
      address: 'Avenida Escazú, San José',
      canton: 'Escazú',
      attributes_metadata: { external_id: 'gplace_escazu_001' },
    });

    const summary = await petPolicyHintDetector.runBatchDetection({
      placeIds: [placeId],
      sourcesProvider: async () => [
        {
          source_type: 'authorized_review',
          provider_name: 'google_places_review',
          provider_place_id: 'gplace_heredia_999',
          source_url: 'https://maps.google.com/?cid=9999',
          branch_name: 'Café Alma Heredia',
          branch_address: 'Centro de Heredia',
          text: 'Aceptamos mascotas en todo el restaurante.',
        },
        {
          source_type: 'official_website',
          provider_name: 'official_website',
          source_url: 'https://cafealma.cr/sucursal-curridabat',
          branch_name: 'Café Alma',
          branch_address: 'Curridabat, Pinares',
          text: 'En nuestra sucursal de Curridabat aceptamos perros en terraza.',
        },
      ],
    });

    assert.equal(summary.suggestions_created, 0);
    assert.equal(summary.branch_mismatches, 2);

    const evRows = await query('SELECT * FROM place_pet_evidence WHERE place_id = ?', [placeId]);
    assert.equal(evRows.length, 0, 'No debe vincular evidencia de otra sucursal al local');

    const events = await query("SELECT * FROM automation_events WHERE place_id = ? AND event_type = 'review_pending'", [placeId]);
    assert.equal(events.length, 2);
    const payload = JSON.parse(events[0].payload_json);
    assert.equal(payload.reason, 'branch_unidentified');
  });

  it('envía contradicciones al panel de revisión y nunca sobrescribe una confirmación vigente', async () => {
    await initDatabase();
    const placeId = 'plc_hint_conflict';
    const expiringIn5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    await seedPlace({
      id: placeId,
      name: 'Bistró Escalante Central',
      address: 'Barrio Escalante, San José',
      canton: 'San José',
    });

    // Confirmación directa vigente (próxima a vencer en 5 días -> elegible en el lote)
    await petVerificationService.upsertPetPolicy(
      placeId,
      {
        access_status: 'allowed',
        source_type: 'business_confirmation',
        conditions: { species_allowed: ['dog'], seating_access: 'outdoor', leash_required: true },
        evidence_ref: 'confirmacion_directa_comercio',
        expires_at: expiringIn5Days,
      },
      'owner_bistro'
    );

    const summary = await petPolicyHintDetector.runBatchDetection({
      placeIds: [placeId],
      expiringWithinDays: 14,
      sourcesProvider: async () => [
        {
          source_type: 'authorized_review',
          provider_name: 'google_places_review',
          source_url: 'https://maps.google.com/?cid=777',
          branch_name: 'Bistró Escalante Central',
          branch_address: 'Barrio Escalante, San José',
          text: 'Fuimos ayer y nos indicaron que no se admiten mascotas.',
        },
      ],
    });

    assert.equal(summary.suggestions_created, 1);
    assert.equal(summary.conflicts_flagged, 1);

    // La confirmación vigente en places.attributes_metadata NO fue sobrescrita
    const placeAfter = await placesRepository.findById(placeId);
    assert.equal(placeAfter.attributes_metadata.pet_policy.source_type, 'business_confirmation');
    assert.equal(placeAfter.attributes_metadata.pet_policy.access_status, 'allowed');

    // Se emitió contradiction_detected para el panel de revisión
    const conflictEvents = await query(
      "SELECT * FROM automation_events WHERE place_id = ? AND event_type = 'contradiction_detected'",
      [placeId]
    );
    assert.equal(conflictEvents.length, 1);
  });

  it('ejecutar el lote dos veces con la misma evidencia no crea duplicados y registra fallos de proveedor sin alterar la política', async () => {
    await initDatabase();
    const placeId = 'plc_hint_idempotent';
    await seedPlace({
      id: placeId,
      name: 'Terraza Santa Ana',
      address: 'Centro de Santa Ana, San José',
      canton: 'Santa Ana',
    });

    const sameSources = async () => [
      {
        source_type: 'official_website',
        provider_name: 'official_website',
        source_url: 'https://terrazasantaana.cr/faq',
        branch_name: 'Terraza Santa Ana',
        branch_address: 'Centro de Santa Ana',
        text: 'Se admiten mascotas en nuestra terraza al aire libre.',
      },
    ];

    const run1 = await petPolicyHintDetector.runBatchDetection({ placeIds: [placeId], sourcesProvider: sameSources });
    const run2 = await petPolicyHintDetector.runBatchDetection({ placeIds: [placeId], sourcesProvider: sameSources });

    assert.equal(run1.suggestions_created, 1);
    assert.equal(run2.suggestions_created, 0);
    assert.equal(run2.duplicates_skipped, 1);

    const evRows = await query('SELECT * FROM place_pet_evidence WHERE place_id = ?', [placeId]);
    assert.equal(evRows.length, 1, 'No debe duplicar place_pet_evidence');

    const revEvents = await query("SELECT * FROM automation_events WHERE place_id = ? AND event_type = 'review_pending'", [placeId]);
    assert.equal(revEvents.length, 1, 'No debe duplicar automation_events');

    // Fallo de proveedor: se registra sin modificar la política vigente
    const failRun = await petPolicyHintDetector.runBatchDetection({
      placeIds: [placeId],
      sourcesProvider: async () => {
        throw new Error('PROVIDER_TIMEOUT');
      },
    });
    assert.equal(failRun.provider_failures, 1);
    const placeStillUnchanged = await placesRepository.findById(placeId);
    assert.equal(Boolean(placeStillUnchanged.verified_by_admin), false);
  });
});
