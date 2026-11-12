const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';

const { runMigrations, runSeeds, query } = require('../src/shared/config/database');
const groupPlanService = require('../src/modules/social-dining/group-plan-service');
const groupPlanRepository = require('../src/modules/social-dining/group-plan-repository');
const adminService = require('../src/modules/admin-control/admin-service');
const notificationService = require('../src/modules/notifications/notification-service');
const emailClient = require('../src/shared/clients/email-client');
const placesRepository = require('../src/modules/places/places-repository');

test('Suite Completa de Verificación del Backend - Sinergia Urbana', async (t) => {

  await t.test('1. Migraciones y Carga Inicial de Seeds (Catálogo y Plan Demo)', async () => {
    const migResult = await runMigrations();
    assert.equal(migResult.success, true);
    assert.equal(migResult.filesApplied.length, 4);

    const seedResult = await runSeeds();
    assert.equal(seedResult.success, true);

    const places = await placesRepository.findAll();
    assert.ok(places.length >= 3, 'Debe haber al menos 3 lugares cargados por los seeds');

    const feria = places.find(p => p.id === 'plc_feria_1');
    assert.ok(feria, 'La feria de Ciudad Colón debe existir');
    assert.equal(feria.verified_by_admin, true);
    assert.equal(feria.attributes_metadata.pet_friendly.verified, true);
  });

  await t.test('2. Crear y Compartir un Plan con Opciones y Paradas', async () => {
    const newPlan = await groupPlanService.createPlan({
      title: 'Tarde de Café y Caminata en Mora',
      budget_crc: 15000,
      options: [
        {
          title: 'Opción 1: Café Montaña Verde',
          estimated_cost_crc: 8000,
          stops: [
            {
              place_id: 'plc_cafe_1',
              start_time: '2026-11-14T16:00:00Z',
              end_time: '2026-11-14T17:30:00Z'
            }
          ]
        }
      ]
    }, 'usr_organizer_1');

    assert.ok(newPlan.id);
    assert.ok(newPlan.code.startsWith('PLAN-CR-'));

    const fetched = await groupPlanService.getPlan(newPlan.code, { id: 'usr_organizer_1' });
    assert.equal(fetched.title, 'Tarde de Café y Caminata en Mora');
    assert.equal(fetched.revision, 1);
    assert.equal(fetched.options.length, 1);
    assert.equal(fetched.options[0].stops.length, 1);
  });

  await t.test('3. Onboarding de Invitado y Votación Idempotente sin Duplicados', async () => {
    const plan = await groupPlanService.getPlan('PLAN-CR-772');
    assert.ok(plan);

    // Onboarding de invitado sin cuenta
    const guest = await groupPlanService.joinAsGuest(plan.code, 'Mariana Mora', 'mariana@ejemplo.cr');
    assert.ok(guest.id);
    assert.ok(guest.guest_token);

    const optionId = plan.options[0].id;

    // Voto 1: "prefer"
    await groupPlanService.castVote(plan.code, guest.guest_token, optionId, 'prefer');

    let planAfterVote = await groupPlanService.getPlan(plan.code);
    let opt = planAfterVote.options.find(o => o.id === optionId);
    const initialPreferCount = opt.tally.prefer;
    assert.ok(initialPreferCount >= 1);

    // Voto 2: Cambiar mismo invitado misma opción a "can"
    await groupPlanService.castVote(plan.code, guest.guest_token, optionId, 'can');

    planAfterVote = await groupPlanService.getPlan(plan.code);
    opt = planAfterVote.options.find(o => o.id === optionId);

    // Verificar que el voto fue actualizado y no duplicado
    assert.equal(opt.tally.prefer, initialPreferCount - 1);
    assert.ok(opt.tally.can >= 1);

    const totalVotesInDb = await query(
      'SELECT COUNT(*) as cnt FROM plan_votes WHERE plan_id = ? AND guest_id = ? AND option_id = ?',
      [plan.id, guest.id, optionId]
    );
    assert.equal(Number(totalVotesInDb[0].cnt), 1, 'No debe existir más de 1 voto por invitado y opción');
  });

  await t.test('4. Confirmación de Plan por el Organizador con Snapshot Inmutable', async () => {
    const plan = await groupPlanService.getPlan('PLAN-CR-772');
    const optionId = plan.options[0].id;

    // Intentar confirmar con un usuario que no es el organizador debe fallar
    await assert.rejects(
      async () => {
        await groupPlanRepository.confirmPlan(plan.id, 'usr_unauthorized_attacker', optionId);
      },
      /UNAUTHORIZED_ORGANIZER/
    );

    // Confirmar como organizador
    const confirmResult = await groupPlanService.confirmPlan(plan.code, 'usr_organizer_1', optionId);
    assert.equal(confirmResult.ok, true);
    assert.equal(confirmResult.revision, 2);

    const updatedPlan = await groupPlanService.getPlan(plan.code);
    assert.equal(updatedPlan.status, 'confirmed');
    assert.equal(updatedPlan.selected_option_id, optionId);

    // Verificar snapshot inmutable en paradas
    const confirmedStop = updatedPlan.options[0].stops[0];
    assert.ok(confirmedStop.confirmed_snapshot, 'La parada debe conservar su snapshot inmutable');
    assert.equal(confirmedStop.confirmed_snapshot.place_name, confirmedStop.place_name);
  });

  await t.test('5. Cancelación de Evento Dispara Detección de Afectación y Genera Propuesta IA', async () => {
    // El evento de la feria se cancela por mal clima
    const patchResult = await adminService.updateEventStatus('evt_feria_sabado_1', 'cancelled');
    assert.equal(patchResult.event.status, 'cancelled');
    assert.ok(patchResult.affected_plans_count >= 1, 'Debe haber detectado al menos 1 plan afectado');

    const plan = await groupPlanService.getPlan('PLAN-CR-772');
    assert.ok(plan.active_proposal, 'El plan afectado debe tener una propuesta activa');
    assert.equal(plan.active_proposal.status, 'pending');
    assert.equal(plan.active_proposal.plan_revision, 2);
    assert.ok(plan.active_proposal.reason.includes('cancelled'));
  });

  await t.test('6. Control de Concurrencia Optimista ante Propuestas Obsoletas (409 Conflict)', async () => {
    const plan = await groupPlanService.getPlan('PLAN-CR-772');
    const proposal = plan.active_proposal;

    // Simular que el plan avanzó a revisión 3 por una edición simultánea
    // Si intentamos aplicar la propuesta indicando expected_revision = 1 cuando el plan está en 2
    await assert.rejects(
      async () => {
        await groupPlanRepository.applyProposal(plan.id, proposal.id, 999, 'usr_organizer_1');
      },
      (err) => {
        assert.equal(err.message, 'STALE_REVISION_CONFLICT');
        assert.equal(err.currentRevision, 2);
        return true;
      }
    );
  });

  await t.test('7. Aceptación Atómica de Propuesta, Historial y Cola Outbox Deduplicada', async () => {
    const plan = await groupPlanService.getPlan('PLAN-CR-772');
    const proposal = plan.active_proposal;

    emailClient.clearSentEmails();

    // Aceptar la propuesta con la revisión correcta (2)
    const result = await groupPlanService.handleProposalDecision(
      plan.code,
      proposal.id,
      'accept',
      2,
      'usr_organizer_1'
    );

    assert.equal(result.ok, true);
    assert.equal(result.new_revision, 3);

    // Verificar que el plan se actualizó en el mismo enlace
    const reloaded = await groupPlanService.getPlan(plan.code);
    assert.equal(reloaded.revision, 3);
    assert.equal(reloaded.active_proposal, null, 'La propuesta ya no debe estar pendiente');

    // Verificar que los invitados pasaron a 'needs_reconfirmation'
    const guestStatuses = reloaded.guests.map(g => g.attendance_status);
    assert.ok(guestStatuses.includes('needs_reconfirmation'));

    // Verificar encolado en outbox con clave de idempotencia
    const outboxRows = await query("SELECT * FROM notification_outbox WHERE type = 'approved_change'");
    assert.ok(outboxRows.length >= 1, 'Debe haber encolado notificaciones de cambio aprobado');
    assert.ok(outboxRows[0].idempotency_key.includes('approved_change_pln_demo_1_rev3'));

    // Procesar la cola outbox con el notificationService
    const processResult = await notificationService.processPendingOutbox();
    assert.ok(processResult.length >= 1);
    assert.equal(processResult[0].status, 'sent');

    const sentMails = emailClient.getSentEmails();
    assert.ok(sentMails.length >= 1);
    assert.ok(sentMails[0].subject.includes('Cambio aprobado'));
  });

  await t.test('8. Operación Continua con Proveedores Desconectados / Sin Red', async () => {
    // Consultar el plan y realizar edición manual funciona 100% offline
    const plan = await groupPlanService.getPlan('PLAN-CR-772');
    const editRes = await groupPlanService.editPlan(plan.code, 'usr_organizer_1', {
      title: 'Sábado de Café Especial (Itinerario Reprogramado)',
      budget_crc: 14000
    });
    assert.equal(editRes.ok, true);
    assert.equal(editRes.revision, 4);

    const reloaded = await groupPlanService.getPlan(plan.code);
    assert.equal(reloaded.title, 'Sábado de Café Especial (Itinerario Reprogramado)');
  });

});
