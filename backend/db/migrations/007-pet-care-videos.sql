-- ============================================================================
-- 007: Módulo «Videos para cuidar a tu mascota» y «Pregúntale al video»
-- ============================================================================

CREATE TABLE IF NOT EXISTS pet_videos (
    id VARCHAR(64) PRIMARY KEY,
    youtube_id VARCHAR(32) NOT NULL UNIQUE,
    youtube_url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    channel_title VARCHAR(255) NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    thumbnail_url TEXT NULL,
    species VARCHAR(64) NOT NULL DEFAULT 'general',
    topic VARCHAR(64) NOT NULL DEFAULT 'cuidado_general',
    summary TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    approved_by VARCHAR(64) NULL,
    approved_at TIMESTAMP NULL,
    created_by VARCHAR(64) NULL,
    analysis_raw_json TEXT NULL,
    broken_reports_count INTEGER DEFAULT 0,
    last_broken_report_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pet_videos_status ON pet_videos (status);
CREATE INDEX IF NOT EXISTS idx_pet_videos_species ON pet_videos (species);
CREATE INDEX IF NOT EXISTS idx_pet_videos_topic ON pet_videos (topic);
CREATE INDEX IF NOT EXISTS idx_pet_videos_ytid ON pet_videos (youtube_id);

CREATE TABLE IF NOT EXISTS pet_video_fragments (
    id VARCHAR(64) PRIMARY KEY,
    video_id VARCHAR(64) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    start_seconds INTEGER NOT NULL,
    end_seconds INTEGER NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'approved',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES pet_videos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pet_frg_vid ON pet_video_fragments (video_id);
CREATE INDEX IF NOT EXISTS idx_pet_frg_status ON pet_video_fragments (status);

CREATE TABLE IF NOT EXISTS pet_video_broken_reports (
    id VARCHAR(64) PRIMARY KEY,
    video_id VARCHAR(64) NOT NULL,
    reported_by VARCHAR(64) NULL,
    reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES pet_videos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pet_broken_vid ON pet_video_broken_reports (video_id);

