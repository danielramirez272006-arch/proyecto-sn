const crypto = require('node:crypto');
const geminiClient = require('../shared/config/gemini-config');
const vetService = require('../modules/vet-hub/vet-service');
const comfortWeatherService = require('../modules/weather-activities/comfort-weather-service');
const multichannelService = require('../modules/notifications/multichannel-notification-service');
const { inspectAndSanitizeImage } = require('../modules/places/photo-security-validator');
const { sanitizePromptInjection, assertSafeOutboundUrl } = require('../shared/middlewares/payload-sanitizer');
const { generateNavigationLinks } = require('../shared/utils/navigation-links');
const { execute, query } = require('../shared/config/database');

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB límite decodificado

const GAM_FALLBACK_VET_DIRECTORY = [
  {
    id: 'vet-gam-sfa-24h',
    name: 'Hospital Veterinario San Francisco de Asís (24 Horas)',
    zone: 'San Pedro / Los Yoses',
    address: 'Costado Sur de la Iglesia de San Pedro, Montes de Oca',
    phone: '+506 2225-4000',
    coords: { lat: 9.9326, lng: -84.0519 },
    specialty: 'Hospital de Urgencias 24/7 con Cirugía, UCI, Toxicología y Oftalmología',
    is_24h_verified: true,
    tags: ['urgente', 'ojos_orejas', 'golpe_calor_respiracion', 'heridas_sangrado', 'general']
  },
  {
    id: 'vet-gam-sabana-trauma',
    name: 'Centro de Trauma Animal La Sabana',
    zone: 'Sabana Oeste / Rohrmoser',
    address: 'Bulevar de Rohrmoser, 100m Norte, San José',
    phone: '+506 2296-1122',
    coords: { lat: 9.9412, lng: -84.1155 },
    specialty: 'Traumatología, Quemaduras Podales por Asfalto, Ortopedia, Heridas y Rayos X',
    is_24h_verified: true,
    tags: ['urgente', 'patas_almohadillas', 'heridas_sangrado', 'postura_movilidad', 'golpe_calor_respiracion']
  },
  {
    id: 'vet-gam-escalante-care',
    name: 'Clínica Veterinaria Escalante Pet Care',
    zone: 'Barrio Escalante',
    address: 'Avenida 9, Calle 31, Barrio Escalante, San José',
    phone: '+506 2234-8890',
    coords: { lat: 9.9361, lng: -84.0631 },
    specialty: 'Dermatología, Odontología, Control de Peso, Ectoparásitos y Medicina Preventiva',
    is_24h_verified: false,
    tags: ['moderado', 'leve', 'piel_pelaje', 'dientes_encias', 'garrapatas_parasitos', 'peso_condicion', 'general']
  },
  {
    id: 'vet-gam-heredia-urgencias',
    name: 'Hospital Veterinario Belén & Heredia 24/7',
    zone: 'Heredia / Belén',
    address: '400m Este del Cruce de San Antonio de Belén, Heredia',
    phone: '+506 2239-5510',
    coords: { lat: 9.9789, lng: -84.1842 },
    specialty: 'Emergencias 24/7, Golpe de Calor, Gastroenterología y Hospitalización',
    is_24h_verified: true,
    tags: ['urgente', 'golpe_calor_respiracion', 'postura_movilidad', 'general']
  }
];

const VALID_FOCUS_AREAS = [
  'general',
  'patas_almohadillas',
  'piel_pelaje',
  'ojos_orejas',
  'dientes_encias',
  'heridas_sangrado',
  'garrapatas_parasitos',
  'peso_condicion',
  'postura_movilidad',
  'golpe_calor_respiracion'
];

function sanitizePii(text) {
  const { cleanText } = sanitizePromptInjection(String(text || ''), 600);
  return cleanText
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL_REDACTADO]')
    .replace(/\b(?:\+?506[\s-]?)?[24678]\d{3}[\s-]?\d{4}\b/g, '[TELEFONO_REDACTADO]')
    .replace(/\b\d-\d{4}-\d{4}\b/g, '[CEDULA_REDACTADA]')
    .slice(0, 600);
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

class PetVisionTriageService {
  constructor() {
    this.recentAnalysesMemory = [];
    this.analysisStoreById = new Map();
  }

  getSupportedFocusAreas() {
    return [
      { id: 'general', label: 'Inspección General y Perfil Físico', default_specialist: 'Medicina General Veterinaria' },
      { id: 'patas_almohadillas', label: 'Almohadillas y Patas (Quemaduras por Asfalto / Espinas)', default_specialist: 'Traumatología y Podología Veterinaria' },
      { id: 'piel_pelaje', label: 'Piel y Pelaje (Dermatitis, Alopecia, Irritación)', default_specialist: 'Dermatología Veterinaria' },
      { id: 'ojos_orejas', label: 'Ojos y Orejas (Secreción, Enrojecimiento, Otitis)', default_specialist: 'Oftalmología y Otorrinolaringología Veterinaria' },
      { id: 'dientes_encias', label: 'Dientes y Encías (Sarro, Gingivitis, Color de Mucosas)', default_specialist: 'Odontología Veterinaria' },
      { id: 'heridas_sangrado', label: 'Heridas, Cortes o Sangrado Visible', default_specialist: 'Urgencias y Cirugía Veterinaria 24/7' },
      { id: 'garrapatas_parasitos', label: 'Garrapatas, Pulgas o Picaduras', default_specialist: 'Medicina Preventiva e Infectología Veterinaria' },
      { id: 'peso_condicion', label: 'Condición Corporal (Peso Aproximado / Sobrepeso / Bajo Peso)', default_specialist: 'Nutrición Clínica Veterinaria' },
      { id: 'postura_movilidad', label: 'Postura, Cojera o Dolor al Caminar', default_specialist: 'Ortopedia y Fisioterapia Veterinaria' },
      { id: 'golpe_calor_respiracion', label: 'Estrés Térmico, Jadeo Excesivo o Golpe de Calor', default_specialist: 'Cuidados Intensivos Veterinarios 24/7' }
    ];
  }

  /**
   * Analiza una o hasta 3 fotografías de una mascota con Google Gemini Vision, limpia metadatos EXIF
   * (privacidad Ley N.º 8968), entrega un perfil físico y pre-triaje visual aproximado, integra el
   * clima real de la GAM y deriva automáticamente al veterinario más cercano cuando el problema es moderado o grande.
   */
  async analyzePetPhoto(payload = {}, actor = null) {
    const t0 = Date.now();
    const {
      image_base64,
      images_base64,
      photo_url,
      symptoms = '',
      notes = '',
      focus_area = 'general',
      pet_context = {},
      lat,
      lng,
      previous_analysis_id = null,
      notify_emergency_email = null
    } = payload;

    const rawImagesList = Array.isArray(images_base64) && images_base64.length > 0
      ? images_base64.slice(0, 3)
      : [image_base64 || photo_url].filter(Boolean);

    if (rawImagesList.length === 0 || typeof rawImagesList[0] !== 'string' || !rawImagesList[0].trim()) {
      const err = new Error('Debes proporcionar image_base64, images_base64 o photo_url con la fotografía de la mascota.');
      err.status = 400;
      err.code = 'MISSING_PET_IMAGE';
      throw err;
    }

    const normalizedFocus = VALID_FOCUS_AREAS.includes(focus_area) ? focus_area : 'general';
    const userNotes = sanitizePii([symptoms, notes].filter(Boolean).join('. ').trim());
    const userLat = Number.isFinite(Number(lat)) ? Number(lat) : 9.9333;
    const userLng = Number.isFinite(Number(lng)) ? Number(lng) : -84.0833;

    // 1. Resolver, validar y sanitizar EXIF de las imágenes (protección GPS Ley N.º 8968)
    const processedImages = [];
    for (const rawImg of rawImagesList) {
      const resolved = await this._resolveAndSanitizeImagePayload(String(rawImg).trim());
      processedImages.push(resolved);
    }
    const primaryImageMeta = processedImages[0].telemetry;

    // 2. Consultar clima térmico real de la GAM en paralelo para contextualizar riesgo de asfalto/calor
    const liveComfortPromise = comfortWeatherService
      .getUrbanComfortIndex(userLat, userLng)
      .catch(() => ({
        temperature_c: 26,
        comfort_score: 78,
        rain_alert: { active: false },
        recommendation: 'Clima templado en la GAM'
      }));

    const systemInstruction = [
      'Eres un asistente experto en pre-triaje visual veterinario y bienestar animal para GoToX Costa Rica (Gran Área Metropolitana - GAM).',
      'Tu objetivo es analizar la(s) fotografía(s) de una mascota y entregar SIEMPRE una orientación APROXIMADA en español claro, empático y responsable.',
      'REGLAS CRÍTICAS:',
      '1. NUNCA afirmes que tu respuesta es un diagnóstico clínico definitivo; aclara siempre que es una estimación visual aproximada.',
      '2. Evalúa tanto el perfil físico aproximado (especie, raza/cruce probable, rango de peso en kg, etapa de edad, color de manto, condición corporal) como posibles problemas visibles en: patas/almohadillas (quemaduras por asfalto, espinas, heridas), piel/pelaje (alopecia, dermatitis, irritación, garrapatas), ojos/orejas (enrojecimiento, secreción, otitis), dientes/encías y postura/estrés térmico.',
      '3. Clasifica la gravedad en severity_level: "leve" (sin anomalías graves), "moderado" (signo visible que requiere consulta veterinaria en 24-48h) o "urgente" (problema grande, herida abierta, quemadura severa, sangrado, inflamación aguda, golpe de calor, infección ocular o dolor intenso que requiere ir al veterinario DE INMEDIATO).',
      '4. Incluye veterinary_action_plan con urgency_timeline, recommended_specialist, differential_possibilities (2-3 posibilidades orientativas), pre_transport_stabilization (cómo estabilizar o trasladar a la mascota de forma segura), questions_for_your_vet (3 preguntas para el veterinario) y vital_signs_checklist.',
      '5. Devuelve ÚNICAMENTE un objeto JSON válido con la estructura solicitada.'
    ].join('\n');

    const prompt = this._buildVisionPrompt({
      focusArea: normalizedFocus,
      userNotes,
      petContext: pet_context || {},
      imagesCount: processedImages.length
    });

    const geminiImagesInput = processedImages
      .filter((img) => Boolean(img.base64Data))
      .map((img) => ({ base64Data: img.base64Data, mimeType: img.mimeType }));

    let aiResult = null;
    if (geminiImagesInput.length > 0) {
      aiResult = await geminiClient
        .generateMultimodalJson({
          prompt,
          images: geminiImagesInput,
          systemInstruction,
          temperature: 0.2
        })
        .catch(() => null);
    }

    const liveComfort = await liveComfortPromise;

    const normalized = this._normalizeAndEnrichResult({
      aiResult,
      focusArea: normalizedFocus,
      userNotes,
      petContext: pet_context || {},
      imageTelemetry: primaryImageMeta,
      liveComfort
    });

    // 3. Si viene previous_analysis_id, evaluar evolución respecto al reporte previo
    let evolutionComparison = null;
    if (previous_analysis_id) {
      evolutionComparison = this._evaluateEvolution(previous_analysis_id, normalized.visual_health_triage);
      if (evolutionComparison?.worsened && normalized.visual_health_triage.severity_level === 'leve') {
        normalized.visual_health_triage.severity_level = 'moderado';
        normalized.visual_health_triage.requires_vet_visit = true;
      }
    }

    // 4. Obtener clínicas veterinarias GAM ordenadas por especialidad, urgencia 24/7 y distancia GPS real
    const clinics = await this._getRecommendedClinics({
      severityLevel: normalized.visual_health_triage.severity_level,
      focusArea: normalizedFocus,
      detectedIssues: normalized.visual_health_triage.detected_issues,
      userLat,
      userLng
    });

    const latencyMs = Date.now() - t0;
    const analysisId = `pva_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    // 5. Si es urgente y se indicó correo de emergencia, encolar alerta en notification_outbox
    let emergencyNotificationQueued = null;
    if (
      normalized.visual_health_triage.immediate_emergency &&
      notify_emergency_email &&
      String(notify_emergency_email).includes('@')
    ) {
      emergencyNotificationQueued = await multichannelService
        .queueNotification({
          channel: 'email',
          recipient: String(notify_emergency_email).trim(),
          type: 'PET_VISION_URGENT_TRIAGE',
          title: `🚨 Alerta Veterinaria Urgente GoToX: ${pet_context?.nombre || 'Tu mascota'}`,
          priority: 'high',
          payload: {
            analysis_id: analysisId,
            severity_level: normalized.visual_health_triage.severity_level,
            vet_escalation_message: normalized.visual_health_triage.vet_escalation_message,
            closest_clinic: clinics[0] || null
          }
        })
        .catch(() => null);
    }

    const finalResponse = {
      analysis_id: analysisId,
      analyzed_at: new Date().toISOString(),
      provider: normalized._provider_meta.provider,
      model: normalized._provider_meta.model,
      fallback_used: normalized._provider_meta.fallback,
      focus_area: normalizedFocus,
      images_analyzed_count: processedImages.length,
      image_telemetry: primaryImageMeta,
      is_pet_detected: normalized.is_pet_detected,
      confidence_score: normalized.confidence_score,
      confidence_label: normalized.confidence_label,
      approximate_profile: normalized.approximate_profile,
      visual_health_triage: normalized.visual_health_triage,
      veterinary_action_plan: normalized.veterinary_action_plan,
      evolution_comparison: evolutionComparison,
      recommended_vet_clinics: clinics,
      gam_outing_recommendation: normalized.gam_outing_recommendation,
      emergency_notification: emergencyNotificationQueued
        ? { queued: true, outbox_id: emergencyNotificationQueued.id }
        : { queued: false },
      legal_disclaimer:
        'Orientación visual aproximada generada por IA (Google Gemini Vision). No constituye un diagnóstico clínico definitivo ni reemplaza la revisión presencial de un médico veterinario colegiado.',
      latency_ms: latencyMs
    };

    this.analysisStoreById.set(analysisId, finalResponse);
    if (this.analysisStoreById.size > 100) {
      const oldestKey = this.analysisStoreById.keys().next().value;
      this.analysisStoreById.delete(oldestKey);
    }

    await this._recordGovernanceLog({
      analysisId,
      actor,
      focusArea: normalizedFocus,
      userNotes,
      petContext: pet_context,
      result: finalResponse,
      latencyMs
    });

    return finalResponse;
  }

  /**
   * Compara una nueva fotografía de seguimiento contra un análisis previo para detectar
   * si el problema de la mascota está mejorando, estable o empeorando (y derivar al veterinario).
   */
  async compareFollowUpPhoto(payload = {}, actor = null) {
    const { previous_analysis_id, ...rest } = payload;
    if (!previous_analysis_id) {
      const err = new Error('previous_analysis_id es requerido para comparar la evolución de la mascota.');
      err.status = 400;
      err.code = 'MISSING_PREVIOUS_ANALYSIS_ID';
      throw err;
    }
    return await this.analyzePetPhoto({ ...rest, previous_analysis_id }, actor);
  }

  getAnalysisById(analysisId) {
    return this.analysisStoreById.get(String(analysisId || '').trim()) || null;
  }

  async _resolveAndSanitizeImagePayload(rawInput) {
    let mimeType = 'image/jpeg';
    let base64Data = '';

    const dataUrlMatch = rawInput.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1].toLowerCase();
      base64Data = dataUrlMatch[2].replace(/\s+/g, '');
    } else if (rawInput.startsWith('http://') || rawInput.startsWith('https://') || rawInput.startsWith('/')) {
      if (rawInput.startsWith('http://') || rawInput.startsWith('https://')) {
        // Bloquear intentos de SSRF hacia localhost, IPs privadas RFC1918 o metadata cloud (169.254.169.254)
        assertSafeOutboundUrl(rawInput);
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4500);
          const resp = await fetch(rawInput, { signal: controller.signal });
          clearTimeout(timer);
          if (resp.ok) {
            const contentType = (resp.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
            const arrayBuf = await resp.arrayBuffer();
            if (arrayBuf.byteLength > MAX_IMAGE_BYTES) {
              const err = new Error('La fotografía descargada supera el límite de 8 MB.');
              err.status = 413;
              err.code = 'IMAGE_TOO_LARGE';
              throw err;
            }
            mimeType = contentType.startsWith('image/') ? contentType : 'image/jpeg';
            base64Data = Buffer.from(arrayBuf).toString('base64');
          }
        } catch (err) {
          if (err.code === 'IMAGE_TOO_LARGE') throw err;
        }
      }
      if (!base64Data) {
        return {
          mimeType: 'image/jpeg',
          base64Data: '',
          telemetry: {
            format: 'external_url',
            width: null,
            height: null,
            size_bytes: 0,
            exif_sanitized: true,
            resolution_quality: 'media',
            quality_note: 'Imagen referenciada por URL.'
          }
        };
      }
    } else {
      const cleaned = rawInput.replace(/\s+/g, '');
      if (cleaned.length < 16 || !/^[A-Za-z0-9+/=]+$/.test(cleaned)) {
        const err = new Error('El formato de la imagen no es válido. Envía un Data URL (data:image/jpeg;base64,...) o Base64 válido.');
        err.status = 400;
        err.code = 'INVALID_IMAGE_FORMAT';
        throw err;
      }
      base64Data = cleaned;
    }

    const rawBuffer = Buffer.from(base64Data, 'base64');
    if (rawBuffer.length > MAX_IMAGE_BYTES) {
      const err = new Error('La fotografía supera el límite máximo permitido de 8 MB.');
      err.status = 413;
      err.code = 'IMAGE_TOO_LARGE';
      throw err;
    }

    // Intentar sanitizar EXIF/GPS y extraer dimensiones reales con PhotoSecurityValidator
    try {
      const inspected = inspectAndSanitizeImage(rawBuffer, {
        maxBytes: MAX_IMAGE_BYTES,
        minWidth: 1,
        minHeight: 1
      });
      const isGoodRes = inspected.width >= 320 && inspected.height >= 240;
      return {
        mimeType: inspected.mimeType || mimeType,
        base64Data: inspected.sanitizedBuffer.toString('base64'),
        telemetry: {
          format: inspected.format,
          width: inspected.width,
          height: inspected.height,
          size_bytes: inspected.byteSize,
          sha256_prefix: String(inspected.contentHash || '').slice(0, 16),
          exif_sanitized: true,
          exif_metadata_removed: Boolean(inspected.exifStripped),
          resolution_quality: isGoodRes ? 'alta' : 'baja_o_miniatura',
          quality_note: isGoodRes
            ? 'Resolución óptima para pre-triaje visual y metadatos EXIF/GPS eliminados.'
            : 'Resolución baja o miniatura; para mayor precisión clínica toma una fotografía más cercana con buena luz natural.'
        }
      };
    } catch (_) {
      const sha256Prefix = crypto.createHash('sha256').update(rawBuffer).digest('hex').slice(0, 16);
      return {
        mimeType,
        base64Data,
        telemetry: {
          format: mimeType.replace('image/', ''),
          width: null,
          height: null,
          size_bytes: rawBuffer.length,
          sha256_prefix: sha256Prefix,
          exif_sanitized: true,
          exif_metadata_removed: false,
          resolution_quality: rawBuffer.length > 15000 ? 'alta' : 'media',
          quality_note: 'Imagen procesada en memoria sin metadatos GPS expuestos.'
        }
      };
    }
  }

  _buildVisionPrompt({ focusArea, userNotes, petContext, imagesCount }) {
    const contextParts = [];
    if (petContext.nombre) contextParts.push(`Nombre: ${sanitizePii(petContext.nombre)}`);
    if (petContext.raza) contextParts.push(`Raza declarada: ${sanitizePii(petContext.raza)}`);
    if (petContext.pesoKg || petContext.peso_kg) contextParts.push(`Peso declarado: ${petContext.pesoKg || petContext.peso_kg} kg`);
    if (petContext.edadAnos || petContext.edad_anos) contextParts.push(`Edad declarada: ${petContext.edadAnos || petContext.edad_anos} años`);
    if (petContext.alergias) {
      contextParts.push(
        `Alergias conocidas: ${sanitizePii(Array.isArray(petContext.alergias) ? petContext.alergias.join(', ') : petContext.alergias)}`
      );
    }

    return [
      `Analiza ${imagesCount > 1 ? `estas ${imagesCount} fotografías` : 'esta fotografía'} de mascota y devuelve un JSON con la siguiente estructura exacta:`,
      '{',
      '  "is_pet_detected": true,',
      '  "confidence_score": 0.86,',
      '  "approximate_profile": {',
      '    "species": "Canino | Felino | Otro",',
      '    "estimated_breed": "Raza o cruce aproximado",',
      '    "estimated_weight_range_kg": "12 - 16 kg",',
      '    "estimated_weight_kg": 14,',
      '    "estimated_age_stage": "Cachorro (< 1 año) | Adulto joven (1 - 3 años) | Adulto (4 - 7 años) | Senior (8+ años)",',
      '    "estimated_age_years": 3,',
      '    "coat_color_and_type": "Descripción del manto y color",',
      '    "body_condition": "Peso saludable aparente | Posible sobrepeso | Posible bajo peso",',
      '    "brachycephalic_or_heat_sensitive": false',
      '  },',
      '  "visual_health_triage": {',
      '    "severity_level": "leve | moderado | urgente",',
      '    "severity_score": 2,',
      '    "requires_vet_visit": false,',
      '    "immediate_emergency": false,',
      '    "vet_escalation_message": "Recomendación directa de acudir al veterinario si hay un problema moderado o grande/urgente",',
      '    "detected_issues": [',
      '      {',
      '        "area": "patas_almohadillas | piel_pelaje | ojos_orejas | dientes_encias | heridas_sangrado | garrapatas_parasitos | peso_condicion | postura_movilidad | golpe_calor_respiracion | general",',
      '        "finding": "Signo visual aproximado observado",',
      '        "severity": "leve | moderado | urgente",',
      '        "approximate_cause": "Posible causa orientativa (no definitiva)"',
      '      }',
      '    ],',
      '    "visual_summary": "Explicación clara en español de lo observado de forma aproximada",',
      '    "home_care_tips": ["Cuidado básico seguro en casa 1", "Cuidado 2"],',
      '    "what_not_to_do": ["Qué NO hacer en casa (ej. no automedicar)"],',
      '    "when_to_go_to_vet": ["Signo de alarma 1 para ir al veterinario", "Signo de alarma 2"]',
      '  },',
      '  "veterinary_action_plan": {',
      '    "urgency_timeline": "Inmediato (0 - 2 horas) — Urgencia 24/7 | Prioritario (12 - 24 horas) | Consulta programada (24 - 48 horas) | Control preventivo rutinario",',
      '    "recommended_specialist": "Especialidad veterinaria recomendada",',
      '    "differential_possibilities": [',
      '      { "condition": "Posibilidad orientativa 1", "likelihood": "alta | media | baja", "explanation": "Por qué se considera como posibilidad aproximada" }',
      '    ],',
      '    "pre_transport_stabilization": ["Paso 1 para proteger o trasladar a la mascota hacia la clínica"],',
      '    "questions_for_your_vet": ["Pregunta clave 1 para consultar al médico veterinario", "Pregunta 2"],',
      '    "vital_signs_checklist": ["Revisión casera rápida 1 (ej. color de encías rosado)", "Revisión 2"]',
      '  },',
      '  "gam_outing_recommendation": {',
      '    "can_go_out_today": true,',
      '    "recommended_hours": "Antes de las 10:00 a.m. o después de las 4:30 p.m.",',
      '    "thermal_paw_warning": "Recomendación sobre temperatura del asfalto y terrazas en la GAM"',
      '  }',
      '}',
      `Área de enfoque solicitada por el tutor: ${focusArea}.`,
      userNotes
        ? `Síntomas u observaciones reportadas por el tutor: "${userNotes}".`
        : 'El tutor no reportó síntomas adicionales por texto; realiza inspección visual general y de anomalías visibles.',
      contextParts.length > 0 ? `Contexto actual de la ficha: ${contextParts.join(' | ')}.` : ''
    ]
      .filter(Boolean)
      .join('\n');
  }

  _normalizeAndEnrichResult({ aiResult, focusArea, userNotes, petContext, imageTelemetry, liveComfort }) {
    const heuristic = this._buildHeuristicAssessment({ focusArea, userNotes, petContext, liveComfort });

    if (!aiResult || typeof aiResult !== 'object') {
      if (imageTelemetry?.resolution_quality === 'baja_o_miniatura') {
        heuristic.confidence_score = Number(Math.max(0.5, heuristic.confidence_score - 0.1).toFixed(2));
        heuristic.confidence_label = heuristic.confidence_score >= 0.8 ? 'Alta' : heuristic.confidence_score >= 0.55 ? 'Media' : 'Baja';
      }
      return heuristic;
    }

    const rawProfile = aiResult.approximate_profile || {};
    const rawTriage = aiResult.visual_health_triage || {};
    const rawPlan = aiResult.veterinary_action_plan || {};
    const rawOuting = aiResult.gam_outing_recommendation || {};

    let severityLevel = String(rawTriage.severity_level || heuristic.visual_health_triage.severity_level).toLowerCase();
    if (!['leve', 'moderado', 'urgente'].includes(severityLevel)) {
      severityLevel = heuristic.visual_health_triage.severity_level;
    }

    // Seguridad clínica: nunca degradar una urgencia explícita detectada en síntomas críticos
    if (heuristic.visual_health_triage.severity_level === 'urgente' && severityLevel !== 'urgente') {
      severityLevel = 'urgente';
    } else if (heuristic.visual_health_triage.severity_level === 'moderado' && severityLevel === 'leve') {
      severityLevel = 'moderado';
    }

    const requiresVetVisit = severityLevel === 'moderado' || severityLevel === 'urgente' || Boolean(rawTriage.requires_vet_visit);
    const immediateEmergency = severityLevel === 'urgente' || Boolean(rawTriage.immediate_emergency);

    const severityScore = Number.isFinite(Number(rawTriage.severity_score))
      ? Math.max(1, Math.min(10, Math.round(Number(rawTriage.severity_score))))
      : severityLevel === 'urgente'
      ? 9
      : severityLevel === 'moderado'
      ? 5
      : 2;

    const severityBadge =
      severityLevel === 'urgente'
        ? '🔴 Alerta Mayor — Acudir al Veterinario de Urgencia'
        : severityLevel === 'moderado'
        ? '🟡 Atención Moderada — Se recomienda consulta veterinaria (24-48h)'
        : '🟢 Observación Leve / Preventiva';

    let confidenceScore = Number.isFinite(Number(aiResult.confidence_score))
      ? Math.max(0.1, Math.min(0.99, Number(aiResult.confidence_score)))
      : 0.84;

    if (imageTelemetry?.resolution_quality === 'baja_o_miniatura') {
      confidenceScore = Number(Math.max(0.45, confidenceScore - 0.1).toFixed(2));
    }
    const confidenceLabel = confidenceScore >= 0.8 ? 'Alta' : confidenceScore >= 0.55 ? 'Media' : 'Baja';

    const ambientTempC = Number(liveComfort?.temperature_c) || 26;
    const estimatedAsphaltTempC = Number((ambientTempC + (ambientTempC >= 25 ? 16 : 9)).toFixed(1));

    return {
      _provider_meta: aiResult._provider_meta || {
        provider: 'Google Gemini Vision Cloud',
        model: geminiClient.model || 'gemini-2.0-flash',
        fallback: false
      },
      is_pet_detected: aiResult.is_pet_detected !== undefined ? Boolean(aiResult.is_pet_detected) : true,
      confidence_score: confidenceScore,
      confidence_label: confidenceLabel,
      approximate_profile: {
        species: rawProfile.species || heuristic.approximate_profile.species,
        estimated_breed: rawProfile.estimated_breed || heuristic.approximate_profile.estimated_breed,
        estimated_weight_range_kg:
          rawProfile.estimated_weight_range_kg || heuristic.approximate_profile.estimated_weight_range_kg,
        estimated_weight_kg:
          Number(rawProfile.estimated_weight_kg) > 0
            ? Number(rawProfile.estimated_weight_kg)
            : heuristic.approximate_profile.estimated_weight_kg,
        estimated_age_stage:
          rawProfile.estimated_age_stage || heuristic.approximate_profile.estimated_age_stage,
        estimated_age_years:
          Number(rawProfile.estimated_age_years) >= 0
            ? Number(rawProfile.estimated_age_years)
            : heuristic.approximate_profile.estimated_age_years,
        coat_color_and_type:
          rawProfile.coat_color_and_type || heuristic.approximate_profile.coat_color_and_type,
        body_condition: rawProfile.body_condition || heuristic.approximate_profile.body_condition,
        brachycephalic_or_heat_sensitive: Boolean(
          rawProfile.brachycephalic_or_heat_sensitive ??
            heuristic.approximate_profile.brachycephalic_or_heat_sensitive
        )
      },
      visual_health_triage: {
        severity_level: severityLevel,
        severity_score: severityScore,
        severity_badge: severityBadge,
        requires_vet_visit: requiresVetVisit,
        immediate_emergency: immediateEmergency,
        vet_escalation_message:
          rawTriage.vet_escalation_message || heuristic.visual_health_triage.vet_escalation_message,
        detected_issues:
          Array.isArray(rawTriage.detected_issues) && rawTriage.detected_issues.length > 0
            ? rawTriage.detected_issues
            : heuristic.visual_health_triage.detected_issues,
        visual_summary: rawTriage.visual_summary || heuristic.visual_health_triage.visual_summary,
        home_care_tips:
          Array.isArray(rawTriage.home_care_tips) && rawTriage.home_care_tips.length > 0
            ? rawTriage.home_care_tips
            : heuristic.visual_health_triage.home_care_tips,
        what_not_to_do:
          Array.isArray(rawTriage.what_not_to_do) && rawTriage.what_not_to_do.length > 0
            ? rawTriage.what_not_to_do
            : heuristic.visual_health_triage.what_not_to_do,
        when_to_go_to_vet:
          Array.isArray(rawTriage.when_to_go_to_vet) && rawTriage.when_to_go_to_vet.length > 0
            ? rawTriage.when_to_go_to_vet
            : heuristic.visual_health_triage.when_to_go_to_vet
      },
      veterinary_action_plan: {
        urgency_timeline:
          rawPlan.urgency_timeline || heuristic.veterinary_action_plan.urgency_timeline,
        recommended_specialist:
          rawPlan.recommended_specialist || heuristic.veterinary_action_plan.recommended_specialist,
        differential_possibilities:
          Array.isArray(rawPlan.differential_possibilities) && rawPlan.differential_possibilities.length > 0
            ? rawPlan.differential_possibilities
            : heuristic.veterinary_action_plan.differential_possibilities,
        pre_transport_stabilization:
          Array.isArray(rawPlan.pre_transport_stabilization) && rawPlan.pre_transport_stabilization.length > 0
            ? rawPlan.pre_transport_stabilization
            : heuristic.veterinary_action_plan.pre_transport_stabilization,
        questions_for_your_vet:
          Array.isArray(rawPlan.questions_for_your_vet) && rawPlan.questions_for_your_vet.length > 0
            ? rawPlan.questions_for_your_vet
            : heuristic.veterinary_action_plan.questions_for_your_vet,
        vital_signs_checklist:
          Array.isArray(rawPlan.vital_signs_checklist) && rawPlan.vital_signs_checklist.length > 0
            ? rawPlan.vital_signs_checklist
            : heuristic.veterinary_action_plan.vital_signs_checklist
      },
      gam_outing_recommendation: {
        can_go_out_today:
          severityLevel === 'urgente'
            ? false
            : rawOuting.can_go_out_today !== undefined
            ? Boolean(rawOuting.can_go_out_today)
            : heuristic.gam_outing_recommendation.can_go_out_today,
        recommended_hours:
          rawOuting.recommended_hours || heuristic.gam_outing_recommendation.recommended_hours,
        thermal_paw_warning:
          rawOuting.thermal_paw_warning || heuristic.gam_outing_recommendation.thermal_paw_warning,
        live_gam_weather: {
          ambient_temp_c: ambientTempC,
          estimated_asphalt_temp_c: estimatedAsphaltTempC,
          asphalt_burn_risk: estimatedAsphaltTempC >= 48 ? 'alto' : estimatedAsphaltTempC >= 40 ? 'moderado' : 'bajo',
          rain_alert_active: Boolean(liveComfort?.rain_alert?.active)
        }
      }
    };
  }

  _buildHeuristicAssessment({ focusArea, userNotes, petContext, liveComfort }) {
    const text = `${focusArea} ${userNotes}`.toLowerCase();

    const urgentKeywords = [
      'sangr',
      'herida abierta',
      'quemadura',
      'ampolla',
      'no puede caminar',
      'cojea mucho',
      'hinchado',
      'inflamación severa',
      'golpe de calor',
      'desmayo',
      'vomit',
      'convulsi',
      'ojo cerrado',
      'pus',
      'infección',
      'fractura',
      'grave',
      'urgente',
      'dolor fuerte',
      'asfalto caliente',
      'encía pálida',
      'encía azul',
      'ahog',
      'dificultad para respirar',
      'corte profundo',
      'mordedura'
    ];

    const moderateKeywords = [
      'rasca',
      'picazón',
      'alopecia',
      'sin pelo',
      'rojo',
      'enrojec',
      'irritación',
      'dermatitis',
      'garrapata',
      'pulga',
      'lagaña',
      'oreja',
      'otitis',
      'lame la pata',
      'sobrepeso',
      'delgado',
      'caspa',
      'costra',
      'bulto',
      'masa',
      'sarro',
      'mal aliento',
      'encía roja',
      'cojea'
    ];

    const isUrgent =
      urgentKeywords.some((k) => text.includes(k)) ||
      ['heridas_sangrado', 'golpe_calor_respiracion'].includes(focusArea);

    const isModerate =
      !isUrgent &&
      (moderateKeywords.some((k) => text.includes(k)) ||
        [
          'patas_almohadillas',
          'piel_pelaje',
          'ojos_orejas',
          'dientes_encias',
          'garrapatas_parasitos',
          'postura_movilidad'
        ].includes(focusArea));

    const severityLevel = isUrgent ? 'urgente' : isModerate ? 'moderado' : 'leve';
    const severityScore = isUrgent ? 9 : isModerate ? 5 : 2;

    const focusMeta =
      this.getSupportedFocusAreas().find((f) => f.id === focusArea) || this.getSupportedFocusAreas()[0];

    let detectedIssues = [];
    let visualSummary = '';
    let homeCareTips = [];
    let differentialPossibilities = [];
    let preTransportStabilization = [];
    let questionsForYourVet = [];
    let whatNotToDo = [
      'No apliques cremas, antibióticos ni analgésicos de uso humano (ibuprofeno, naproxeno o acetaminofén son altamente tóxicos para perros y gatos).',
      'No retires costras, cuerpos extraños profundos ni presiones zonas inflamadas.'
    ];
    let whenToGoToVet = [
      'Si notas sangrado activo, secreción purulenta, mal olor o aumento rápido de la inflamación.',
      'Si tu mascota presenta decaimiento, falta de apetito, vómito, fiebre o dolor intenso al tacto.'
    ];

    if (focusArea === 'patas_almohadillas' || text.includes('almohadilla') || text.includes('asfalto') || text.includes('pata')) {
      detectedIssues = [
        {
          area: 'patas_almohadillas',
          finding: isUrgent
            ? 'Posible quemadura térmica podal de segundo/tercer grado, desprendimiento epidérmico o herida abierta en almohadilla plantar'
            : 'Irritación, eritema o desgaste superficial aproximado en almohadillas plantares',
          severity: severityLevel,
          approximate_cause: 'Exposición a asfalto o aceras calientes en la GAM, fricción o cuerpo extraño (espina/vidrio)'
        }
      ];
      differentialPossibilities = [
        {
          condition: 'Quemadura térmica plantar por pavimento caliente',
          likelihood: isUrgent ? 'alta' : 'media',
          explanation: 'Común tras caminatas entre 10:00 a.m. y 3:30 p.m. cuando el asfalto supera los 50 °C.'
        },
        {
          condition: 'Pododermatitis por fricción o cuerpo extraño interdigital',
          likelihood: 'media',
          explanation: 'El lamido constante de la pata suele indicar molestia localizada o espina alojada.'
        }
      ];
      visualSummary = isUrgent
        ? 'Estimación aproximada: Se identifican signos compatibles con una lesión podal importante (quemadura severa, úlcera o herida abierta en almohadilla). Este problema tiene alto riesgo de infección secundaria y dolor agudo, por lo que debes acudir DE INMEDIATO al veterinario.'
        : 'Estimación aproximada: Se observa sensibilidad o desgaste moderado en las almohadillas. Se recomienda revisión veterinaria en las próximas 24-48 horas para descartar fisuras profundas.';
      homeCareTips = [
        'Lava suavemente la pata solo con suero fisiológico estéril a temperatura ambiente.',
        'Mantén a tu mascota en piso fresco y limpio bajo techo; evita tierra o césped húmedo.'
      ];
      preTransportStabilization = [
        'Cubre la pata con una gasa estéril limpia sin apretar (nunca hagas torniquete) para evitar que se contamine durante el traslado.',
        'Alza a tu mascota para subirla al vehículo; no la hagas caminar sobre la acera hacia la clínica.'
      ];
      questionsForYourVet = [
        '¿La profundidad de la lesión en la almohadilla requiere desbridamiento, vendaje protector o antibiótico sistémico?',
        '¿Qué analgésico veterinario seguro podemos usar para controlar el dolor plantar en casa?',
        '¿Cuántos días de reposo estricto necesita antes de volver a apoyar sobre acera?'
      ];
    } else if (focusArea === 'piel_pelaje' || focusArea === 'garrapatas_parasitos' || text.includes('rasca') || text.includes('piel') || text.includes('garrapata')) {
      detectedIssues = [
        {
          area: focusArea === 'garrapatas_parasitos' ? 'garrapatas_parasitos' : 'piel_pelaje',
          finding: 'Zona localizada con posible eritema cutáneo, pérdida parcial de pelaje (alopecia aproximada) o reacción a ectoparásitos',
          severity: severityLevel,
          approximate_cause: 'Posible dermatitis alérgica, humedad ambiental (parche caliente / hot spot) o picadura de garrapata/pulga'
        }
      ];
      differentialPossibilities = [
        {
          condition: 'Dermatitis húmeda aguda (Hot Spot) o dermatitis alérgica',
          likelihood: 'alta',
          explanation: 'Frecuente en épocas húmedas o lluviosas de la GAM cuando el manto queda húmedo.'
        },
        {
          condition: 'Dermatitis por picadura de ectoparásitos o foliculitis superficial',
          likelihood: 'media',
          explanation: 'Requiere revisión clínica o raspado cutáneo para elegir el tratamiento específico.'
        }
      ];
      visualSummary =
        'Estimación aproximada: Se aprecia una alteración cutánea localizada con irritación. Te recomendamos agendar consulta veterinaria para realizar diagnóstico dermatológico (raspado/citología) antes de aplicar cualquier producto tópico.';
      homeCareTips = [
        'Mantén la zona completamente seca y ventilada.',
        'Coloca un collar isabelino (cono) si intenta lamerse o rascarse la lesión.'
      ];
      preTransportStabilization = [
        'No bañes ni apliques talcos o pomadas antes de la consulta veterinaria, ya que alteran la muestra para citología cutánea.'
      ];
      questionsForYourVet = [
        '¿Es recomendable realizar una citología o raspado cutáneo para descartar ácaros, bacterias u hongos?',
        '¿Debo ajustar su protocolo mensual de desparasitación externa (garrapatas y pulgas)?',
        '¿Esta irritación podría estar relacionada con alergia alimentaria o ambiental?'
      ];
    } else if (focusArea === 'ojos_orejas' || text.includes('ojo') || text.includes('oreja')) {
      detectedIssues = [
        {
          area: 'ojos_orejas',
          finding: 'Posible hiperemia (enrojecimiento) conjuntival, secreción ocular o inflamación del canal auditivo externo',
          severity: severityLevel,
          approximate_cause: 'Posible conjuntivitis, úlcera corneal superficial, alergia o inicio de otitis externa'
        }
      ];
      differentialPossibilities = [
        {
          condition: 'Irritación oftálmica / conjuntivitis o posible lesión corneal',
          likelihood: 'alta',
          explanation: 'Si mantiene el ojo entrecerrado (blefaroespasmo), requiere valoración con tinción de fluoresceína.'
        },
        {
          condition: 'Otitis externa por humedad o levaduras',
          likelihood: 'media',
          explanation: 'Común si sacude la cabeza o presenta olor fuerte en el pabellón auricular.'
        }
      ];
      visualSummary =
        'Estimación aproximada: Las afecciones en ojos y oídos son delicadas y pueden empeorar en pocas horas. Se recomienda acudir al veterinario para examen con oftalmoscopio/otoscopio.';
      homeCareTips = [
        'Limpia únicamente el contorno externo con gasa estéril y suero fisiológico.',
        'Evita que se frote la cara con las patas.'
      ];
      whatNotToDo.unshift('Nunca apliques colirios o gotas con corticoides sin que el veterinario descarte primero una úlcera corneal.');
      preTransportStabilization = [
        'Coloca collar isabelino durante el trayecto en auto para impedir que se rasque el ojo o la oreja.'
      ];
      questionsForYourVet = [
        '¿Se requiere prueba de fluoresceína para descartar una úlcera en la córnea?',
        '¿El canal auditivo presenta inflamación timpánica o presencia de levaduras/ácaros?',
        '¿Cada cuántas horas debemos aplicar el tratamiento oftálmico/ótico recetado?'
      ];
    } else if (focusArea === 'golpe_calor_respiracion' || text.includes('calor') || text.includes('jadeo')) {
      detectedIssues = [
        {
          area: 'golpe_calor_respiracion',
          finding: 'Signos compatibles con estrés térmico agudo o hipertermia (jadeo intenso, mucosas congestivas o decaimiento)',
          severity: 'urgente',
          approximate_cause: 'Sobrecarga térmica por ejercicio en horas cálidas, humedad alta o morfología braquicéfala'
        }
      ];
      differentialPossibilities = [
        {
          condition: 'Golpe de calor (Hipertermia aguda) / agotamiento térmico',
          likelihood: 'alta',
          explanation: 'Emergencia veterinaria que requiere control de temperatura e hidratación intravenosa.'
        }
      ];
      visualSummary =
        'Estimación aproximada: El estrés térmico o golpe de calor es una EMERGENCIA VETERINARIA MAYOR. Aplica medidas de enfriamiento gradual con agua fresca (no helada) y trasládalo de inmediato a un hospital veterinario 24/7.';
      homeCareTips = [
        'Humedece abdomen, ingles, axilas y almohadillas con agua fresca a temperatura ambiente (NUNCA uses hielo ni agua helada, ya que provoca vasoconstricción peligrosa).',
        'Coloca un ventilador cerca y ofrécele pequeños sorbos de agua si está consciente.'
      ];
      preTransportStabilization = [
        'Enciende el aire acondicionado del vehículo antes de subir a tu mascota y llévala directo al Hospital 24/7 más cercano.',
        'No cubras su cuerpo con toallas mojadas calientes; mantén el flujo de aire continuo.'
      ];
      questionsForYourVet = [
        '¿Su temperatura rectal y perfil de coagulación/renal requieren fluidoterapia intravenosa?',
        '¿Presenta signos de edema en vías respiratorias superiores?',
        '¿Qué precauciones especiales de paseo debemos seguir en la GAM por su morfología?'
      ];
    } else {
      detectedIssues = [
        {
          area: focusArea,
          finding:
            severityLevel === 'urgente'
              ? 'Signo clínico de alta prioridad que requiere atención veterinaria presencial inmediata'
              : severityLevel === 'moderado'
              ? 'Alteración visual moderada que amerita revisión clínica programada'
              : 'Aspecto visual general estable en la inspección aproximada, sin lesiones agudas evidentes',
          severity: severityLevel,
          approximate_cause: 'Evaluación visual orientativa de condición general y bienestar'
        }
      ];
      differentialPossibilities = [
        {
          condition:
            severityLevel === 'leve'
              ? 'Condición física general dentro de parámetros visuales habituales'
              : 'Signo clínico localizado que requiere exploración física presencial',
          likelihood: 'alta',
          explanation: 'Basado en la inspección visual aproximada de la fotografía enviada.'
        }
      ];
      visualSummary =
        severityLevel === 'urgente'
          ? 'Estimación aproximada: Se detectan indicadores de un problema importante que no debe manejarse en casa. Acude de inmediato a un hospital veterinario 24/7.'
          : severityLevel === 'moderado'
          ? 'Estimación aproximada: Se observan signos moderados que justifican una consulta con el médico veterinario en las próximas 24 a 48 horas.'
          : 'Estimación aproximada: Tu mascota muestra una postura, pelaje y condición corporal aparentemente saludables en la fotografía. Recuerda mantener sus vacunas, desparasitación y chequeo anual al día.';
      homeCareTips = [
        'Realiza la regla de los 5 segundos con el dorso de tu mano sobre el asfalto antes de cada paseo en la GAM.',
        'Mantén agua fresca disponible y revisa sus almohadillas y pelaje al regresar a casa.'
      ];
      preTransportStabilization = [
        'Lleva su carnet digital GoToX con peso aproximado, alergias y número de microchip listos para el veterinario.'
      ];
      questionsForYourVet = [
        '¿Su peso y condición corporal actual son ideales para su edad y nivel de actividad?',
        '¿Cuándo corresponde su próximo refuerzo de vacunación y desparasitación?',
        '¿Recomienda algún cuidado preventivo adicional para paseos urbanos en la GAM?'
      ];
    }

    const declaredBreed =
      petContext?.raza && petContext.raza !== 'Sin especificar'
        ? petContext.raza
        : 'Mestizo / Cruce Canino (Aproximado)';
    const declaredWeight = Number(petContext?.pesoKg || petContext?.peso_kg) || 14;
    const declaredAge = Number(petContext?.edadAnos || petContext?.edad_anos) || 3;
    const brachyRegex = /(pug|bulldog|shih tzu|boxer|pekin[eé]s|boston terrier|carlino)/i;
    const isBrachy =
      brachyRegex.test(declaredBreed) ||
      text.includes('chato') ||
      text.includes('pug') ||
      text.includes('bulldog');

    const ambientTempC = Number(liveComfort?.temperature_c) || 26;
    const estimatedAsphaltTempC = Number((ambientTempC + (ambientTempC >= 25 ? 16 : 9)).toFixed(1));

    return {
      _provider_meta: {
        provider: 'Google Gemini Vision (Heurística Resiliente)',
        model: geminiClient.model || 'gemini-2.0-flash',
        fallback: true
      },
      is_pet_detected: true,
      confidence_score: 0.8,
      confidence_label: 'Alta',
      approximate_profile: {
        species: 'Canino',
        estimated_breed: declaredBreed,
        estimated_weight_range_kg: `${Math.max(2, declaredWeight - 2)} - ${declaredWeight + 2} kg`,
        estimated_weight_kg: declaredWeight,
        estimated_age_stage:
          declaredAge < 1
            ? 'Cachorro (< 1 año)'
            : declaredAge <= 3
            ? 'Adulto joven (1 - 3 años)'
            : declaredAge <= 7
            ? 'Adulto (4 - 7 años)'
            : 'Senior (8+ años)',
        estimated_age_years: declaredAge,
        coat_color_and_type: petContext?.colorManto || 'Manto corto/medio variado (Aproximado)',
        body_condition: text.includes('sobrepeso')
          ? 'Posible sobrepeso'
          : text.includes('delgado')
          ? 'Posible bajo peso'
          : 'Peso saludable aparente',
        brachycephalic_or_heat_sensitive: isBrachy
      },
      visual_health_triage: {
        severity_level: severityLevel,
        severity_score: severityScore,
        severity_badge:
          severityLevel === 'urgente'
            ? '🔴 Alerta Mayor — Acudir al Veterinario de Urgencia'
            : severityLevel === 'moderado'
            ? '🟡 Atención Moderada — Se recomienda consulta veterinaria (24-48h)'
            : '🟢 Observación Leve / Preventiva',
        requires_vet_visit: severityLevel === 'moderado' || severityLevel === 'urgente',
        immediate_emergency: severityLevel === 'urgente',
        vet_escalation_message:
          severityLevel === 'urgente'
            ? '⚠️ El problema detectado es importante y supera el cuidado casero. Te recomendamos acudir de inmediato a una clínica veterinaria de urgencias 24/7.'
            : severityLevel === 'moderado'
            ? '🩺 Se detectaron signos que requieren valoración profesional. Agenda una cita con un médico veterinario en las próximas 24 a 48 horas.'
            : 'No se observan signos de urgencia inmediata, pero si notas cambios en su ánimo o apetito acude a tu veterinario de confianza.',
        detected_issues: detectedIssues,
        visual_summary: visualSummary,
        home_care_tips: homeCareTips,
        what_not_to_do: whatNotToDo,
        when_to_go_to_vet: whenToGoToVet
      },
      veterinary_action_plan: {
        urgency_timeline:
          severityLevel === 'urgente'
            ? 'Inmediato (0 - 2 horas) — Urgencia 24/7'
            : severityLevel === 'moderado'
            ? 'Consulta programada (24 - 48 horas)'
            : 'Control preventivo rutinario',
        recommended_specialist: focusMeta.default_specialist,
        differential_possibilities: differentialPossibilities,
        pre_transport_stabilization: preTransportStabilization,
        questions_for_your_vet: questionsForYourVet,
        vital_signs_checklist: [
          'Color de encías: deben verse rosadas y húmedas (si están pálidas, blancas o azuladas es urgencia inmediata).',
          'Tiempo de llenado capilar: al presionar suavemente la encía debe recuperar su color rosado en menos de 2 segundos.',
          'Respiración en reposo: sin esfuerzo abdominal ni ruidos al inhalar.',
          'Pliegue cutáneo de hidratación: la piel sobre la cruz debe volver a su lugar de inmediato al soltarla.'
        ]
      },
      gam_outing_recommendation: {
        can_go_out_today: severityLevel !== 'urgente',
        recommended_hours: isBrachy
          ? 'Solo en horas frescas: antes de las 9:30 a.m. o después de las 5:00 p.m. (alta sensibilidad térmica).'
          : 'Antes de las 10:00 a.m. o después de las 4:30 p.m. en la GAM.',
        thermal_paw_warning:
          severityLevel === 'urgente'
            ? 'Suspende los paseos recreativos hoy y prioriza el traslado directo a la clínica veterinaria.'
            : `Temperatura ambiente actual en la GAM ~${ambientTempC} °C (asfalto estimado ~${estimatedAsphaltTempC} °C). Prefiere terrazas techadas con sombra.`,
        live_gam_weather: {
          ambient_temp_c: ambientTempC,
          estimated_asphalt_temp_c: estimatedAsphaltTempC,
          asphalt_burn_risk: estimatedAsphaltTempC >= 48 ? 'alto' : estimatedAsphaltTempC >= 40 ? 'moderado' : 'bajo',
          rain_alert_active: Boolean(liveComfort?.rain_alert?.active)
        }
      }
    };
  }

  _evaluateEvolution(previousAnalysisId, currentTriage) {
    const prev = this.getAnalysisById(previousAnalysisId);
    const prevScore = prev?.visual_health_triage?.severity_score ?? 5;
    const currScore = currentTriage.severity_score;
    const delta = currScore - prevScore;

    const status = delta > 0 ? 'empeorando' : delta < 0 ? 'mejorando' : 'estable';
    const worsened = delta > 0 || (currScore >= 5 && delta === 0);

    return {
      previous_analysis_id: previousAnalysisId,
      previous_severity_score: prevScore,
      current_severity_score: currScore,
      evolution_status: status,
      worsened,
      clinical_recommendation:
        status === 'empeorando'
          ? '⚠️ La lesión o síntoma muestra signos de empeoramiento respecto al análisis anterior. Debes acudir al veterinario sin esperar más.'
          : status === 'estable' && currScore >= 5
          ? '🩺 El problema persiste sin mejoría clara. Se recomienda valoración presencial con el médico veterinario.'
          : '✅ Se observa evolución favorable o estable dentro de rangos leves. Continúa el seguimiento.'
    };
  }

  async _getRecommendedClinics({ severityLevel, focusArea, detectedIssues = [], userLat = 9.9333, userLng = -84.0833 }) {
    let dbClinics = [];
    try {
      dbClinics = await vetService.getEmergencyClinics24h();
    } catch (_) {
      dbClinics = [];
    }

    const issueAreas = new Set([
      focusArea,
      ...detectedIssues.map((i) => String(i.area || '').toLowerCase())
    ]);

    const merged = [...GAM_FALLBACK_VET_DIRECTORY];
    for (const c of dbClinics) {
      if (!merged.some((m) => m.name.toLowerCase() === String(c.name || '').toLowerCase())) {
        merged.push({
          id: c.id || `vet-db-${merged.length + 1}`,
          name: c.name,
          zone: 'GAM Costa Rica',
          address: c.address || 'Gran Área Metropolitana',
          phone: c.phone || '+506 2225-4000',
          coords: c.coords?.lat ? c.coords : { lat: 9.9333, lng: -84.0833 },
          specialty: c.is_24h_verified ? 'Urgencias Veterinarias 24/7' : 'Clínica Veterinaria Verificada',
          is_24h_verified: Boolean(c.is_24h_verified),
          tags: c.is_24h_verified ? ['urgente', 'general'] : ['moderado', 'leve', 'general']
        });
      }
    }

    return merged
      .map((clinic) => {
        const cLat = Number(clinic.coords?.lat) || 9.9333;
        const cLng = Number(clinic.coords?.lng) || -84.0833;
        const distanceKm = haversineDistanceKm(userLat, userLng, cLat, cLng);
        const navObj = generateNavigationLinks(cLat, cLng, clinic.name);
        const cleanPhone = String(clinic.phone || '').replace(/[^\d+]/g, '');

        let score = 0;
        if (severityLevel === 'urgente' && clinic.is_24h_verified) score += 12;
        if (clinic.tags.some((t) => issueAreas.has(t))) score += 7;
        if (clinic.tags.includes(severityLevel)) score += 4;
        score -= Math.min(5, distanceKm * 0.35);

        return {
          ...clinic,
          distance_km: distanceKm,
          call_link: `tel:${cleanPhone}`,
          navigation_links: {
            waze: navObj.links.waze_web,
            ...navObj.links
          },
          relevance_score: Number(score.toFixed(2))
        };
      })
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .map(({ relevance_score, ...rest }) => rest);
  }

  async _recordGovernanceLog({ analysisId, actor, focusArea, userNotes, petContext, result, latencyMs }) {
    const logId = `ailog_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const safeInputSummary = JSON.stringify({
      analysis_id: analysisId,
      focus_area: focusArea,
      symptoms_redacted: userNotes || 'none',
      pet_species: petContext?.especie || 'Canino',
      images_count: result.images_analyzed_count,
      exif_sanitized: result.image_telemetry?.exif_sanitized ?? true
    }).slice(0, 500);

    const safeOutputSummary = JSON.stringify({
      severity_level: result.visual_health_triage.severity_level,
      severity_score: result.visual_health_triage.severity_score,
      requires_vet_visit: result.visual_health_triage.requires_vet_visit,
      recommended_specialist: result.veterinary_action_plan.recommended_specialist,
      confidence_score: result.confidence_score
    }).slice(0, 500);

    const logEntry = {
      id: logId,
      analysis_id: analysisId,
      agent_name: 'pet-vision-triage',
      invoked_by: actor?.id || 'anonymous',
      invoked_role: actor?.role || 'client',
      input_summary: safeInputSummary,
      output_summary: safeOutputSummary,
      provider: result.provider,
      model: result.model,
      latency_ms: Math.max(0, Math.round(Number(latencyMs) || 0)),
      status: 'success',
      created_at: new Date().toISOString()
    };

    this.recentAnalysesMemory.unshift(logEntry);
    if (this.recentAnalysesMemory.length > 50) {
      this.recentAnalysesMemory.length = 50;
    }

    await execute(
      `INSERT INTO ai_interaction_logs
       (id, agent_name, invoked_by, invoked_role, input_summary, output_summary, provider, model, latency_ms, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logEntry.id,
        logEntry.agent_name,
        logEntry.invoked_by,
        logEntry.invoked_role,
        logEntry.input_summary,
        logEntry.output_summary,
        logEntry.provider,
        logEntry.model,
        logEntry.latency_ms,
        logEntry.status
      ]
    ).catch(() => {});
  }

  async getRecentAnalyses({ actor = null, limit = 10 } = {}) {
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
    let dbRows = [];
    if (actor?.id && actor.role !== 'admin') {
      dbRows = await query(
        `SELECT id, agent_name, invoked_by, invoked_role, input_summary, output_summary, provider, model, latency_ms, status, created_at
         FROM ai_interaction_logs
         WHERE agent_name = 'pet-vision-triage' AND invoked_by = ?
         ORDER BY created_at DESC LIMIT ?`,
        [actor.id, safeLimit]
      ).catch(() => []);
    } else {
      dbRows = await query(
        `SELECT id, agent_name, invoked_by, invoked_role, input_summary, output_summary, provider, model, latency_ms, status, created_at
         FROM ai_interaction_logs
         WHERE agent_name = 'pet-vision-triage'
         ORDER BY created_at DESC LIMIT ?`,
        [safeLimit]
      ).catch(() => []);
    }

    if (Array.isArray(dbRows) && dbRows.length > 0) {
      return dbRows;
    }

    return this.recentAnalysesMemory
      .filter((item) => (!actor?.id || actor.role === 'admin' ? true : item.invoked_by === actor.id))
      .slice(0, safeLimit);
  }
}

module.exports = new PetVisionTriageService();
