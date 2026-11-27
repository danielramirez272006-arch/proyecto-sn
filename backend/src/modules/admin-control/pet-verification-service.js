const crypto = require('node:crypto');
const { query, execute } = require('../../shared/config/database');
const placesRepository = require('../places/places-repository');
const auditService = require('../../shared/audit/audit-service');
const petCompatibilityService = require('../places/pet-compatibility-service');

const ALLOWED_ADMIN_SOURCES = ['business_confirmation', 'admin_review'];
const ALLOWED_ACCESS_STATUSES = ['allowed', 'not_allowed', 'unknown'];

function makeErr(code, message, status = 400) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

class PetVerificationService {
  async _requirePlace(placeId) {
    const place = await placesRepository.findById(placeId);
    if (!place) {
      throw makeErr('PLACE_NOT_FOUND', 'Establecimiento no encontrado', 404);
    }
    return place;
  }

  _buildConditions(raw = {}, fallback = {}) {
    return {
      species_allowed: Array.isArray(raw.species_allowed) ? raw.species_allowed : (fallback.species_allowed ?? null),
      size_or_weight_restriction:
        raw.size_or_weight_restriction !== undefined
          ? raw.size_or_weight_restriction
          : (fallback.size_or_weight_restriction ?? null),
      max_pets:
        raw.max_pets !== undefined && raw.max_pets !== null
          ? Number(raw.max_pets)
          : (fallback.max_pets ?? null),
      seating_access: raw.seating_access !== undefined ? raw.seating_access : (fallback.seating_access ?? null),
      leash_required: raw.leash_required !== undefined ? raw.leash_required : (fallback.leash_required ?? null),
      reservation_required:
        raw.reservation_required !== undefined ? raw.reservation_required : (fallback.reservation_required ?? null),
      notes: raw.notes !== undefined ? raw.notes : (fallback.notes ?? null),
    };
  }

  async _syncPlaceMetadata(place, policyObj, verifiedByAdmin) {
    const nextMeta = {
      ...(place.attributes_metadata || {}),
      pet_policy: policyObj,
    };
    if (policyObj.access_status === 'allowed' && verifiedByAdmin) {
      nextMeta.pet_friendly = {
        verified: true,
        source: policyObj.source_type,
        verified_at: policyObj.checked_at,
      };
    } else if (policyObj.access_status === 'not_allowed' || !verifiedByAdmin) {
      nextMeta.pet_friendly = {
        verified: false,
        source: policyObj.source_type || 'admin_review',
        verified_at: policyObj.checked_at || new Date().toISOString(),
      };
    }
    return placesRepository.update(place.id, {
      verified_by_admin: Boolean(verifiedByAdmin),
      attributes_metadata: nextMeta,
    });
  }

  /**
   * Registra o corrige condiciones pet-friendly y adjunta evidencia.
   */
  async upsertPetPolicy(placeId, payload = {}, actorUserId = 'usr_admin_1', req = null) {
    const place = await this._requirePlace(placeId);
    const accessStatus = String(payload.access_status || '').trim();
    if (!ALLOWED_ACCESS_STATUSES.includes(accessStatus)) {
      throw makeErr('INVALID_ACCESS_STATUS', `access_status debe ser uno de: ${ALLOWED_ACCESS_STATUSES.join(', ')}`);
    }

    const sourceType = payload.source_type && ALLOWED_ADMIN_SOURCES.includes(payload.source_type)
      ? payload.source_type
      : 'admin_review';

    const current = petCompatibilityService.extractInternalPolicy(place);
    const conditions = this._buildConditions(payload.conditions || payload, current.conditions);
    const nowIso = new Date().toISOString();
    const expiresAt = payload.expires_at || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
    const evidenceId = `ev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    await execute(
      `UPDATE place_pet_evidence SET status = 'outdated', updated_at = CURRENT_TIMESTAMP
       WHERE place_id = ? AND source_type IN ('business_confirmation', 'admin_review') AND status = 'active'`,
      [placeId]
    );

    await execute(
      `INSERT INTO place_pet_evidence
        (id, place_id, source_type, provider_name, access_status, conditions_json, evidence_ref, verified_by, checked_at, expires_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        evidenceId,
        placeId,
        sourceType,
        sourceType === 'business_confirmation' ? 'business_owner' : 'gotox_admin',
        accessStatus,
        JSON.stringify(conditions),
        payload.evidence_ref || null,
        actorUserId,
        nowIso,
        expiresAt,
      ]
    );

    const policyObj = {
      access_status: accessStatus,
      source_type: sourceType,
      provider_name: sourceType === 'business_confirmation' ? 'business_owner' : 'gotox_admin',
      ...conditions,
      evidence_ref: payload.evidence_ref || null,
      checked_at: nowIso,
      expires_at: expiresAt,
      verified_by: actorUserId,
      status: 'active',
    };

    const isConfirmed = accessStatus !== 'unknown';
    const updatedPlace = await this._syncPlaceMetadata(place, policyObj, isConfirmed);

    await auditService.record({
      userId: actorUserId,
      action: 'PLACE_PET_POLICY_UPDATED',
      resource: 'places',
      resourceId: placeId,
      details: { access_status: accessStatus, source_type: sourceType, evidence_id: evidenceId },
      req,
    });

    return { place: updatedPlace, evidence_id: evidenceId, pet_policy: policyObj };
  }

  /**
   * Confirma una revisión administrativa vigente.
   */
  async confirmVerification(placeId, payload = {}, actorUserId = 'usr_admin_1', req = null) {
    const place = await this._requirePlace(placeId);
    const current = petCompatibilityService.extractInternalPolicy(place);
    const accessStatus = payload.access_status || (current.access_status !== 'unknown' ? current.access_status : 'allowed');

    if (payload.resolve_conflicts) {
      await execute(
        `UPDATE place_pet_evidence SET status = 'outdated', updated_at = CURRENT_TIMESTAMP
         WHERE place_id = ? AND status IN ('active', 'conflicting')`,
        [placeId]
      );
    }

    return this.upsertPetPolicy(
      placeId,
      {
        access_status: accessStatus,
        source_type: payload.source_type || 'admin_review',
        conditions: payload.conditions || current.conditions,
        evidence_ref: payload.evidence_ref || current.evidence_ref || 'admin_manual_review',
        expires_at: payload.expires_at,
      },
      actorUserId,
      req
    );
  }

  /**
   * Marca la verificación actual como desactualizada.
   */
  async markOutdated(placeId, { reason = 'Marcado como desactualizado por administrador' } = {}, actorUserId = 'usr_admin_1', req = null) {
    const place = await this._requirePlace(placeId);
    await execute(
      `UPDATE place_pet_evidence SET status = 'outdated', updated_at = CURRENT_TIMESTAMP
       WHERE place_id = ? AND status = 'active'`,
      [placeId]
    );

    const current = petCompatibilityService.extractInternalPolicy(place);
    const updatedPolicy = {
      ...current,
      ...current.conditions,
      status: 'outdated',
      outdated_reason: reason,
    };
    const updatedPlace = await this._syncPlaceMetadata(place, updatedPolicy, false);

    await auditService.record({
      userId: actorUserId,
      action: 'PLACE_PET_POLICY_MARKED_OUTDATED',
      resource: 'places',
      resourceId: placeId,
      details: { reason },
      req,
    });

    return { place: updatedPlace, status: 'outdated', reason };
  }

  /**
   * Resuelve contradicciones entre fuentes y registra el veredicto verificado.
   */
  async resolveConflict(placeId, payload = {}, actorUserId = 'usr_admin_1', req = null) {
    await this._requirePlace(placeId);
    const chosenStatus = String(payload.chosen_access_status || '').trim();
    if (!['allowed', 'not_allowed'].includes(chosenStatus)) {
      throw makeErr('INVALID_ACCESS_STATUS', "chosen_access_status debe ser 'allowed' o 'not_allowed'");
    }

    await execute(
      `UPDATE place_pet_evidence SET status = 'retracted', updated_at = CURRENT_TIMESTAMP
       WHERE place_id = ? AND status IN ('active', 'conflicting')`,
      [placeId]
    );

    return this.upsertPetPolicy(
      placeId,
      {
        access_status: chosenStatus,
        source_type: payload.source_type || 'admin_review',
        conditions: payload.conditions || {},
        evidence_ref: payload.evidence_ref || 'conflict_resolution_review',
        expires_at: payload.expires_at,
      },
      actorUserId,
      req
    );
  }

  /**
   * Retira una confirmación previa.
   */
  async withdrawConfirmation(placeId, { reason = 'Confirmación retirada por administrador' } = {}, actorUserId = 'usr_admin_1', req = null) {
    const place = await this._requirePlace(placeId);
    await execute(
      `UPDATE place_pet_evidence SET status = 'retracted', updated_at = CURRENT_TIMESTAMP
       WHERE place_id = ? AND status IN ('active', 'conflicting')`,
      [placeId]
    );

    const retractedPolicy = {
      access_status: 'unknown',
      source_type: 'unverified',
      species_allowed: null,
      size_or_weight_restriction: null,
      max_pets: null,
      seating_access: null,
      leash_required: null,
      reservation_required: null,
      notes: reason,
      checked_at: new Date().toISOString(),
      expires_at: null,
      verified_by: actorUserId,
      status: 'retracted',
    };
    const updatedPlace = await this._syncPlaceMetadata(place, retractedPolicy, false);

    await auditService.record({
      userId: actorUserId,
      action: 'PLACE_PET_CONFIRMATION_WITHDRAWN',
      resource: 'places',
      resourceId: placeId,
      details: { reason },
      req,
    });

    return { place: updatedPlace, status: 'retracted', reason };
  }

  async _insertAutomationEvent({ eventType, placeId, payload, idempotencyKey }) {
    const existing = await query('SELECT * FROM automation_events WHERE idempotency_key = ?', [idempotencyKey]);
    if (existing && existing.length > 0) {
      return { inserted: false, event: existing[0] };
    }
    const id = `aut_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    await execute(
      `INSERT INTO automation_events (id, event_type, place_id, payload_json, idempotency_key, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [id, eventType, placeId, JSON.stringify(payload), idempotencyKey]
    );
    const rows = await query('SELECT * FROM automation_events WHERE id = ?', [id]);
    return { inserted: true, event: rows[0] };
  }

  /**
   * Genera eventos idempotentes para n8n / bandeja admin (pendientes de revisión, próximas a vencer y contradicciones)
   * usando consultas agrupadas para evitar N+1 sobre PostgreSQL remoto.
   */
  async scanAndEmitAutomationEvents({ expiringWithinDays = 14, maxNewEvents = 40, now = new Date() } = {}) {
    const places = await placesRepository.findAll({ limit: 200 });
    const windowMs = Math.max(1, Number(expiringWithinDays) || 14) * 24 * 60 * 60 * 1000;
    const dateBucket = now.toISOString().slice(0, 10);
    const emitted = [];

    if (!places || places.length === 0) {
      return { emitted_count: 0, emitted_events: [], pending_events: [] };
    }

    const placeIds = places.map((p) => p.id).filter(Boolean);
    const placeholders = placeIds.map(() => '?').join(', ');
    const allEvRows = await query(
      `SELECT * FROM place_pet_evidence WHERE place_id IN (${placeholders}) AND status != 'retracted'`,
      placeIds
    ).catch(() => []);

    const evidencesByPlace = new Map();
    for (const r of allEvRows || []) {
      let cond = {};
      try {
        cond = typeof r.conditions_json === 'string' ? JSON.parse(r.conditions_json) : (r.conditions_json || {});
      } catch {}
      const list = evidencesByPlace.get(r.place_id) || [];
      list.push({ ...r, conditions: cond });
      evidencesByPlace.set(r.place_id, list);
    }

    const candidateEvents = [];
    for (const place of places) {
      const evidences = evidencesByPlace.get(place.id) || [];
      const fallback = petCompatibilityService.extractInternalPolicy(place);
      const reconciled = petCompatibilityService.reconcileEvidence(evidences.length ? evidences : [fallback], now);

      if (reconciled.conflicts.length > 0) {
        candidateEvents.push({
          priority: 1,
          eventType: 'contradiction_detected',
          placeId: place.id,
          idempotencyKey: `contradiction:${place.id}:${dateBucket}`,
          payload: { place_id: place.id, place_name: place.name, conflicts: reconciled.conflicts },
        });
      }

      if (reconciled.provenance?.review_due_at) {
        const dueMs = new Date(reconciled.provenance.review_due_at).getTime();
        if (Number.isFinite(dueMs) && dueMs - now.getTime() <= windowMs) {
          candidateEvents.push({
            priority: 2,
            eventType: 'confirmation_expiring',
            placeId: place.id,
            idempotencyKey: `expiring:${place.id}:${reconciled.provenance.review_due_at.slice(0, 10)}`,
            payload: {
              place_id: place.id,
              place_name: place.name,
              review_due_at: reconciled.provenance.review_due_at,
              is_expired: reconciled.is_expired,
            },
          });
        }
      }

      if (!reconciled.is_confirmed && reconciled.conflicts.length === 0) {
        candidateEvents.push({
          priority: 3,
          eventType: 'review_pending',
          placeId: place.id,
          idempotencyKey: `review_pending:${place.id}:${dateBucket}`,
          payload: {
            place_id: place.id,
            place_name: place.name,
            verification_level: reconciled.verification_level,
            access_status: reconciled.access_status,
          },
        });
      }
    }

    if (candidateEvents.length > 0) {
      candidateEvents.sort((a, b) => a.priority - b.priority);
      const allKeys = candidateEvents.map((c) => c.idempotencyKey);
      const keyPlaceholders = allKeys.map(() => '?').join(', ');
      const existingRows = await query(
        `SELECT idempotency_key FROM automation_events WHERE idempotency_key IN (${keyPlaceholders})`,
        allKeys
      ).catch(() => []);
      const existingKeys = new Set((existingRows || []).map((r) => r.idempotency_key));

      const missing = candidateEvents.filter((c) => !existingKeys.has(c.idempotencyKey)).slice(0, maxNewEvents);
      for (const item of missing) {
        const res = await this._insertAutomationEvent(item);
        if (res.inserted) emitted.push(res.event);
      }
    }

    const allPending = await query(
      `SELECT * FROM automation_events WHERE status = 'pending' ORDER BY created_at DESC LIMIT 100`
    );

    return {
      emitted_count: emitted.length,
      emitted_events: emitted,
      pending_events: allPending,
    };
  }

  /**
   * Registra una respuesta de confirmación recibida mediante flujo autorizado de n8n (idempotente).
   */
  async recordConfirmationFromWorkflow(payload = {}, actorUserId = 'n8n_workflow', req = null) {
    const idempotencyKey = String(payload.idempotency_key || '').trim();
    if (!idempotencyKey) {
      throw makeErr('IDEMPOTENCY_KEY_REQUIRED', 'idempotency_key es obligatorio para procesar confirmaciones');
    }

    const existing = await query('SELECT * FROM automation_events WHERE idempotency_key = ?', [idempotencyKey]);
    if (existing && existing.length > 0) {
      return {
        idempotent_replay: true,
        event: existing[0],
      };
    }

    const placeId = String(payload.place_id || '').trim();
    const accessStatus = String(payload.access_status || '').trim();
    if (!placeId || !['allowed', 'not_allowed'].includes(accessStatus)) {
      throw makeErr('INVALID_CONFIRMATION_PAYLOAD', "place_id y access_status ('allowed' | 'not_allowed') son obligatorios");
    }

    const result = await this.upsertPetPolicy(
      placeId,
      {
        access_status: accessStatus,
        source_type: 'business_confirmation',
        conditions: payload.conditions || {},
        evidence_ref: payload.evidence_ref || `n8n:${idempotencyKey}`,
        expires_at: payload.expires_at,
      },
      payload.responder_name || actorUserId,
      req
    );

    const eventId = `aut_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    await execute(
      `INSERT INTO automation_events (id, event_type, place_id, payload_json, idempotency_key, status, processed_at)
       VALUES (?, 'confirmation_recorded', ?, ?, ?, 'processed', CURRENT_TIMESTAMP)`,
      [
        eventId,
        placeId,
        JSON.stringify({ evidence_id: result.evidence_id, access_status: accessStatus }),
        idempotencyKey,
      ]
    );

    const rows = await query('SELECT * FROM automation_events WHERE id = ?', [eventId]);
    return {
      idempotent_replay: false,
      event: rows[0],
      verification: result,
    };
  }

  /**
   * Devuelve la bandeja unificada de revisión administrativa (sugerencias externas,
   * contradicciones y confirmaciones por vencer) enriquecida con datos del local y evidencias.
   */
  async getReviewQueue({ limit = 50, eventType = null } = {}) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const clauses = ["e.status = 'pending'"];
    const params = [];

    if (eventType) {
      clauses.push('e.event_type = ?');
      params.push(String(eventType).trim());
    } else {
      clauses.push("e.event_type IN ('review_pending', 'contradiction_detected', 'confirmation_expiring')");
    }

    const rows = await query(
      `SELECT e.*, p.name AS place_name, p.address AS place_address, p.canton AS place_canton, p.verified_by_admin
       FROM automation_events e
       LEFT JOIN places p ON e.place_id = p.id
       WHERE ${clauses.join(' AND ')}
       ORDER BY e.created_at DESC
       LIMIT ?`,
      [...params, safeLimit]
    );

    const placeIds = [...new Set((rows || []).map((r) => r.place_id).filter(Boolean))];
    const evidenceByPlace = new Map();
    if (placeIds.length > 0) {
      const placeholders = placeIds.map(() => '?').join(', ');
      const evRows = await query(
        `SELECT * FROM place_pet_evidence WHERE place_id IN (${placeholders}) AND status != 'retracted' ORDER BY checked_at DESC`,
        placeIds
      ).catch(() => []);
      for (const ev of evRows || []) {
        let conditions = {};
        try {
          conditions = typeof ev.conditions_json === 'string' ? JSON.parse(ev.conditions_json) : (ev.conditions_json || {});
        } catch {}
        const list = evidenceByPlace.get(ev.place_id) || [];
        list.push({ ...ev, conditions });
        evidenceByPlace.set(ev.place_id, list);
      }
    }

    const items = (rows || []).map((row) => {
      let payload = {};
      try {
        payload = typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : (row.payload_json || {});
      } catch {}
      return {
        id: row.id,
        event_type: row.event_type,
        status: row.status,
        place_id: row.place_id,
        place_name: row.place_name || payload.place_name || null,
        place_address: row.place_address || null,
        place_canton: row.place_canton || null,
        verified_by_admin: Boolean(row.verified_by_admin),
        payload,
        evidences: evidenceByPlace.get(row.place_id) || [],
        created_at: row.created_at,
      };
    });

    return {
      total: items.length,
      counts: {
        contradiction_detected: items.filter((i) => i.event_type === 'contradiction_detected').length,
        review_pending: items.filter((i) => i.event_type === 'review_pending').length,
        confirmation_expiring: items.filter((i) => i.event_type === 'confirmation_expiring').length,
      },
      items,
    };
  }

  /**
   * Marca un evento de la bandeja administrativa como revisado/atendido.
   */
  async acknowledgeAutomationEvent(eventId, actorUserId = 'usr_admin_1', req = null) {
    const cleanId = String(eventId || '').trim();
    const existing = await query('SELECT * FROM automation_events WHERE id = ?', [cleanId]);
    if (!existing || existing.length === 0) {
      throw makeErr('EVENT_NOT_FOUND', 'Evento de revisión no encontrado', 404);
    }
    await execute(
      `UPDATE automation_events SET status = 'acknowledged', processed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [cleanId]
    );
    await auditService.record({
      userId: actorUserId,
      action: 'PET_AUTOMATION_EVENT_ACKNOWLEDGED',
      resource: 'automation_events',
      resourceId: cleanId,
      details: { event_type: existing[0].event_type, place_id: existing[0].place_id },
      req,
    }).catch(() => {});
    return { id: cleanId, status: 'acknowledged' };
  }
}

module.exports = new PetVerificationService();
module.exports.PetVerificationService = PetVerificationService;
