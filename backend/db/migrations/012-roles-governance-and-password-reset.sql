-- ============================================================================
-- Migración 012: Roles Relacionales (3FN), Gobernanza Ley N.º 8968,
-- Recuperación de Contraseña y Bitácora de Agentes de IA
-- Compatible con Supabase PostgreSQL (app_private) y SQLite
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(64) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_consents (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    terms_version VARCHAR(64) NOT NULL DEFAULT '2026-11-v2',
    privacy_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    cookies_preferences_json TEXT NULL,
    ip_address VARCHAR(64) NULL,
    user_agent TEXT NULL,
    accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL,
    reason TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    retained_legal_summary TEXT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_interaction_logs (
    id VARCHAR(64) PRIMARY KEY,
    agent_name VARCHAR(96) NOT NULL,
    invoked_by VARCHAR(64) NULL,
    invoked_role VARCHAR(32) NOT NULL DEFAULT 'system',
    input_summary TEXT NULL,
    output_summary TEXT NULL,
    provider VARCHAR(64) NOT NULL DEFAULT 'local',
    model VARCHAR(96) NULL,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id, accepted_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_data_deletion_user ON data_deletion_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_logs_agent ON ai_interaction_logs(agent_name, created_at);

INSERT INTO roles (id, name, description) VALUES ('role_admin', 'admin', 'Administrador general del sistema') ON CONFLICT (id) DO NOTHING;
INSERT INTO roles (id, name, description) VALUES ('role_organizer', 'organizer', 'Organizador de eventos y salidas grupales') ON CONFLICT (id) DO NOTHING;
INSERT INTO roles (id, name, description) VALUES ('role_merchant', 'merchant', 'Comercio aliado verificado') ON CONFLICT (id) DO NOTHING;
INSERT INTO roles (id, name, description) VALUES ('role_business_owner', 'business_owner', 'Propietario de establecimiento pet-friendly') ON CONFLICT (id) DO NOTHING;
INSERT INTO roles (id, name, description) VALUES ('role_client', 'client', 'Tutor o usuario registrado') ON CONFLICT (id) DO NOTHING;
INSERT INTO roles (id, name, description) VALUES ('role_guest', 'guest', 'Visitante temporal con acceso limitado') ON CONFLICT (id) DO NOTHING;
