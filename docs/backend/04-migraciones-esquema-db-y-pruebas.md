# 04 — Migraciones SQL (`008`–`010`), Base de Datos Dual y Suite de 117 Pruebas

## 1. Adaptador de Base de Datos Dual e Idempotente (`database.js`)

Ubicación: `backend/src/shared/config/database.js`

El backend soporta dos motores de base de datos con una interfaz SQL unificada (`query`, `execute`, `withTransaction`):

1. **Supabase PostgreSQL en la Nube (`DB_CLIENT=pg`)**:
   - Conectado al esquema privado **`app_private`** (`search_path = app_private, public`) mediante `SUPABASE_DB_URL`.
   - Cuenta con **29 tablas** activas verificadas en vivo.
2. **SQLite Nativo en Memoria (`node:sqlite`, `:memory:`)**:
   - Utilizado automáticamente cuando `NODE_ENV=test` para que las 117 pruebas de integración corran en pocos segundos sin requerir red externa ni contaminar datos de producción.
   - `runMigrations()` ejecuta sentencia por sentencia y maneja de forma idempotente `ALTER TABLE ... ADD COLUMN` cuando una columna ya existe en SQLite (`duplicate column name`).

---

## 2. Nuevas Migraciones SQL Implementadas

### Migración `008-pet-verification-evidence.sql`
- **`place_pet_evidence`**:
  - Almacena cada evidencia de política Pet-Friendly por establecimiento (`id`, `place_id`, `source_type`, `access_status`, `conditions_json`, `evidence_ref`, `verified_by`, `status`, `checked_at`, `expires_at`).
- **`automation_events`**:
  - Cola persistente e idempotente (`dedupe_key UNIQUE`) de eventos para **n8n** y auditoría de vigencia (`event_type`, `place_id`, `status`, `payload_json`).

### Migración `009-multisource-places-architecture.sql`
- **`place_external_links`**:
  - Resolución determinista de identidad entre `place_id` interno y proveedores externos (`provider`, `external_id`, `shared_origin`, `match_status` en `'linked' | 'ambiguous' | 'rejected'`).
  - Índice único `(provider, external_id)` para impedir que un mismo ID externo se asigne por error a dos sucursales.
- **`place_photos` (estructura base)**:
  - Catálogo de fotografías asociadas a un `place_id` concreto con atribución obligatoria (`provider`, `photo_url`, `author`, `source_page_url`, `license`, `is_cover`, `approval_status`, `approved_by`, `reviewed_at`).

### Migración `010-place-photos-storage-pipeline.sql`
- **Extensión de `place_photos` para Supabase Storage**:
  - Añade columnas `branch_label`, `attribution_text`, `license_url`, `attribution_requirements`, `captured_at`, `photo_type` (`fachada`, `interior`, `terraza`, `plato`, `otro`), `content_hash` (`SHA-256`), `storage_bucket`, `storage_path`, `mime_type`, `byte_size`, `width`, `height`, `exif_stripped` y `alt_text`.
  - Crea el índice único `idx_place_photos_place_content_hash` sobre `(place_id, content_hash)` para deduplicación binaria automática.
- **`photo_import_batches`**:
  - Registro auditable de lotes de importación (`id`, `status`, `source_manifest`, `base_dir`, `total_items`, `imported_count`, `skipped_count`, `pending_count`, `failed_count`, `last_processed_index`, `processed_keys_json`, `report_json`).

---

## 3. Suite de 117 Pruebas Automatizadas (`backend/test/`)

Todas las pruebas se ejecutan con el runner nativo de Node.js (`npm --prefix backend test`):

| Archivo de Prueba | Casos | Cobertura Principal |
| :--- | :---: | :--- |
| `test/enterprise-features.test.js` | **43** | Trazabilidad `x-request-id`, métricas Prometheus, transacciones ACID, PBKDF2, rotación JWT, Gemini Multi-Turn, webhooks HMAC, Hash Chain Ledger, notificaciones Outbox, códigos QR firmados, huella de carbono MINAE, motor financiero BCCR, confort climático IMN, feriados CR, monitor sísmico OVSICORI y SINPE Móvil. |
| `test/system-complete.test.js` | **40** | Autenticación, eventos, mesas sociales (`social-dining`), radar gastronómico, telemetría en vivo, rescate urbano, centro veterinario, accesibilidad, sinergia y panel de cliente. |
| `test/pet-care-videos.test.js` | **15** | Catálogo de videos verificados de bienestar animal, rotación en vivo, asistente **Bruno** («Pregúntale al video») con **Google Gemini** y fallback heurístico, reporte de enlaces rotos y moderación admin. |
| `test/pet-friendly-real-search.test.js` | **7** | Validación estricta de coordenadas/radio OSM, preservación de estados `null`/`unknown`, deduplicación por sucursal, motor de compatibilidad por especie/tamaño/terraza, cliente Google Places con FieldMask, endpoints admin de políticas pet-friendly y emisión idempotente de eventos n8n. |
| `test/multisource-places.test.js` | **7** | Coordinador multi-fuente, bloqueo de operaciones de pago en Foursquare/Geoapify, bloqueo de fotos sin licencia en Wikimedia, aislamiento de sucursales homónimas, caché por `place_id` y control de tasa (`ProviderRateGuard`). |
| `test/photo-storage-pipeline.test.js` | **5** | Eliminación de metadatos EXIF `APP1`, validación de dimensiones mínimas, bloqueo de *Path Traversal* y *SSRF*, rechazo sin fallback silencioso cuando falta `SUPABASE_SERVICE_ROLE_KEY`, importación por lotes con reanudación, compensación Storage ↔ BD, subida Base64 y protección HTTP `requireAdmin`. |
| **Total** | **117** | **117 aprobadas / 0 fallos** |
