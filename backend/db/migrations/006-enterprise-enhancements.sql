-- ============================================================================
-- 006: Mejoras Enterprise — Auditoría Criptográfica, Webhooks, Push, QR y Movilidad
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_chain_ledger (
    id VARCHAR(64) PRIMARY KEY,
    record_id VARCHAR(64) NOT NULL,
    sequence_number INTEGER NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NULL,
    data_hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_chain_seq ON audit_chain_ledger (sequence_number);
CREATE INDEX IF NOT EXISTS idx_audit_chain_entity ON audit_chain_ledger (entity_type, record_id);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS merchant_webhooks (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    target_url TEXT NOT NULL,
    secret VARCHAR(128) NOT NULL,
    events_json TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_merchant_webhooks_merch ON merchant_webhooks (merchant_id);

CREATE TABLE IF NOT EXISTS merchant_webhook_deliveries (
    id VARCHAR(64) PRIMARY KEY,
    subscription_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload_json TEXT NOT NULL,
    response_status INTEGER NULL,
    response_body TEXT NULL,
    duration_ms INTEGER NULL,
    success BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_merchant_deliv_sub ON merchant_webhook_deliveries (subscription_id);

CREATE TABLE IF NOT EXISTS qr_redemptions (
    id VARCHAR(64) PRIMARY KEY,
    qr_id VARCHAR(128) NOT NULL UNIQUE,
    qr_type VARCHAR(64) NOT NULL,
    redeemed_by VARCHAR(64) NULL,
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata_json TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_qr_redemptions_type ON qr_redemptions (qr_type);

CREATE TABLE IF NOT EXISTS user_mobility_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    distance_km REAL NOT NULL,
    transport_mode VARCHAR(32) NOT NULL,
    co2_saved_grams REAL NOT NULL,
    colones_saved REAL NOT NULL,
    passengers_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_mobility ON user_mobility_logs (user_id);

