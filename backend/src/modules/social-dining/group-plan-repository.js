const { query, execute, transaction } = require('../../shared/config/database');

class GroupPlanRepository {
  async findByCode(code) {
    const plans = await query('SELECT * FROM plans WHERE code = ?', [code]);
    if (!plans || plans.length === 0) return null;

    const plan = plans[0];

    // Opciones
    const options = await query(
      'SELECT * FROM plan_options WHERE plan_id = ? ORDER BY option_order ASC',
      [plan.id]
    );

    // Paradas por opción
    for (const opt of options) {
      const stops = await query(`
        SELECT s.*, p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lng AS place_lng,
               e.title AS event_title, e.status AS event_status
        FROM plan_stops s
        LEFT JOIN places p ON s.place_id = p.id
        LEFT JOIN events e ON s.event_id = e.id
        WHERE s.option_id = ?
        ORDER BY s.stop_order ASC
      `, [opt.id]);

      opt.stops = stops.map(s => {
        let snapshot = null;
        try {
          snapshot = typeof s.confirmed_snapshot === 'string' ? JSON.parse(s.confirmed_snapshot) : s.confirmed_snapshot;
        } catch {}
        return { ...s, confirmed_snapshot: snapshot };
      });

      // Votos agregados para esta opción
      const votes = await query(
        'SELECT vote_type, COUNT(*) as count FROM plan_votes WHERE option_id = ? GROUP BY vote_type',
        [opt.id]
      );
      opt.tally = {
        prefer: 0,
        can: 0,
        cannot: 0,
      };
      for (const v of votes) {
        if (opt.tally[v.vote_type] !== undefined) {
          opt.tally[v.vote_type] = Number(v.count);
        }
      }
    }

    // Invitados
    const guests = await query(
      'SELECT id, name, attendance_status, created_at FROM plan_guests WHERE plan_id = ? ORDER BY created_at ASC',
      [plan.id]
    );

    // Propuesta activa si existe
    const proposals = await query(
      "SELECT * FROM plan_proposals WHERE plan_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
      [plan.id]
    );
    let activeProposal = null;
    if (proposals.length > 0) {
      try {
        activeProposal = {
          ...proposals[0],
          alternative_data: typeof proposals[0].alternative_data === 'string' 
            ? JSON.parse(proposals[0].alternative_data) 
            : proposals[0].alternative_data
        };
      } catch {
        activeProposal = proposals[0];
      }
    }

    return {
      ...plan,
      options,
      guests,
      active_proposal: activeProposal,
    };
  }

  async createPlan({ title, organizerId, budgetCrc = 0, options = [] }) {
    const planId = `pln_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const code = `PLAN-CR-${Math.floor(100 + Math.random() * 900)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    return await transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO plans (id, code, title, organizer_id, status, revision, budget_crc)
         VALUES (?, ?, ?, ?, 'active', 1, ?)`,
        [planId, code, title, organizerId, budgetCrc]
      );

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const optId = `opt_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`;
        await tx.execute(
          `INSERT INTO plan_options (id, plan_id, title, option_order, estimated_cost_crc)
           VALUES (?, ?, ?, ?, ?)`,
          [optId, planId, opt.title, i + 1, opt.estimated_cost_crc || 0]
        );

        if (Array.isArray(opt.stops)) {
          for (let j = 0; j < opt.stops.length; j++) {
            const stp = opt.stops[j];
            const stpId = `stp_${Date.now()}_${j}_${Math.random().toString(36).slice(2, 5)}`;
            await tx.execute(
              `INSERT INTO plan_stops (id, option_id, place_id, event_id, stop_order, start_time, end_time)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [stpId, optId, stp.place_id, stp.event_id || null, j + 1, stp.start_time, stp.end_time]
            );
          }
        }
      }

      // Registro en historial
      await tx.execute(
        `INSERT INTO plan_history (id, plan_id, revision, change_type, snapshot, actor_id)
         VALUES (?, ?, 1, 'created', ?, ?)`,
        [`his_${Date.now()}`, planId, JSON.stringify({ code, title, optionsCount: options.length }), organizerId]
      );

      return { id: planId, code };
    });
  }

  async addGuest(planId, name, email = null, phone = null) {
    const guestId = `gst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const token = `tok_guest_${Math.random().toString(36).slice(2, 12)}_${Date.now()}`;

    await execute(
      `INSERT INTO plan_guests (id, plan_id, guest_token, name, email, phone, attendance_status)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`,
      [guestId, planId, token, name, email, phone]
    );

    return { id: guestId, guest_token: token, name, attendance_status: 'confirmed' };
  }

  async findGuestByToken(planId, token) {
    const rows = await query(
      'SELECT * FROM plan_guests WHERE plan_id = ? AND guest_token = ?',
      [planId, token]
    );
    return rows[0] || null;
  }

  async voteOption(planId, guestId, optionId, voteType) {
    // Validar pertenencia de la opción al plan
    const opts = await query('SELECT id FROM plan_options WHERE id = ? AND plan_id = ?', [optionId, planId]);
    if (!opts || opts.length === 0) {
      throw new Error('OPTION_NOT_IN_PLAN');
    }

    const voteId = `vot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Manejo de Dialecto para Upsert idempotente
    const { getDialect } = require('../../shared/config/database');
    const dialect = getDialect();

    if (dialect === 'mysql') {
      await execute(`
        INSERT INTO plan_votes (id, plan_id, guest_id, option_id, vote_type)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type), updated_at = CURRENT_TIMESTAMP
      `, [voteId, planId, guestId, optionId, voteType]);
    } else {
      await execute(`
        INSERT INTO plan_votes (id, plan_id, guest_id, option_id, vote_type)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(plan_id, guest_id, option_id) DO UPDATE SET vote_type = excluded.vote_type, updated_at = CURRENT_TIMESTAMP
      `, [voteId, planId, guestId, optionId, voteType]);
    }

    return { ok: true, planId, guestId, optionId, voteType };
  }

  async confirmPlan(planId, organizerId, selectedOptionId) {
    return await transaction(async (tx) => {
      // 1. Verificar plan y organizador
      const plans = await tx.query('SELECT * FROM plans WHERE id = ?', [planId]);
      if (!plans || plans.length === 0) throw new Error('PLAN_NOT_FOUND');
      const plan = plans[0];

      if (plan.organizer_id !== organizerId) {
        throw new Error('UNAUTHORIZED_ORGANIZER');
      }

      // 2. Verificar que la opción pertenezca al plan
      const opts = await tx.query('SELECT * FROM plan_options WHERE id = ? AND plan_id = ?', [selectedOptionId, planId]);
      if (!opts || opts.length === 0) throw new Error('OPTION_NOT_IN_PLAN');

      // 3. Capturar snapshot de paradas
      const stops = await tx.query(`
        SELECT s.*, p.name AS place_name, p.address AS place_address, e.title AS event_title
        FROM plan_stops s
        LEFT JOIN places p ON s.place_id = p.id
        LEFT JOIN events e ON s.event_id = e.id
        WHERE s.option_id = ?
        ORDER BY s.stop_order ASC
      `, [selectedOptionId]);

      for (const stp of stops) {
        const snap = JSON.stringify({
          place_name: stp.place_name,
          place_address: stp.place_address,
          event_title: stp.event_title,
          start_time: stp.start_time,
          end_time: stp.end_time,
          confirmed_at: new Date().toISOString()
        });
        await tx.execute('UPDATE plan_stops SET confirmed_snapshot = ? WHERE id = ?', [snap, stp.id]);
      }

      const nextRev = plan.revision + 1;
      await tx.execute(
        `UPDATE plans SET status = 'confirmed', selected_option_id = ?, revision = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [selectedOptionId, nextRev, planId]
      );

      // Historial
      await tx.execute(
        `INSERT INTO plan_history (id, plan_id, revision, change_type, snapshot, actor_id)
         VALUES (?, ?, ?, 'confirmed', ?, ?)`,
        [`his_${Date.now()}`, planId, nextRev, JSON.stringify({ selected_option_id: selectedOptionId, stopsCount: stops.length }), organizerId]
      );

      return { ok: true, planId, selected_option_id: selectedOptionId, revision: nextRev };
    });
  }

  async applyProposal(planId, proposalId, expectedRevision, actorId) {
    return await transaction(async (tx) => {
      // 1. Obtener plan y validar revisión
      const plans = await tx.query('SELECT * FROM plans WHERE id = ?', [planId]);
      if (!plans || plans.length === 0) throw new Error('PLAN_NOT_FOUND');
      const plan = plans[0];

      if (plan.revision !== expectedRevision) {
        const err = new Error('STALE_REVISION_CONFLICT');
        err.currentRevision = plan.revision;
        throw err;
      }

      // 2. Obtener propuesta
      const proposals = await tx.query('SELECT * FROM plan_proposals WHERE id = ? AND plan_id = ?', [proposalId, planId]);
      if (!proposals || proposals.length === 0) throw new Error('PROPOSAL_NOT_FOUND');
      const proposal = proposals[0];

      if (proposal.status !== 'pending') {
        throw new Error('PROPOSAL_ALREADY_PROCESSED');
      }

      const altData = typeof proposal.alternative_data === 'string'
        ? JSON.parse(proposal.alternative_data)
        : proposal.alternative_data;

      // 3. Crear nueva opción y paradas basadas en la alternativa de la IA
      const newOptionId = `opt_${Date.now()}_alt`;
      await tx.execute(
        `INSERT INTO plan_options (id, plan_id, title, option_order, status, estimated_cost_crc)
         VALUES (?, ?, ?, 99, 'active', ?)`,
        [newOptionId, planId, altData.title || 'Opción Alternativa Aprobada', altData.estimated_cost_crc || 0]
      );

      if (Array.isArray(altData.stops)) {
        for (let i = 0; i < altData.stops.length; i++) {
          const stp = altData.stops[i];
          const stpId = `stp_${Date.now()}_alt_${i}`;
          await tx.execute(
            `INSERT INTO plan_stops (id, option_id, place_id, event_id, stop_order, start_time, end_time)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [stpId, newOptionId, stp.place_id, stp.event_id || null, i + 1, stp.start_time, stp.end_time]
          );
        }
      }

      // 4. Actualizar plan
      const nextRev = plan.revision + 1;
      await tx.execute(
        `UPDATE plans SET selected_option_id = ?, revision = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newOptionId, nextRev, planId]
      );

      // 5. Marcar propuesta como aceptada
      await tx.execute(
        `UPDATE plan_proposals SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [proposalId]
      );

      // 6. Invalidar confirmaciones de invitados (requieren reconfirmación por cambio de parada/hora)
      await tx.execute(
        `UPDATE plan_guests SET attendance_status = 'needs_reconfirmation', updated_at = CURRENT_TIMESTAMP WHERE plan_id = ?`,
        [planId]
      );

      // 7. Encolar avisos en Outbox para todos los invitados
      const guests = await tx.query('SELECT * FROM plan_guests WHERE plan_id = ?', [planId]);
      for (const g of guests) {
        if (g.email) {
          const outboxId = `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const idempotencyKey = `approved_change_${planId}_rev${nextRev}_guest${g.id}`;
          await tx.execute(
            `INSERT INTO notification_outbox (id, recipient, type, payload, idempotency_key)
             VALUES (?, ?, 'approved_change', ?, ?)`,
            [
              outboxId,
              g.email,
              JSON.stringify({
                guest_name: g.name,
                plan_title: plan.title,
                plan_code: plan.code,
                reason: proposal.reason,
                new_revision: nextRev
              }),
              idempotencyKey
            ]
          );
        }
      }

      // 8. Registro en historial
      await tx.execute(
        `INSERT INTO plan_history (id, plan_id, revision, change_type, snapshot, actor_id)
         VALUES (?, ?, ?, 'proposal_applied', ?, ?)`,
        [`his_${Date.now()}`, planId, nextRev, JSON.stringify({ proposal_id: proposalId, newOptionId }), actorId]
      );

      return { ok: true, planId, new_revision: nextRev, new_option_id: newOptionId };
    });
  }

  async updatePlanManual(planId, organizerId, { title, budgetCrc, selectedOptionId }) {
    return await transaction(async (tx) => {
      const plans = await tx.query('SELECT * FROM plans WHERE id = ?', [planId]);
      if (!plans || plans.length === 0) throw new Error('PLAN_NOT_FOUND');
      const plan = plans[0];

      if (plan.organizer_id !== organizerId) {
        throw new Error('UNAUTHORIZED_ORGANIZER');
      }

      const nextRev = plan.revision + 1;
      await tx.execute(
        `UPDATE plans SET title = COALESCE(?, title), budget_crc = COALESCE(?, budget_crc), 
         selected_option_id = COALESCE(?, selected_option_id), revision = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [title, budgetCrc, selectedOptionId, nextRev, planId]
      );

      await tx.execute(
        `INSERT INTO plan_history (id, plan_id, revision, change_type, snapshot, actor_id)
         VALUES (?, ?, ?, 'manual_edit', ?, ?)`,
        [`his_${Date.now()}`, planId, nextRev, JSON.stringify({ title, budgetCrc, selectedOptionId }), organizerId]
      );

      return { ok: true, planId, revision: nextRev };
    });
  }
}

module.exports = new GroupPlanRepository();
