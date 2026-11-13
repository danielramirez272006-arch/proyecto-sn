-- ==============================================================================
-- Sinergia Urbana Costa Rica — Migración Inicial Supabase PostgreSQL
-- Proyecto: hnnnreowlbtqqjhpmdvd
-- Esquema: app_private (Cerrado por defecto con RLS, fuera de la Data API pública)
-- ==============================================================================

-- 1. Crear el esquema privado
CREATE SCHEMA IF NOT EXISTS app_private;

-- Configurar search_path para esta sesión de migración
SET search_path TO app_private, public;

-- 2. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS app_private.users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'client',
    phone VARCHAR(32) NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Catálogo de Lugares
CREATE TABLE IF NOT EXISTS app_private.places (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(64) NOT NULL,
    lat NUMERIC(10, 6) NOT NULL,
    lng NUMERIC(10, 6) NOT NULL,
    address TEXT NULL,
    district VARCHAR(64) NULL,
    canton VARCHAR(64) NULL,
    phone VARCHAR(32) NULL,
    schedule_info TEXT NULL,
    price_level VARCHAR(8) DEFAULT '$$',
    verified_by_admin BOOLEAN DEFAULT FALSE,
    attributes_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_places_cat ON app_private.places (category);
CREATE INDEX IF NOT EXISTS idx_places_verified ON app_private.places (verified_by_admin);
CREATE INDEX IF NOT EXISTS idx_places_geo ON app_private.places (lat, lng);

-- 4. Tabla de Eventos Programados y Pop-Up
CREATE TABLE IF NOT EXISTS app_private.events (
    id VARCHAR(64) PRIMARY KEY,
    place_id VARCHAR(64) NULL REFERENCES app_private.places(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    category VARCHAR(64) NOT NULL,
    is_indoor BOOLEAN DEFAULT FALSE,
    weather_sensitive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_status ON app_private.events (status);
CREATE INDEX IF NOT EXISTS idx_events_place ON app_private.events (place_id);

-- 5. Tablas de Coordinación de Planes (Social Dining)
CREATE TABLE IF NOT EXISTS app_private.plans (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    organizer_id VARCHAR(64) NOT NULL REFERENCES app_private.users(id) ON DELETE CASCADE,
    organizer_email VARCHAR(160) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    revision INTEGER NOT NULL DEFAULT 1,
    budget_crc INTEGER NULL DEFAULT 0,
    selected_option_id VARCHAR(64) NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plans_code ON app_private.plans (code);

CREATE TABLE IF NOT EXISTS app_private.plan_options (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL REFERENCES app_private.plans(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    estimated_cost_crc INTEGER NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_private.plan_stops (
    id VARCHAR(64) PRIMARY KEY,
    option_id VARCHAR(64) NOT NULL REFERENCES app_private.plan_options(id) ON DELETE CASCADE,
    place_id VARCHAR(64) NULL REFERENCES app_private.places(id) ON DELETE SET NULL,
    event_id VARCHAR(64) NULL REFERENCES app_private.events(id) ON DELETE SET NULL,
    stop_order INTEGER NOT NULL DEFAULT 1,
    start_time TIMESTAMPTZ NULL,
    end_time TIMESTAMPTZ NULL,
    place_name_snapshot VARCHAR(150) NULL,
    place_address_snapshot TEXT NULL
);

CREATE TABLE IF NOT EXISTS app_private.plan_guests (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL REFERENCES app_private.plans(id) ON DELETE CASCADE,
    guest_name VARCHAR(120) NOT NULL,
    guest_token VARCHAR(128) NOT NULL,
    attendance_status VARCHAR(32) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_guest_token ON app_private.plan_guests (plan_id, guest_token);

CREATE TABLE IF NOT EXISTS app_private.plan_votes (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL REFERENCES app_private.plans(id) ON DELETE CASCADE,
    guest_id VARCHAR(64) NOT NULL REFERENCES app_private.plan_guests(id) ON DELETE CASCADE,
    option_id VARCHAR(64) NOT NULL REFERENCES app_private.plan_options(id) ON DELETE CASCADE,
    vote_type VARCHAR(16) NOT NULL CHECK (vote_type IN ('can', 'prefer', 'cannot')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (plan_id, guest_id, option_id)
);

CREATE TABLE IF NOT EXISTS app_private.plan_proposals (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL REFERENCES app_private.plans(id) ON DELETE CASCADE,
    base_revision INTEGER NOT NULL,
    reason TEXT NOT NULL,
    suggested_changes JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Pista de Auditoría y Tokens
CREATE TABLE IF NOT EXISTS app_private.audit_trail (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NULL,
    action VARCHAR(64) NOT NULL,
    resource VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NULL,
    details_json JSONB NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_private.refresh_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES app_private.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_private.notification_outbox (
    id VARCHAR(64) PRIMARY KEY,
    recipient VARCHAR(160) NOT NULL,
    type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(32) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    locked_until TIMESTAMPTZ NULL,
    next_attempt_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 7. Configuración de Seguridad RLS y Permisos de Acceso Limitado
-- ==============================================================================

-- Activar RLS en todas las tablas para que queden cerradas por defecto
ALTER TABLE app_private.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.plan_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.plan_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.plan_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.plan_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.plan_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.notification_outbox ENABLE ROW LEVEL SECURITY;

-- Conceder uso del esquema a los roles de Supabase
GRANT USAGE ON SCHEMA app_private TO postgres, service_role, authenticated, anon;

-- Políticas de lectura pública para el catálogo (Lugares y Eventos)
CREATE POLICY "Permitir lectura de lugares verificados" ON app_private.places
    FOR SELECT TO public USING (true);

CREATE POLICY "Permitir lectura de eventos publicados" ON app_private.events
    FOR SELECT TO public USING (true);

-- Permisos completos para el rol administrativo de Express (service_role / postgres)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app_private TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app_private TO postgres, service_role;
