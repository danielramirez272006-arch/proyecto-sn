-- Migración 004: Propuestas Alternativas de IA, Historial Inmutable, Cola de Notificaciones Outbox y Correcciones

CREATE TABLE IF NOT EXISTS plan_proposals (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL,
    plan_revision INT NOT NULL, -- Versión sobre la que se calculó la propuesta
    reason TEXT NOT NULL,       -- Motivo ej. "Feria cancelada por lluvia torrencial"
    alternative_data JSON NOT NULL, -- Nueva estructura propuesta con paradas
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'superseded'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proposals_plan ON plan_proposals (plan_id, status);

CREATE TABLE IF NOT EXISTS plan_history (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL,
    revision INT NOT NULL,
    change_type VARCHAR(48) NOT NULL, -- 'created', 'confirmed', 'proposal_applied', 'manual_edit', 'cancelled'
    snapshot JSON NOT NULL, -- Snapshot completo inmutable del plan en esa versión
    actor_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_plan ON plan_history (plan_id, revision);

CREATE TABLE IF NOT EXISTS notification_outbox (
    id VARCHAR(64) PRIMARY KEY,
    recipient VARCHAR(160) NOT NULL,
    type VARCHAR(48) NOT NULL, -- 'pending_proposal', 'approved_change', 'itinerary_reminder'
    payload JSON NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    next_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    idempotency_key VARCHAR(128) UNIQUE, -- Deduplicación garantizada
    last_error TEXT,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outbox_fetch ON notification_outbox (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_outbox_idempotency ON notification_outbox (idempotency_key);

CREATE TABLE IF NOT EXISTS place_corrections (
    id VARCHAR(64) PRIMARY KEY,
    place_id VARCHAR(64) NOT NULL,
    proposed_data JSON NOT NULL, -- Cambios por campo
    evidence_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    submitted_by VARCHAR(64),
    reviewed_by VARCHAR(64),
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_corrections_place ON place_corrections (place_id, status);

