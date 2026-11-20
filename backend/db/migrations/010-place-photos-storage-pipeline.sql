-- Migración 010: Pipeline ampliable de fotografías en Supabase Storage y lotes de importación

ALTER TABLE place_photos ADD COLUMN branch_label VARCHAR(160);
ALTER TABLE place_photos ADD COLUMN attribution_text TEXT;
ALTER TABLE place_photos ADD COLUMN license_url TEXT;
ALTER TABLE place_photos ADD COLUMN attribution_requirements TEXT;
ALTER TABLE place_photos ADD COLUMN captured_at VARCHAR(32);
ALTER TABLE place_photos ADD COLUMN photo_type VARCHAR(24) DEFAULT 'otro';
ALTER TABLE place_photos ADD COLUMN content_hash VARCHAR(64);
ALTER TABLE place_photos ADD COLUMN storage_bucket VARCHAR(80);
ALTER TABLE place_photos ADD COLUMN storage_path TEXT;
ALTER TABLE place_photos ADD COLUMN mime_type VARCHAR(32);
ALTER TABLE place_photos ADD COLUMN byte_size INTEGER;
ALTER TABLE place_photos ADD COLUMN width INTEGER;
ALTER TABLE place_photos ADD COLUMN height INTEGER;
ALTER TABLE place_photos ADD COLUMN exif_stripped INTEGER DEFAULT 0;
ALTER TABLE place_photos ADD COLUMN alt_text TEXT;
ALTER TABLE place_photos ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_place_photos_place_hash ON place_photos (place_id, content_hash);

CREATE TABLE IF NOT EXISTS photo_import_batches (
    batch_id VARCHAR(64) PRIMARY KEY,
    status VARCHAR(24) NOT NULL DEFAULT 'running', -- 'dry_run' | 'running' | 'completed' | 'partial' | 'blocked' | 'failed'
    source_manifest TEXT,
    base_dir TEXT,
    total_items INTEGER NOT NULL DEFAULT 0,
    imported_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    pending_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    last_processed_index INTEGER NOT NULL DEFAULT -1,
    processed_keys_json TEXT,
    report_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
