-- Migración 001: Usuarios, Lugares (con verificación por atributo) y Eventos Programados

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'client', -- 'admin', 'organizer', 'client', 'merchant'
    gps_trust_score INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS places (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'cafe', 'feria', 'veterinaria', 'parqueo', 'electrolinera'
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(10, 7) NOT NULL,
    address TEXT,
    district VARCHAR(80),
    canton VARCHAR(80),
    phone VARCHAR(32),
    schedule_info TEXT,
    price_level VARCHAR(8) DEFAULT '$$', -- '$', '$$', '$$$'
    verified_by_admin INT DEFAULT 0, -- 1 si tiene candado humano de protección
    attributes_metadata JSON, -- { "pet_friendly": { "verified": true, "source": "admin_audit", "verified_at": "2026-11-12T00:00:00Z" } }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_places_category ON places (category);
CREATE INDEX IF NOT EXISTS idx_places_coords ON places (lat, lng);
CREATE INDEX IF NOT EXISTS idx_places_verified ON places (verified_by_admin);

CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    place_id VARCHAR(64),
    category VARCHAR(64) DEFAULT 'fair', -- 'fair', 'market', 'castration_campaign', 'cultural'
    status VARCHAR(32) NOT NULL DEFAULT 'published', -- 'published', 'rescheduled', 'cancelled'
    start_time VARCHAR(32) NOT NULL, -- ISO-8601 UTC
    end_time VARCHAR(32) NOT NULL,   -- ISO-8601 UTC
    timezone VARCHAR(40) DEFAULT 'America/Costa_Rica',
    created_by VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events (start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_events_place ON events (place_id);

