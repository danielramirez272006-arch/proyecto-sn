const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../../shared/config/env-config');
const { query, execute } = require('../../shared/config/database');
const {
  VALID_PHOTO_TYPES,
  resolveSafeLocalPath,
  inspectAndSanitizeImage,
} = require('./photo-security-validator');
const supabasePhotoStorage = require('./supabase-photo-storage');

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseManifestFile(manifestPath) {
  const absPath = path.resolve(manifestPath);
  if (!fs.existsSync(absPath)) {
    const err = new Error(`Manifiesto no encontrado: ${absPath}`);
    err.code = 'MANIFEST_NOT_FOUND';
    throw err;
  }

  const raw = fs.readFileSync(absPath, 'utf8');
  if (absPath.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : parsed?.items;
    if (!Array.isArray(items)) {
      const err = new Error('El manifiesto JSON debe ser un arreglo o un objeto con propiedad items.');
      err.code = 'INVALID_MANIFEST';
      throw err;
    }
    return items;
  }

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const items = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    items.push(row);
  }
  return items;
}

function validateHttpsOptional(rawUrl, fieldName) {
  if (!rawUrl || String(rawUrl).trim() === '') return null;
  let parsed;
  try {
    parsed = new URL(String(rawUrl).trim());
  } catch {
    const err = new Error(`${fieldName} no es una URL válida.`);
    err.code = 'INVALID_METADATA_URL';
    throw err;
  }
  if (parsed.protocol !== 'https:') {
    const err = new Error(`${fieldName} debe usar protocolo HTTPS.`);
    err.code = 'INSECURE_METADATA_URL';
    throw err;
  }
  return parsed.toString();
}

class PhotoBatchImporter {
  constructor(deps = {}) {
    this.storage = deps.storage || supabasePhotoStorage;
    this.maxBytes = Number(deps.maxBytes || env.photoPipeline?.maxBytes || 8 * 1024 * 1024);
    this.minWidth = Number(deps.minWidth || env.photoPipeline?.minWidth || 400);
    this.minHeight = Number(deps.minHeight || env.photoPipeline?.minHeight || 300);
    this.defaultConcurrency = Number(deps.concurrency || env.photoPipeline?.batchConcurrency || 2);
  }

  async _placeExists(placeId) {
    const rows = await query('SELECT id, name FROM places WHERE id = ?', [placeId]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async _findExistingByHash(placeId, contentHash) {
    const rows = await query(
      'SELECT id, approval_status, storage_bucket, storage_path FROM place_photos WHERE place_id = ? AND content_hash = ?',
      [placeId, contentHash]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async _loadBatchState(batchId) {
    const rows = await query('SELECT * FROM photo_import_batches WHERE batch_id = ?', [batchId]);
    if (!rows || rows.length === 0) return null;
    const row = rows[0];
    let processedKeys = [];
    try {
      processedKeys = row.processed_keys_json ? JSON.parse(row.processed_keys_json) : [];
    } catch {
      processedKeys = [];
    }
    return { ...row, processedKeys: new Set(processedKeys) };
  }

  async _saveBatchState({
    batchId,
    status,
    sourceManifest,
    baseDir,
    totalItems,
    importedCount,
    skippedCount,
    pendingCount,
    failedCount,
    lastProcessedIndex,
    processedKeys,
    report,
  }) {
    const now = new Date().toISOString();
    const existing = await query('SELECT batch_id FROM photo_import_batches WHERE batch_id = ?', [batchId]);
    const keysJson = JSON.stringify(Array.from(processedKeys));
    const reportJson = JSON.stringify(report);

    if (existing && existing.length > 0) {
      await execute(
        `UPDATE photo_import_batches
         SET status = ?, imported_count = ?, skipped_count = ?, pending_count = ?, failed_count = ?,
             last_processed_index = ?, processed_keys_json = ?, report_json = ?, updated_at = ?
         WHERE batch_id = ?`,
        [status, importedCount, skippedCount, pendingCount, failedCount, lastProcessedIndex, keysJson, reportJson, now, batchId]
      );
    } else {
      await execute(
        `INSERT INTO photo_import_batches
         (batch_id, status, source_manifest, base_dir, total_items, imported_count, skipped_count, pending_count, failed_count, last_processed_index, processed_keys_json, report_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          batchId,
          status,
          sourceManifest || null,
          baseDir || null,
          totalItems,
          importedCount,
          skippedCount,
          pendingCount,
          failedCount,
          lastProcessedIndex,
          keysJson,
          reportJson,
          now,
          now,
        ]
      );
    }
  }

  async _validateItemPreflight(item, baseDir) {
    const placeId = String(item.place_id || '').trim();
    const relFile = String(item.file || item.archivo || '').trim();
    const author = String(item.author || item.autor || '').trim();
    const license = String(item.license || item.licencia || '').trim();
    const photoType = String(item.photo_type || item.tipo || 'otro').trim().toLowerCase();

    if (!placeId) {
      const err = new Error('place_id es obligatorio (no se asocia por nombre aproximado).');
      err.code = 'MISSING_PLACE_ID';
      throw err;
    }
    if (!relFile) {
      const err = new Error('file es obligatorio.');
      err.code = 'MISSING_FILE';
      throw err;
    }
    if (!author) {
      const err = new Error('author / crédito es obligatorio.');
      err.code = 'MISSING_AUTHOR';
      throw err;
    }
    if (!license) {
      const err = new Error('license / autorización es obligatorio.');
      err.code = 'MISSING_LICENSE';
      throw err;
    }
    if (!VALID_PHOTO_TYPES.has(photoType)) {
      const err = new Error(`photo_type inválido (${photoType}). Valores: ${Array.from(VALID_PHOTO_TYPES).join(', ')}`);
      err.code = 'INVALID_PHOTO_TYPE';
      throw err;
    }

    const sourcePageUrl = validateHttpsOptional(item.source_page_url || item.pagina_origen, 'source_page_url');
    const licenseUrl = validateHttpsOptional(item.license_url || item.enlace_licencia, 'license_url');
    const safePath = resolveSafeLocalPath(baseDir, relFile);

    const place = await this._placeExists(placeId);
    if (!place) {
      const err = new Error(`El restaurante ${placeId} no existe en la base de datos.`);
      err.code = 'PLACE_NOT_FOUND';
      throw err;
    }

    return {
      placeId,
      placeName: place.name,
      relFile,
      safePath,
      branchLabel: item.branch_label || item.sucursal || null,
      author,
      attributionText: item.attribution_text || item.credito || `${author} (${license})`,
      sourcePageUrl,
      license,
      licenseUrl,
      attributionRequirements: item.attribution_requirements || item.condiciones_atribucion || null,
      capturedAt: item.captured_at || item.fecha_foto || null,
      photoType,
      isCover: item.is_cover === true || String(item.is_cover).toLowerCase() === 'true' || String(item.is_cover) === '1',
      altText: item.alt_text || `${place.name} - ${photoType}`,
    };
  }

  /**
   * Ejecuta o simula (dryRun=true por defecto) la importación por lotes de fotografías.
   */
  async importBatch({
    manifestPath = null,
    items: directItems = null,
    baseDir,
    dryRun = true,
    batchId = null,
    resume = false,
    concurrency = this.defaultConcurrency,
  } = {}) {
    const rawItems = Array.isArray(directItems) ? directItems : parseManifestFile(manifestPath);
    const activeBatchId = batchId || `batch_${crypto.randomBytes(6).toString('hex')}`;
    const safeConcurrency = Math.max(1, Math.min(5, Math.round(Number(concurrency) || 2)));

    let priorState = null;
    if (resume && batchId) {
      priorState = await this._loadBatchState(batchId);
    }

    const processedKeys = priorState ? priorState.processedKeys : new Set();
    let importedCount = priorState ? priorState.imported_count : 0;
    let skippedCount = priorState ? priorState.skipped_count : 0;
    let pendingCount = priorState ? priorState.pending_count : 0;
    let failedCount = priorState ? priorState.failed_count : 0;
    let lastProcessedIndex = priorState ? priorState.last_processed_index : -1;
    let blockedByProvider = false;

    const details = [];

    const processOne = async (rawItem, index) => {
      if (blockedByProvider) return;
      const itemKey = `${index}:${rawItem?.place_id || ''}:${rawItem?.file || rawItem?.archivo || ''}`;
      if (resume && processedKeys.has(itemKey)) {
        skippedCount += 1;
        details.push({ index, status: 'skipped_resumed', reason: 'Ya procesado en ejecución previa.' });
        return;
      }

      try {
        const meta = await this._validateItemPreflight(rawItem, baseDir);
        const fileBuffer = fs.readFileSync(meta.safePath);
        const inspected = inspectAndSanitizeImage(fileBuffer, {
          maxBytes: this.maxBytes,
          minWidth: this.minWidth,
          minHeight: this.minHeight,
        });

        const existing = await this._findExistingByHash(meta.placeId, inspected.contentHash);
        if (existing) {
          skippedCount += 1;
          processedKeys.add(itemKey);
          details.push({
            index,
            place_id: meta.placeId,
            file: meta.relFile,
            status: 'skipped_duplicate',
            existing_photo_id: existing.id,
            existing_moderation_status: existing.approval_status,
          });
          return;
        }

        if (dryRun) {
          pendingCount += 1;
          details.push({
            index,
            place_id: meta.placeId,
            file: meta.relFile,
            status: 'dry_run_valid',
            content_hash: inspected.contentHash,
            dimensions: `${inspected.width}x${inspected.height}`,
            exif_stripped: inspected.exifStripped,
          });
          return;
        }

        // 1. Subir primero al bucket privado (pendiente de revisión humana)
        const uploaded = await this.storage.uploadPrivatePending({
          placeId: meta.placeId,
          contentHash: inspected.contentHash,
          ext: inspected.ext,
          buffer: inspected.sanitizedBuffer,
          contentType: inspected.mimeType,
        });

        // 2. Registrar en PostgreSQL (nunca auto-aprobar)
        const photoId = `ph_${crypto.randomBytes(8).toString('hex')}`;
        const now = new Date().toISOString();
        try {
          await execute(
            `INSERT INTO place_photos
             (id, place_id, provider, photo_url, author, source_page_url, license, is_cover, approval_status,
              branch_label, attribution_text, license_url, attribution_requirements, captured_at, photo_type,
              content_hash, storage_bucket, storage_path, mime_type, byte_size, width, height, exif_stripped, alt_text, created_at, updated_at)
             VALUES (?, ?, 'gotox_owner', ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              photoId,
              meta.placeId,
              `storage://${uploaded.bucket}/${uploaded.path}`,
              meta.author,
              meta.sourcePageUrl,
              meta.license,
              meta.isCover ? 1 : 0,
              meta.branchLabel,
              meta.attributionText,
              meta.licenseUrl,
              meta.attributionRequirements,
              meta.capturedAt,
              meta.photoType,
              inspected.contentHash,
              uploaded.bucket,
              uploaded.path,
              inspected.mimeType,
              inspected.byteSize,
              inspected.width,
              inspected.height,
              inspected.exifStripped ? 1 : 0,
              meta.altText,
              now,
              now,
            ]
          );
        } catch (dbErr) {
          // Compensación si falla BD después de subir a Storage (solo si este lote creó el objeto)
          let compensated = false;
          if (!uploaded.alreadyExisted) {
            try {
              await this.storage.removeObject(uploaded.bucket, uploaded.path);
              compensated = true;
            } catch {
              compensated = false;
            }
          }
          const wrapped = new Error(`Fallo al registrar en BD tras subir a Storage: ${dbErr.message}`);
          wrapped.code = compensated ? 'DB_INSERT_FAILED_COMPENSATED' : 'ORPHAN_IN_STORAGE_DB_FAILED';
          throw wrapped;
        }

        importedCount += 1;
        pendingCount += 1;
        processedKeys.add(itemKey);
        details.push({
          index,
          photo_id: photoId,
          place_id: meta.placeId,
          file: meta.relFile,
          status: 'imported_pending_review',
          storage_bucket: uploaded.bucket,
          storage_path: uploaded.path,
          content_hash: inspected.contentHash,
        });
      } catch (err) {
        if (err?.code === 'SUPABASE_STORAGE_FORBIDDEN' || err?.status === 401 || err?.status === 403) {
          blockedByProvider = true;
        }
        failedCount += 1;
        details.push({
          index,
          place_id: rawItem?.place_id || null,
          file: rawItem?.file || rawItem?.archivo || null,
          status: 'failed',
          code: err?.code || 'IMPORT_ERROR',
          error: err?.message || 'Error importando fotografía.',
        });
      } finally {
        lastProcessedIndex = Math.max(lastProcessedIndex, index);
      }
    };

    // Lectura progresiva por ventanas de concurrencia limitada
    for (let start = 0; start < rawItems.length; start += safeConcurrency) {
      if (blockedByProvider) break;
      const chunk = rawItems.slice(start, start + safeConcurrency);
      await Promise.all(chunk.map((item, offset) => processOne(item, start + offset)));
    }

    const finalStatus = blockedByProvider
      ? 'blocked'
      : dryRun
      ? failedCount > 0
        ? 'partial'
        : 'dry_run'
      : failedCount > 0
      ? 'partial'
      : 'completed';

    const report = {
      batch_id: activeBatchId,
      dry_run: dryRun,
      status: finalStatus,
      total_items: rawItems.length,
      imported_count: importedCount,
      skipped_count: skippedCount,
      pending_count: pendingCount,
      failed_count: failedCount,
      last_processed_index: lastProcessedIndex,
      details,
    };

    if (!dryRun) {
      await this._saveBatchState({
        batchId: activeBatchId,
        status: finalStatus,
        sourceManifest: manifestPath,
        baseDir,
        totalItems: rawItems.length,
        importedCount,
        skippedCount,
        pendingCount,
        failedCount,
        lastProcessedIndex,
        processedKeys,
        report,
      });
    }

    return report;
  }

  /**
   * Verifica coherencia entre registros de place_photos y objetos reales en Supabase Storage sin borrar contenido ajeno.
   */
  async reconcileStorageAndDb() {
    const rows = await query(
      `SELECT id, place_id, approval_status, storage_bucket, storage_path FROM place_photos WHERE storage_path IS NOT NULL`
    );

    const missingInStorage = [];
    const checked = [];

    for (const row of rows || []) {
      const bucket = row.storage_bucket || this.storage.privateBucket;
      const exists = await this.storage.exists(bucket, row.storage_path);
      if (!exists) {
        missingInStorage.push({
          photo_id: row.id,
          place_id: row.place_id,
          approval_status: row.approval_status,
          bucket,
          storage_path: row.storage_path,
        });
      } else {
        checked.push(row.id);
      }
    }

    return {
      total_checked: (rows || []).length,
      healthy_count: checked.length,
      missing_in_storage: missingInStorage,
    };
  }
}

module.exports = new PhotoBatchImporter();
module.exports.PhotoBatchImporter = PhotoBatchImporter;
module.exports.parseManifestFile = parseManifestFile;
