-- Migración 009: Identidades externas multi-fuente y registro de fotografías autorizadas

CREATE TABLE IF NOT EXISTS place_external_links (
    id VARCHAR(64) PRIMARY KEY,
    place_id VARCHAR(64) NOT NULL,
    provider VARCHAR(48) NOT NULL, -- 'openstreetmap' | 'geoapify' | 'foursquare' | 'wikimedia_commons'
    external_id VARCHAR(128) NOT NULL,
    shared_origin VARCHAR(48), -- ej. 'openstreetmap' cuando Geoapify comparte origen OSM
    match_status VARCHAR(32) NOT NULL DEFAULT 'linked', -- 'linked' | 'ambiguous' | 'rejected'
    match_confidence REAL DEFAULT 1.0,
    notes TEXT,
    reviewed_by VARCHAR(64),
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (provider, external_id),
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_external_links_place ON place_external_links (place_id, match_status);

CREATE TABLE IF NOT EXISTS place_photos (
    id VARCHAR(64) PRIMARY KEY,
    place_id VARCHAR(64) NOT NULL,
    provider VARCHAR(48) NOT NULL, -- 'gotox_owner' | 'wikimedia_commons' | 'foursquare'
    external_photo_id VARCHAR(128),
    photo_url TEXT NOT NULL,
    author VARCHAR(160),
    source_page_url TEXT,
    license VARCHAR(120),
    is_cover INTEGER NOT NULL DEFAULT 0,
    approval_status VARCHAR(24) NOT NULL DEFAULT 'pending_review', -- 'pending_review' | 'approved' | 'rejected' | 'retracted'
    approved_by VARCHAR(64),
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_place_photos_place_status ON place_photos (place_id, approval_status);
