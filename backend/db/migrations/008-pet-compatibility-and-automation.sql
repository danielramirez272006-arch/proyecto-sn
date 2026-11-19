-- Migración 008: Evidencia de compatibilidad pet-friendly por fuente y eventos idempotentes para n8n

CREATE TABLE IF NOT EXISTS place_pet_evidence (
    id VARCHAR(64) PRIMARY KEY,
    place_id VARCHAR(64) NOT NULL,
    source_type VARCHAR(32) NOT NULL, -- 'business_confirmation' | 'admin_review' | 'external_provider' | 'user_report'
    provider_name VARCHAR(64) NOT NULL, -- 'gotox_admin' | 'business_owner' | 'openstreetmap' | 'google_places' | 'user'
    external_place_id VARCHAR(128),
    access_status VARCHAR(24) NOT NULL DEFAULT 'unknown', -- 'allowed' | 'not_allowed' | 'unknown' | 'conflicting'
    conditions_json JSON NOT NULL,
    evidence_ref TEXT,
    verified_by VARCHAR(64),
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active', -- 'active' | 'outdated' | 'retracted' | 'conflicting'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pet_evidence_place_status ON place_pet_evidence (place_id, status);

CREATE TABLE IF NOT EXISTS automation_events (
    id VARCHAR(64) PRIMARY KEY,
    event_type VARCHAR(48) NOT NULL, -- 'review_pending' | 'confirmation_expiring' | 'contradiction_detected' | 'confirmation_recorded'
    place_id VARCHAR(64),
    payload_json JSON NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(24) NOT NULL DEFAULT 'pending', -- 'pending' | 'processed' | 'acknowledged'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_events_type_status ON automation_events (event_type, status);
