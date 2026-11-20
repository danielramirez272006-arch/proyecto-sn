-- ============================================================================
-- Migración 011: Bóveda Persistente de Usuarios/Mascotas e Historial de Chat IA
-- Compatible con Supabase PostgreSQL (app_private) y SQLite
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_vaults (
    user_id VARCHAR(64) PRIMARY KEY,
    pets_json TEXT NOT NULL DEFAULT '[]',
    vehicle_plate_digit INTEGER NULL,
    saved_routes_json TEXT NOT NULL DEFAULT '[]',
    expenses_total_crc NUMERIC(12, 2) NOT NULL DEFAULT 0,
    badges_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL,
    user_id VARCHAR(64) NULL,
    provider VARCHAR(32) NOT NULL DEFAULT 'gemini',
    role VARCHAR(32) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user ON ai_chat_messages(user_id, created_at);
