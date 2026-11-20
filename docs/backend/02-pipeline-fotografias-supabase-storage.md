# 02 — Pipeline de Fotografías Verificadas y Supabase Storage

## 1. Diseño de Seguridad de Doble Bucket

Para garantizar que ninguna fotografía sin derechos verificados, con metadatos GPS privados o asignada a la sucursal equivocada llegue al público, el backend implementa una arquitectura de **doble bucket en Supabase Storage** (`backend/src/modules/places/supabase-photo-storage.js`):

1. **Bucket Privado de Revisión (`gotox-place-photos-private`, `public: false`)**:
   - Destino obligatorio de toda fotografía recién subida o importada por lotes.
   - Estado inicial en PostgreSQL (`place_photos`): `approval_status = 'pending_review'`.
   - Solo los administradores autenticados (`requireAdmin`) pueden previsualizar estas imágenes mediante URLs firmadas temporales (`createSignedReviewUrl`, TTL de 15 minutos).
   - **Nunca** se expone en endpoints públicos (`/api/places/multisource/search` filtra estrictamente `approval_status = 'approved'`).
2. **Bucket Público de Producción (`gotox-place-photos-public`, `public: true`)**:
   - Solo recibe imágenes cuando un administrador aprueba explícitamente un registro pendiente (`POST /api/admin/places/photos/:photoId/approve`) tras verificar sucursal, autor y licencia.
   - En ese momento, `supabasePhotoStorage.promoteToPublic` copia el archivo sanitizado al bucket público y actualiza `photo_url` y `storage_bucket` en PostgreSQL.

> **Sin fallback silencioso en producción:** Si `SUPABASE_SERVICE_ROLE_KEY` está ausente o contiene una clave pública (`anon` / `sb_publishable_`), `supabasePhotoStorage` bloquea la escritura con el código `SUPABASE_STORAGE_NOT_CONFIGURED` (`503`) en lugar de fingir que el archivo se guardó en la nube.

---

## 2. Validador Binario y Limpieza EXIF (`photo-security-validator.js`)

Ubicación: `backend/src/modules/places/photo-security-validator.js`

Todas las imágenes (tanto del importador por lotes CLI como del endpoint de subida desde el navegador) pasan por `inspectAndSanitizeImage(buffer)`:

1. **Validación de *Magic Bytes***:
   - Inspecciona las cabeceras binarias reales: JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`) y WebP (`RIFF....WEBP`). Rechaza cualquier archivo cuya extensión no coincida o cuyo formato sea ejecutable/SVG (`UNSUPPORTED_IMAGE_FORMAT`).
2. **Control de Tamaño y Dimensiones Reales**:
   - Tamaño máximo por archivo: `8 MB` (`PHOTO_MAX_FILE_BYTES`).
   - Decodifica las cabeceras `SOF0/SOF2` (JPEG), `IHDR` (PNG) y `VP8/VP8L/VP8X` (WebP) para exigir dimensiones mínimas de **`400 x 300 px`** (`IMAGE_TOO_SMALL`).
3. **Eliminación de Metadatos EXIF / GPS (`stripJpegExif` / `stripPngMetadata`)**:
   - En archivos JPEG, remueve todos los segmentos `APP1` (`0xFFE1`, donde residen EXIF y coordenadas GPS de la cámara) y comentarios `COM` (`0xFFFE`) sin recomprimir ni degradar los píxeles.
   - En archivos PNG, remueve chunks ancilares de metadatos (`eXIf`, `tEXt`, `zTXt`, `iTXt`, `tIME`).
4. **Hash Criptográfico de Contenido (`contentHash`)**:
   - Calcula el `SHA-256` del buffer ya sanitizado para evitar duplicados exactos por restaurante (`idx_place_photos_place_content_hash`).
5. **Protección contra *Path Traversal* y *SSRF***:
   - `resolveSafeLocalPath(baseDir, relPath)` resuelve enlaces simbólicos con `fs.realpathSync` y bloquea cualquier intento de salir del directorio base permitido (`PATH_TRAVERSAL_BLOCKED`, `SYMLINK_ESCAPE_BLOCKED`).
   - `validateSafeExternalImageUrl(url, allowedHosts)` exige `https:`, verifica lista blanca de dominios y resuelve DNS bloqueando rangos IPv4/IPv6 privados o loopback (`127.0.0.0/8`, `10.0.0.0/8`, `169.254.0.0/16`, `192.168.0.0/16`, `::1`, `fc00::/7`).

---

## 3. Importador por Lotes y Compensación Transaccional (`photo-batch-importer.js`)

Ubicación: `backend/src/modules/places/photo-batch-importer.js`

- **Modo `dry-run` por defecto**: Valida manifiesto CSV/JSON, existencia real del `place_id` en PostgreSQL, presencia obligatoria de `author` y `license`, dimensiones y limpieza EXIF sin escribir en Supabase Storage ni en la base de datos.
- **Compensación automática Storage ↔ PostgreSQL**:
  - Si un archivo se sube al bucket privado de Supabase Storage pero la inserción posterior en `place_photos` falla, el importador elimina inmediatamente el objeto recién creado en Storage (`DB_INSERT_FAILED_COMPENSATED`) para no dejar archivos huérfanos.
- **Persistencia de lotes y reanudación (`photo_import_batches`)**:
  - Cada ejecución guarda su progreso (`processed_keys_json`, `report_json`, `last_processed_index`). Con `--resume --batch-id=<id>`, retoma exactamente desde el último elemento sin reprocesar los ya importados.
- **Reconciliación (`reconcileStorageAndDb`)**:
  - Cruza las filas de `place_photos` contra los objetos reales en Supabase Storage y reporta cualquier discrepancia.

### Comandos CLI del Pipeline de Fotos
```bash
# 1. Generar un CSV borrador asistido por IA a partir de una carpeta de fotos
npm --prefix backend run photos:draft-csv -- --dir=./mis-fotos --out=./borrador.csv

# 2. Simular importación (dry-run seguro, no modifica Storage ni BD)
npm --prefix backend run photos:import -- --manifest=backend/src/modules/places/templates/photo-import-manifest.example.csv --base-dir=./mis-fotos

# 3. Ejecutar importación real hacia el bucket privado (pending_review)
npm --prefix backend run photos:import -- --manifest=./borrador.csv --base-dir=./mis-fotos --commit

# 4. Reconciliar estado entre Supabase Storage y PostgreSQL
npm --prefix backend run photos:reconcile
```

---

## 4. Endpoints Administrativos de Moderación y Subida Directa

Todos los endpoints están protegidos por `requireAdmin`:

| Método y Ruta | Descripción |
| :--- | :--- |
| `GET /api/admin/places/photos/pending` | Lista fotografías en `pending_review` generando una URL firmada privada (`signed_review_url`) para cada imagen. |
| `POST /api/admin/places/photos/upload` | Recibe `{ place_id, branch_label, photo_type, author, license, is_cover, image_base64 }` desde el navegador, sanitiza EXIF, sube al bucket privado y crea el registro `pending_review`. |
| `POST /api/admin/places/photos/:photoId/approve` | Verifica que la foto tenga licencia, la promueve al bucket público (`gotox-place-photos-public`), invalida cachés y la marca como `approved`. |
| `POST /api/admin/places/photos/:photoId/reject` | Marca la fotografía como `rejected` o `retracted`; si estaba en el bucket público, la elimina de él e invalida cachés. |
| `POST /api/admin/places/photos/reconcile` | Ejecuta la auditoría de integridad entre PostgreSQL y Supabase Storage. |
