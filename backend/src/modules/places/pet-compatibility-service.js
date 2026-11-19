const VALID_SPECIES = ['dog', 'cat', 'other'];
const VALID_PET_SIZES = ['small', 'medium', 'large', 'giant'];
const VALID_SEATING = ['indoor', 'outdoor', 'any'];
const VALID_VERIFICATION_MODES = ['confirmed', 'include_unconfirmed'];
const CONFIRMED_SOURCE_TYPES = new Set(['business_confirmation', 'admin_review']);

function validationError(code, message) {
  const err = new Error(message);
  err.code = code;
  err.status = 400;
  return err;
}

class PetCompatibilityService {
  /**
   * Valida y normaliza los parámetros de búsqueda pet-friendly.
   */
  validateSearchParams(raw = {}) {
    if (raw.lat === undefined || raw.lat === null || String(raw.lat).trim() === '') {
      throw validationError('INVALID_COORDINATES', 'lat es requerido y no puede estar vacío');
    }
    if (raw.lng === undefined || raw.lng === null || String(raw.lng).trim() === '') {
      throw validationError('INVALID_COORDINATES', 'lng es requerido y no puede estar vacío');
    }

    const lat = Number(raw.lat);
    const lng = Number(raw.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw validationError('INVALID_COORDINATES', 'lat debe estar entre -90 y 90');
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw validationError('INVALID_COORDINATES', 'lng debe estar entre -180 y 180');
    }

    const radius = raw.radius !== undefined && String(raw.radius).trim() !== '' ? Number(raw.radius) : 2200;
    if (!Number.isFinite(radius) || radius < 300 || radius > 10000) {
      throw validationError('INVALID_RADIUS', 'radius debe estar entre 300 y 10000 metros');
    }

    const limit = raw.limit !== undefined && String(raw.limit).trim() !== '' ? Number(raw.limit) : 25;
    if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
      throw validationError('INVALID_LIMIT', 'limit debe estar entre 1 y 50');
    }

    const species = raw.species ? String(raw.species).trim().toLowerCase() : 'dog';
    if (!VALID_SPECIES.includes(species)) {
      throw validationError('INVALID_SPECIES', `species debe ser uno de: ${VALID_SPECIES.join(', ')}`);
    }

    const petCount = raw.pet_count !== undefined && String(raw.pet_count).trim() !== '' ? Number(raw.pet_count) : 1;
    if (!Number.isInteger(petCount) || petCount < 1 || petCount > 10) {
      throw validationError('INVALID_PET_COUNT', 'pet_count debe ser un entero entre 1 y 10');
    }

    const petSize = raw.pet_size ? String(raw.pet_size).trim().toLowerCase() : null;
    if (petSize !== null && !VALID_PET_SIZES.includes(petSize)) {
      throw validationError('INVALID_PET_SIZE', `pet_size debe ser uno de: ${VALID_PET_SIZES.join(', ')}`);
    }

    const seating = raw.seating ? String(raw.seating).trim().toLowerCase() : 'any';
    if (!VALID_SEATING.includes(seating)) {
      throw validationError('INVALID_SEATING', `seating debe ser uno de: ${VALID_SEATING.join(', ')}`);
    }

    const verification = raw.verification ? String(raw.verification).trim().toLowerCase() : 'include_unconfirmed';
    if (!VALID_VERIFICATION_MODES.includes(verification)) {
      throw validationError('INVALID_VERIFICATION', `verification debe ser uno de: ${VALID_VERIFICATION_MODES.join(', ')}`);
    }

    return {
      lat,
      lng,
      radius: Math.round(radius),
      limit: Math.round(limit),
      species,
      pet_count: petCount,
      pet_size: petSize,
      seating,
      verification,
    };
  }

  /**
   * Extrae condiciones normalizadas desde attributes_metadata de un lugar interno.
   */
  extractInternalPolicy(place) {
    const meta = place?.attributes_metadata || {};
    const petPolicy = meta.pet_policy || {};
    const legacyPet = meta.pet_friendly;

    let accessStatus = petPolicy.access_status || null;
    if (!accessStatus && legacyPet && typeof legacyPet === 'object') {
      if (legacyPet.verified === true) accessStatus = 'allowed';
      else if (legacyPet.verified === false) accessStatus = 'not_allowed';
    }
    if (!accessStatus) accessStatus = 'unknown';

    const sourceType =
      petPolicy.source_type ||
      (place?.verified_by_admin && legacyPet?.verified ? 'admin_review' : 'unverified');

    const speciesAllowed = Array.isArray(petPolicy.species_allowed)
      ? petPolicy.species_allowed
      : legacyPet?.verified === true
      ? ['dog']
      : null;

    return {
      source_type: sourceType,
      provider_name: petPolicy.provider_name || (sourceType === 'admin_review' ? 'gotox_admin' : 'gotox_catalog'),
      access_status: accessStatus,
      conditions: {
        species_allowed: speciesAllowed,
        size_or_weight_restriction: petPolicy.size_or_weight_restriction ?? null,
        max_pets: petPolicy.max_pets ?? null,
        seating_access: petPolicy.seating_access ?? null,
        leash_required: petPolicy.leash_required ?? null,
        reservation_required: petPolicy.reservation_required ?? null,
        notes: petPolicy.notes ?? null,
      },
      evidence_ref: petPolicy.evidence_ref || legacyPet?.source || null,
      checked_at: petPolicy.checked_at || legacyPet?.verified_at || null,
      expires_at: petPolicy.expires_at || null,
      verified_by: petPolicy.verified_by || null,
      status: petPolicy.status || 'active',
    };
  }

  /**
   * Detecta contradicciones y vigencia entre múltiples fuentes de evidencia.
   */
  reconcileEvidence(evidenceList = [], now = new Date()) {
    const active = evidenceList.filter((e) => e && e.status !== 'retracted');
    if (active.length === 0) {
      return {
        access_status: 'unknown',
        verification_level: 'unverified',
        is_confirmed: false,
        is_expired: false,
        requires_review: false,
        conflicts: [],
        conditions: {
          species_allowed: null,
          size_or_weight_restriction: null,
          max_pets: null,
          seating_access: null,
          leash_required: null,
          reservation_required: null,
          notes: null,
        },
        provenance: null,
      };
    }

    const explicitAccessValues = new Set(
      active
        .map((e) => e.access_status)
        .filter((s) => s === 'allowed' || s === 'not_allowed')
    );

    const conflicts = [];
    if (explicitAccessValues.has('allowed') && explicitAccessValues.has('not_allowed')) {
      conflicts.push({
        field: 'access_status',
        reason: 'Las fuentes tienen información contradictoria sobre si admite mascotas.',
        sources: active.map((e) => ({
          provider: e.provider_name,
          source_type: e.source_type,
          access_status: e.access_status,
          checked_at: e.checked_at,
        })),
      });
    }

    // Prioridad: business_confirmation > admin_review > external_provider > user_report > unverified
    const rank = {
      business_confirmation: 5,
      admin_review: 4,
      external_provider: 3,
      user_report: 2,
      unverified: 1,
    };

    const sorted = [...active].sort((a, b) => (rank[b.source_type] || 0) - (rank[a.source_type] || 0));
    const primary = sorted[0];

    // Contradicción si dos fuentes de seating o especie activa difieren explícitamente
    const seatingValues = new Set(
      active.map((e) => e.conditions?.seating_access).filter((s) => s === 'indoor' || s === 'outdoor' || s === 'both')
    );
    if (seatingValues.has('indoor') && seatingValues.has('outdoor') && !seatingValues.has('both')) {
      conflicts.push({
        field: 'seating_access',
        reason: 'Contradicción sobre acceso a interior vs solo terraza exterior.',
      });
    }

    const isOutdatedStatus = primary.status === 'outdated';
    const isExpiredByDate = Boolean(primary.expires_at && new Date(primary.expires_at).getTime() < now.getTime());
    const isExpired = isOutdatedStatus || isExpiredByDate;

    const accessStatus = conflicts.length > 0 ? 'conflicting' : (primary.access_status || 'unknown');
    const verificationLevel = primary.source_type || 'unverified';
    const isConfirmed =
      CONFIRMED_SOURCE_TYPES.has(verificationLevel) &&
      !isExpired &&
      conflicts.length === 0 &&
      (accessStatus === 'allowed' || accessStatus === 'not_allowed');

    return {
      access_status: accessStatus,
      verification_level: verificationLevel,
      is_confirmed: isConfirmed,
      is_expired: isExpired,
      requires_review: conflicts.length > 0 || isExpired || verificationLevel === 'user_report',
      conflicts,
      conditions: {
        species_allowed: primary.conditions?.species_allowed ?? null,
        size_or_weight_restriction: primary.conditions?.size_or_weight_restriction ?? null,
        max_pets: primary.conditions?.max_pets ?? null,
        seating_access: primary.conditions?.seating_access ?? null,
        leash_required: primary.conditions?.leash_required ?? null,
        reservation_required: primary.conditions?.reservation_required ?? null,
        notes: primary.conditions?.notes ?? null,
      },
      provenance: {
        source_type: verificationLevel,
        source_name: primary.provider_name || null,
        checked_at: primary.checked_at || null,
        review_due_at: primary.expires_at || null,
        verified_by: primary.verified_by || null,
        evidence_ref: primary.evidence_ref || null,
        is_expired: isExpired,
      },
    };
  }

  /**
   * Evalúa un restaurante frente a las condiciones solicitadas por el usuario mediante reglas explícitas.
   */
  evaluateRestaurant(placeItem, evidenceList, userParams, now = new Date()) {
    const reconciled = this.reconcileEvidence(evidenceList, now);
    const { conditions, access_status, verification_level, is_confirmed, is_expired, conflicts } = reconciled;

    const unknownFields = [];
    for (const key of [
      'species_allowed',
      'size_or_weight_restriction',
      'max_pets',
      'seating_access',
      'leash_required',
      'reservation_required',
    ]) {
      if (conditions[key] === null || conditions[key] === undefined) {
        unknownFields.push(key);
      }
    }

    let compatibility = 'needs_confirmation';
    const reasons = [];

    if (access_status === 'conflicting' || conflicts.length > 0) {
      compatibility = 'needs_confirmation';
      reasons.push('Existen datos contradictorios entre fuentes; requiere revisión antes de confirmar.');
    } else if (access_status === 'not_allowed') {
      compatibility = 'incompatible';
      reasons.push('Existe evidencia explícita de que el establecimiento no admite mascotas.');
    } else if (access_status === 'unknown') {
      compatibility = 'needs_confirmation';
      reasons.push('No hay información suficiente sobre la política pet-friendly del establecimiento.');
    } else if (access_status === 'allowed') {
      // Evaluar restricciones específicas
      let blocked = false;
      let needsMoreInfo = false;

      // 1. Especie
      if (!Array.isArray(conditions.species_allowed) || conditions.species_allowed.length === 0) {
        needsMoreInfo = true;
        reasons.push('No se especifican las especies admitidas.');
      } else if (!conditions.species_allowed.includes(userParams.species)) {
        if (CONFIRMED_SOURCE_TYPES.has(verification_level) && !is_expired) {
          blocked = true;
          reasons.push(`El establecimiento solo admite: ${conditions.species_allowed.join(', ')}.`);
        } else {
          needsMoreInfo = true;
          reasons.push(`La fuente solo menciona ${conditions.species_allowed.join(', ')}; no consta política para ${userParams.species}.`);
        }
      }

      // 2. Cantidad de mascotas
      if (!blocked) {
        if (conditions.max_pets !== null && userParams.pet_count > conditions.max_pets) {
          blocked = true;
          reasons.push(`Supera el máximo permitido de ${conditions.max_pets} mascota(s).`);
        } else if (userParams.pet_count > 1 && conditions.max_pets === null) {
          needsMoreInfo = true;
          reasons.push(`Solicitas acceso para ${userParams.pet_count} mascotas, pero se desconoce la cantidad máxima permitida.`);
        }
      }

      // 3. Tamaño / peso
      if (!blocked && userParams.pet_size) {
        const restr = conditions.size_or_weight_restriction;
        if (restr === null) {
          needsMoreInfo = true;
          reasons.push(`No hay confirmación sobre restricciones para tamaño "${userParams.pet_size}".`);
        } else if (Array.isArray(restr.allowed_sizes) && !restr.allowed_sizes.includes(userParams.pet_size)) {
          blocked = true;
          reasons.push(`Restricción de tamaño: solo admite ${restr.allowed_sizes.join(', ')}.`);
        }
      }

      // 4. Ubicación (interior vs terraza)
      if (!blocked && userParams.seating !== 'any') {
        if (conditions.seating_access === null) {
          needsMoreInfo = true;
          reasons.push(`Se desconoce si admite mascotas en ${userParams.seating === 'indoor' ? 'interior' : 'terraza exterior'}.`);
        } else if (conditions.seating_access !== 'both' && conditions.seating_access !== userParams.seating) {
          blocked = true;
          reasons.push(
            conditions.seating_access === 'outdoor'
              ? 'Solo admite mascotas en terraza exterior, no en interior.'
              : 'Solo admite mascotas en área interior.'
          );
        }
      }

      // 5. Nivel de verificación y vigencia
      if (!blocked) {
        if (is_expired) {
          needsMoreInfo = true;
          reasons.push('La confirmación anterior está vencida o marcada como desactualizada.');
        } else if (!is_confirmed) {
          needsMoreInfo = true;
          reasons.push(
            verification_level === 'external_provider'
              ? 'Señal de proveedor externo sin confirmación directa del establecimiento ni revisión de GoToX.'
              : 'Pendiente de confirmación verificada.'
          );
        }
      }

      if (blocked) {
        compatibility = 'incompatible';
      } else if (needsMoreInfo) {
        compatibility = 'needs_confirmation';
      } else {
        compatibility = 'compatible';
        reasons.push('Compatible según evidencia verificada para todas las condiciones solicitadas.');
      }
    }

    return {
      id: placeItem.id,
      id_type: placeItem.id_type,
      internal_id: placeItem.internal_id || null,
      external_id: placeItem.external_id || null,
      provider: placeItem.provider,
      name: placeItem.name,
      category: placeItem.category || 'restaurant',
      address: placeItem.address || null,
      coordinates: {
        lat: placeItem.lat,
        lng: placeItem.lng,
      },
      distance_km: placeItem.distance_km ?? null,
      compatibility,
      access_status,
      verification_level,
      is_confirmed,
      is_expired,
      requires_review: reconciled.requires_review,
      explanation: reasons.join(' '),
      conditions,
      unknown_fields: unknownFields,
      provenance: reconciled.provenance,
      conflicts,
      photo: placeItem.photo || null,
      source_url: placeItem.source_url || null,
      queried_at: now.toISOString(),
    };
  }
}

module.exports = new PetCompatibilityService();
module.exports.PetCompatibilityService = PetCompatibilityService;
module.exports.VALID_SPECIES = VALID_SPECIES;
module.exports.VALID_PET_SIZES = VALID_PET_SIZES;
module.exports.VALID_SEATING = VALID_SEATING;
module.exports.VALID_VERIFICATION_MODES = VALID_VERIFICATION_MODES;
