-- Migración 002: Planes de Salida, Opciones de Itinerario y Paradas Ordenadas

CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(16) NOT NULL UNIQUE, -- Código compartible ej. "PLAN-CR-772"
    title VARCHAR(180) NOT NULL,
    organizer_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'draft', 'active', 'confirmed', 'cancelled'
    revision INT NOT NULL DEFAULT 1, -- Control de concurrencia optimista
    selected_option_id VARCHAR(64),
    timezone VARCHAR(40) DEFAULT 'America/Costa_Rica',
    budget_crc INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plans_code ON plans (code);
CREATE INDEX IF NOT EXISTS idx_plans_organizer ON plans (organizer_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans (status);

CREATE TABLE IF NOT EXISTS plan_options (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL,
    title VARCHAR(160) NOT NULL,
    option_order INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'alternative', 'discarded'
    estimated_cost_crc INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_options_plan ON plan_options (plan_id);

CREATE TABLE IF NOT EXISTS plan_stops (
    id VARCHAR(64) PRIMARY KEY,
    option_id VARCHAR(64) NOT NULL,
    place_id VARCHAR(64) NOT NULL,
    event_id VARCHAR(64),
    stop_order INT NOT NULL,
    start_time VARCHAR(32) NOT NULL, -- UTC ISO
    end_time VARCHAR(32) NOT NULL,   -- UTC ISO
    confirmed_snapshot JSON, -- Copia inmutable de lugar/evento al momento de confirmar
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (option_id) REFERENCES plan_options(id) ON DELETE CASCADE,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stops_option ON plan_stops (option_id);
CREATE INDEX IF NOT EXISTS idx_stops_order ON plan_stops (option_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_stops_event ON plan_stops (event_id);

