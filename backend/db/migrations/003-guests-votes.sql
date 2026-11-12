-- Migración 003: Invitados de Planes y Votos por Opción (puedo, prefiero, no puedo)

CREATE TABLE IF NOT EXISTS plan_guests (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL,
    guest_token VARCHAR(64) NOT NULL UNIQUE, -- Token seguro de sesión de invitado sin cuenta
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160),
    phone VARCHAR(32),
    attendance_status VARCHAR(32) DEFAULT 'invited', -- 'invited', 'confirmed', 'declined', 'needs_reconfirmation'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_guests_plan ON plan_guests (plan_id);
CREATE INDEX IF NOT EXISTS idx_guests_token ON plan_guests (guest_token);

CREATE TABLE IF NOT EXISTS plan_votes (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL,
    guest_id VARCHAR(64) NOT NULL,
    option_id VARCHAR(64) NOT NULL,
    vote_type VARCHAR(16) NOT NULL, -- 'can', 'prefer', 'cannot'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (plan_id, guest_id, option_id), -- Restricción estricta anti-duplicados por opción
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_id) REFERENCES plan_guests(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES plan_options(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_votes_plan_option ON plan_votes (plan_id, option_id);

CREATE TABLE IF NOT EXISTS guest_preferences (
    id VARCHAR(64) PRIMARY KEY,
    guest_id VARCHAR(64) NOT NULL UNIQUE,
    dietary_flags JSON, -- ['vegetarian', 'gluten_free', 'low_sodium']
    accessibility_needs JSON, -- ['wheelchair', 'low_noise', 'braille']
    notifications_opt_in INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guest_id) REFERENCES plan_guests(id) ON DELETE CASCADE
);

