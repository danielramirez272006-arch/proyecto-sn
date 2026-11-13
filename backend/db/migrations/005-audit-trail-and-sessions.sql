-- ============================================================================
-- 005: Pista de Auditoría Enterprise y Gestión de Sesiones Seguras
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_trail (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NULL,
    action VARCHAR(64) NOT NULL,
    resource VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NULL,
    details_json TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_trail (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_trail (resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_trail (action);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refreshtok_user ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refreshtok_hash ON refresh_tokens (token_hash);
