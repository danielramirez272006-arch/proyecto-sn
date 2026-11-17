-- ============================================================================
-- 008: Perfiles de Bóveda de Usuario y Mascotas Vinculadas
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_vaults (
    user_id VARCHAR(64) PRIMARY KEY,
    phone VARCHAR(64) NULL,
    zone VARCHAR(120) NULL,
    has_pet INTEGER DEFAULT 1,
    budget_level VARCHAR(32) DEFAULT 'medio',
    interests_json TEXT NULL,
    preferences_json TEXT NULL,
    vehicle_plate_digit INTEGER NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_pets (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    species VARCHAR(64) DEFAULT 'Canino',
    breed VARCHAR(120) DEFAULT 'Mestizo',
    weight_kg NUMERIC(6, 2) DEFAULT 15,
    age_years INTEGER DEFAULT 2,
    microchip_id VARCHAR(120) NULL,
    color_coat VARCHAR(80) NULL,
    allergies_text TEXT NULL,
    photo_url TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_pets_user ON user_pets (user_id);
