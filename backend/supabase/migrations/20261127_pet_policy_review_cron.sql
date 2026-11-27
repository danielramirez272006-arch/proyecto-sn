-- ============================================================================
-- Migración Supabase: Cron diario y columnas de soporte para revisión de
-- políticas de mascotas vía Edge Function (sin n8n ni servicios de pago)
-- ============================================================================

-- 1. Asegurar columnas reutilizables en tablas existentes de app_private (idempotente)
ALTER TABLE app_private.place_pet_evidence
  ADD COLUMN IF NOT EXISTS provider_name VARCHAR(64) NOT NULL DEFAULT 'external_provider',
  ADD COLUMN IF NOT EXISTS external_place_id VARCHAR(128) NULL;

ALTER TABLE app_private.automation_events
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(160) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_events_idempotency_key
  ON app_private.automation_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_automation_events_type_created
  ON app_private.automation_events (event_type, created_at DESC);

-- 2. Habilitar extensiones gratuitas de Supabase para programación en la nube
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2B. RPCs seguras (exclusivas de service_role) para que la Edge Function lea y escriba
--     en app_private sin exponer nunca el esquema app_private a PostgREST / anon / authenticated.
CREATE OR REPLACE FUNCTION public.pet_review_get_batch_state(p_cooldown_cutoff TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_places JSONB;
  v_checked JSONB;
  v_evidences JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'category', p.category,
    'address', p.address,
    'canton', p.canton,
    'lat', p.lat,
    'lng', p.lng,
    'verified_by_admin', p.verified_by_admin,
    'attributes_metadata', p.attributes_metadata
  )), '[]'::jsonb) INTO v_places
  FROM (
    SELECT id, name, category, address, canton, lat, lng, verified_by_admin, attributes_metadata
    FROM app_private.places
    LIMIT 400
  ) p;

  SELECT COALESCE(jsonb_agg(e.place_id), '[]'::jsonb) INTO v_checked
  FROM app_private.automation_events e
  WHERE e.event_type = 'hint_batch_checked'
    AND e.created_at >= p_cooldown_cutoff;

  SELECT COALESCE(jsonb_agg(to_jsonb(ev)), '[]'::jsonb) INTO v_evidences
  FROM app_private.place_pet_evidence ev
  WHERE ev.status != 'retracted';

  RETURN jsonb_build_object(
    'places', v_places,
    'recent_checked', v_checked,
    'evidences', v_evidences
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pet_review_record_evidence(
  p_id TEXT,
  p_place_id TEXT,
  p_provider_name TEXT,
  p_external_place_id TEXT,
  p_access_status TEXT,
  p_conditions_json TEXT,
  p_evidence_ref TEXT,
  p_checked_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
BEGIN
  INSERT INTO app_private.place_pet_evidence (
    id, place_id, source_type, provider_name, external_place_id,
    access_status, conditions_json, evidence_ref, verified_by, status, checked_at, expires_at
  )
  VALUES (
    p_id, p_place_id, 'external_provider', COALESCE(p_provider_name, 'external_provider'), p_external_place_id,
    p_access_status, p_conditions_json, p_evidence_ref, NULL, 'active', COALESCE(p_checked_at, NOW()), NULL
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.pet_review_upsert_event(
  p_id TEXT,
  p_event_type TEXT,
  p_place_id TEXT,
  p_dedupe_key TEXT,
  p_status TEXT,
  p_payload_json TEXT,
  p_processed_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
BEGIN
  INSERT INTO app_private.automation_events (
    id, event_type, place_id, dedupe_key, idempotency_key, status, payload_json, processed_at
  )
  VALUES (
    p_id, p_event_type, p_place_id, p_dedupe_key, p_dedupe_key, COALESCE(p_status, 'pending'), p_payload_json, p_processed_at
  )
  ON CONFLICT (dedupe_key) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.pet_review_get_batch_state(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pet_review_get_batch_state(TIMESTAMPTZ) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.pet_review_record_evidence(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pet_review_record_evidence(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.pet_review_upsert_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pet_review_upsert_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO postgres, service_role;

-- 3. Función invocada exclusivamente por pg_cron leyendo secretos desde Supabase Vault
--    (Nunca guarda credenciales en código ni en tablas públicas)
CREATE OR REPLACE FUNCTION app_private.trigger_pet_policy_review_batch(p_batch_size INTEGER DEFAULT 10)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, extensions, public
AS $$
DECLARE
  v_project_url TEXT;
  v_cron_secret TEXT;
  v_request_id BIGINT;
  v_safe_batch INTEGER := GREATEST(1, LEAST(25, COALESCE(p_batch_size, 10)));
BEGIN
  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'synodos_supabase_url'
  LIMIT 1;

  SELECT decrypted_secret INTO v_cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'pet_review_cron_secret'
  LIMIT 1;

  IF v_project_url IS NULL OR v_cron_secret IS NULL THEN
    RAISE NOTICE '[Synodos Cron] Faltan secretos en Vault (synodos_supabase_url / pet_review_cron_secret). Lote omitido.';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := rtrim(v_project_url, '/') || '/functions/v1/pet-policy-review-batch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_cron_secret
    ),
    body := jsonb_build_object(
      'batch_size', v_safe_batch,
      'expiring_within_days', 14,
      'cooldown_days', 14
    ),
    timeout_milliseconds := 10000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION app_private.trigger_pet_policy_review_batch(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.trigger_pet_policy_review_batch(INTEGER) TO postgres, service_role;

-- 4. Programar el lote diario en Supabase Cron (08:00 hora Costa Rica = 14:00 UTC)
--    Único programador oficial de esta revisión.
DO $cron_setup$
DECLARE
  v_job_id BIGINT;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'synodos_pet_policy_daily_review'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'synodos_pet_policy_daily_review',
    '0 14 * * *',
    'SELECT app_private.trigger_pet_policy_review_batch(10);'
  );
END $cron_setup$;
