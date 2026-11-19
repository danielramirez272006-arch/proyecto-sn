const crypto = require('crypto');
const { query, execute } = require('../../shared/config/database');
const auditService = require('../../shared/audit/audit-service');
const supabasePhotoStorage = require('./supabase-photo-storage');
const cacheManager = require('../../shared/cache/ttl-cache-service');

function badInput(code, message) {
  const err = new Error(message);
  err.code = code;
  err.status = 400;
  return err;
}

class MultisourceAdminService {
  async resolveIdentity({ place_id, provider, external_id, match_status = 'linked', shared_origin = null, notes = null, admin_id }) {
    if (!place_id || !provider || !external_id) {
      throw badInput('INVALID_IDENTITY_LINK', 'place_id, provider y external_id son obligatorios.');
    }
    const allowedStatus = ['linked', 'ambiguous', 'rejected'];
    if (!allowedStatus.includes(match_status)) {
      throw badInput('INVALID_MATCH_STATUS', `match_status debe ser: ${allowedStatus.join(', ')}`);
    }

    const now = new Date().toISOString();
    const existing = await query(
      'SELECT id FROM place_external_links WHERE provider = ? AND external_id = ?',
      [provider, external_id]
    );

    let id;
    if (existing && existing.length > 0) {
      id = existing[0].id;
      await execute(
        `UPDATE place_external_links
         SET place_id = ?, match_status = ?, shared_origin = ?, notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?`,
        [place_id, match_status, shared_origin, notes, admin_id || 'admin', now, now, id]
      );
    } else {
      id = `lnk_${crypto.randomBytes(8).toString('hex')}`;
      await execute(
        `INSERT INTO place_external_links (id, place_id, provider, external_id, shared_origin, match_status, notes, reviewed_by, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, place_id, provider, external_id, shared_origin, match_status, notes, admin_id || 'admin', now]
      );
    }

    await auditService.record({
      actor: admin_id || 'admin',
      action: 'RESOLVE_PLACE_IDENTITY',
      resource: 'place_external_links',
      resourceId: id,
      details: { place_id, provider, external_id, match_status },
    }).catch(() => {});

    return { id, place_id, provider, external_id, match_status, reviewed_by: admin_id || 'admin', reviewed_at: now };
  }

  async approveOrRegisterPhoto({
    place_id,
    provider = 'gotox_owner',
    external_photo_id = null,
    photo_url,
    author = null,
    source_page_url = null,
    license,
    is_cover = true,
    approval_status = 'approved',
    admin_id,
  }) {
    if (!place_id || !photo_url) {
      throw badInput('INVALID_PHOTO_PAYLOAD', 'place_id y photo_url son obligatorios.');
    }
    if (approval_status === 'approved' && (!license || String(license).trim() === '')) {
      throw badInput('MISSING_PHOTO_LICENSE', 'No se puede aprobar una fotografía sin licencia o autorización explícita.');
    }

    const id = `ph_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO place_photos (id, place_id, provider, external_photo_id, photo_url, author, source_page_url, license, is_cover, approval_status, approved_by, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        place_id,
        provider,
        external_photo_id,
        photo_url,
        author,
        source_page_url,
        license || null,
        is_cover ? 1 : 0,
        approval_status,
        admin_id || 'admin',
        now,
      ]
    );

    await auditService.record({
      actor: admin_id || 'admin',
      action: 'APPROVE_PLACE_PHOTO',
      resource: 'place_photos',
      resourceId: id,
      details: { place_id, provider, approval_status, license },
    }).catch(() => {});

    return { id, place_id, provider, photo_url, author, license, approval_status, approved_by: admin_id || 'admin', reviewed_at: now };
  }

  async retractPhoto({ photo_id, reason = null, admin_id }) {
    if (!photo_id) {
      throw badInput('INVALID_PHOTO_ID', 'photo_id es obligatorio.');
    }
    const now = new Date().toISOString();
    await execute(
      `UPDATE place_photos SET approval_status = 'retracted', approved_by = ?, reviewed_at = ? WHERE id = ?`,
      [admin_id || 'admin', now, photo_id]
    );

    await auditService.record({
      actor: admin_id || 'admin',
      action: 'RETRACT_PLACE_PHOTO',
      resource: 'place_photos',
      resourceId: photo_id,
      details: { reason },
    }).catch(() => {});

    return { id: photo_id, approval_status: 'retracted', reviewed_by: admin_id || 'admin', reviewed_at: now };
  }

  async listAutomationEvents({ event_type = null, status = null, limit = 50 } = {}) {
    const clauses = [];
    const params = [];
    if (event_type) {
      clauses.push('event_type = ?');
      params.push(event_type);
    }
    if (status) {
      clauses.push('status = ?');
      params.push(status);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const safeLimit = Math.max(1, Math.min(100, Math.round(Number(limit) || 50)));
    const rows = await query(
      `SELECT * FROM automation_events ${where} ORDER BY created_at DESC LIMIT ?`,
      [...params, safeLimit]
    );
    return (rows || []).map((r) => ({
      ...r,
      payload: typeof r.payload_json === 'string' ? JSON.parse(r.payload_json) : r.payload_json,
    }));
  }

  _invalidatePhotoCaches(placeId) {
    if (typeof cacheManager?.delete === 'function') {
      cacheManager.delete(`place_photos:${placeId}`);
      cacheManager.delete('places_multisource_search');
    }
  }

  async listPendingPhotos({ limit = 50, storage = supabasePhotoStorage } = {}) {
    const safeLimit = Math.max(1, Math.min(100, Math.round(Number(limit) || 50)));
    const rows = await query(
      `SELECT pp.*, p.name AS restaurant_name
       FROM place_photos pp
       LEFT JOIN places p ON p.id = pp.place_id
       WHERE pp.approval_status = 'pending_review'
       ORDER BY pp.created_at ASC
       LIMIT ?`,
      [safeLimit]
    );

    const items = [];
    for (const row of rows || []) {
      let signedPreviewUrl = null;
      if (row.storage_bucket && row.storage_path && storage.isConfigured()) {
        try {
          signedPreviewUrl = await storage.createSignedReviewUrl(row.storage_bucket, row.storage_path);
        } catch {
          signedPreviewUrl = null;
        }
      }
      items.push({
        ...row,
        signed_review_url: signedPreviewUrl,
      });
    }
    return items;
  }

  async approvePendingPhoto({ photo_id, admin_id, is_cover = null, storage = supabasePhotoStorage }) {
    if (!photo_id) throw badInput('INVALID_PHOTO_ID', 'photo_id es obligatorio.');
    const rows = await query('SELECT * FROM place_photos WHERE id = ?', [photo_id]);
    if (!rows || rows.length === 0) {
      const err = new Error('Fotografía no encontrada.');
      err.code = 'PHOTO_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const row = rows[0];
    if (!row.license || String(row.license).trim() === '') {
      throw badInput('MISSING_PHOTO_LICENSE', 'No se puede aprobar sin licencia o autorización verificada.');
    }

    let finalUrl = row.photo_url;
    let finalBucket = row.storage_bucket;

    if (row.storage_path) {
      const promoted = await storage.promoteToPublic({
        objectPath: row.storage_path,
        contentType: row.mime_type || 'image/jpeg',
      });
      finalUrl = promoted.publicUrl;
      finalBucket = promoted.publicBucket;
    }

    const now = new Date().toISOString();
    const coverFlag = is_cover === null ? row.is_cover : is_cover ? 1 : 0;

    try {
      await execute(
        `UPDATE place_photos
         SET approval_status = 'approved', photo_url = ?, storage_bucket = ?, is_cover = ?, approved_by = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?`,
        [finalUrl, finalBucket, coverFlag, admin_id || 'admin', now, now, photo_id]
      );
    } catch (dbErr) {
      if (row.storage_path && finalBucket === storage.publicBucket) {
        await storage.removeObject(storage.publicBucket, row.storage_path).catch(() => {});
      }
      throw dbErr;
    }

    this._invalidatePhotoCaches(row.place_id);

    await auditService.record({
      actor: admin_id || 'admin',
      action: 'APPROVE_PENDING_PHOTO',
      resource: 'place_photos',
      resourceId: photo_id,
      details: { place_id: row.place_id, storage_bucket: finalBucket, license: row.license },
    }).catch(() => {});

    return {
      id: photo_id,
      place_id: row.place_id,
      approval_status: 'approved',
      photo_url: finalUrl,
      storage_bucket: finalBucket,
      approved_by: admin_id || 'admin',
      reviewed_at: now,
    };
  }

  async rejectOrRetractPhoto({ photo_id, status = 'rejected', reason = null, admin_id, storage = supabasePhotoStorage }) {
    if (!photo_id) throw badInput('INVALID_PHOTO_ID', 'photo_id es obligatorio.');
    if (!['rejected', 'retracted'].includes(status)) {
      throw badInput('INVALID_MODERATION_STATUS', 'status debe ser rejected o retracted.');
    }

    const rows = await query('SELECT * FROM place_photos WHERE id = ?', [photo_id]);
    if (!rows || rows.length === 0) {
      const err = new Error('Fotografía no encontrada.');
      err.code = 'PHOTO_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const row = rows[0];
    if (row.storage_path && row.storage_bucket === storage.publicBucket && storage.isConfigured()) {
      await storage.removeObject(storage.publicBucket, row.storage_path).catch(() => {});
    }

    const now = new Date().toISOString();
    await execute(
      `UPDATE place_photos SET approval_status = ?, approved_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
      [status, admin_id || 'admin', now, now, photo_id]
    );

    this._invalidatePhotoCaches(row.place_id);

    await auditService.record({
      actor: admin_id || 'admin',
      action: status === 'rejected' ? 'REJECT_PLACE_PHOTO' : 'RETRACT_PLACE_PHOTO',
      resource: 'place_photos',
      resourceId: photo_id,
      details: { place_id: row.place_id, reason },
    }).catch(() => {});

    return { id: photo_id, place_id: row.place_id, approval_status: status, reviewed_by: admin_id || 'admin', reviewed_at: now };
  }
}

module.exports = new MultisourceAdminService();
module.exports.MultisourceAdminService = MultisourceAdminService;
