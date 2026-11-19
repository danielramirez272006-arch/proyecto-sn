const { createClient } = require('@supabase/supabase-js');
const env = require('../../shared/config/env-config');

function storageError(code, message, status = 502) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

class SupabasePhotoStorage {
  constructor(config = {}) {
    this.url = config.url !== undefined ? config.url : (env.supabase?.url || process.env.SUPABASE_URL || '');
    this.serviceRoleKey =
      config.serviceRoleKey !== undefined
        ? config.serviceRoleKey
        : (env.supabase?.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
    this.privateBucket = config.privateBucket || env.photoPipeline?.privateBucket || 'gotox-place-photos-private';
    this.publicBucket = config.publicBucket || env.photoPipeline?.publicBucket || 'gotox-place-photos-public';
    this.signedUrlTtlSeconds = Number(config.signedUrlTtlSeconds || env.photoPipeline?.signedUrlTtlSeconds || 300);
    this.maxRetries = Number(config.maxRetries ?? 2);
    this._client = config.supabaseClient || null;
  }

  isConfigured() {
    return Boolean(
      this.url &&
        this.url.startsWith('https://') &&
        this.serviceRoleKey &&
        String(this.serviceRoleKey).trim().length > 0
    );
  }

  _getAdminClient() {
    if (!this.isConfigured()) {
      throw storageError(
        'SUPABASE_STORAGE_NOT_CONFIGURED',
        'Se requiere SUPABASE_URL (HTTPS) y SUPABASE_SERVICE_ROLE_KEY en el backend. No se usa fallback local silencioso.',
        503
      );
    }
    if (!this._client) {
      this._client = createClient(this.url, this.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this._client;
  }

  buildDeterministicPath(placeId, contentHash, ext) {
    const safePlace = String(placeId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeHash = String(contentHash || '').replace(/[^a-f0-9]/gi, '');
    const safeExt = String(ext || 'jpg').replace(/[^a-z0-9]/gi, '');
    return `${safePlace}/${safeHash}.${safeExt}`;
  }

  async _withRetry(opName, fn) {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        const status = err?.statusCode || err?.status || 500;
        // Detenerse inmediatamente ante bloqueos de autenticación/permisos (401/403)
        if (status === 401 || status === 403) {
          throw storageError('SUPABASE_STORAGE_FORBIDDEN', `Bloqueo de permisos en Supabase Storage (${opName}).`, status);
        }
        const retryable = status === 429 || status >= 500;
        if (!retryable || attempt >= this.maxRetries) {
          throw err;
        }
        const retryAfterSec = Number(err?.retryAfter || 0);
        const delayMs = retryAfterSec > 0 ? retryAfterSec * 1000 : 250 * Math.pow(2, attempt);
        attempt += 1;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  async uploadPrivatePending({ placeId, contentHash, ext, buffer, contentType }) {
    const client = this._getAdminClient();
    const objectPath = this.buildDeterministicPath(placeId, contentHash, ext);

    return this._withRetry('uploadPrivatePending', async () => {
      const { data, error } = await client.storage.from(this.privateBucket).upload(objectPath, buffer, {
        contentType,
        upsert: false,
      });

      if (error) {
        const msg = String(error.message || '');
        if (msg.toLowerCase().includes('already exists') || error.statusCode === '409' || error.status === 409) {
          return { bucket: this.privateBucket, path: objectPath, alreadyExisted: true };
        }
        const err = storageError('SUPABASE_STORAGE_UPLOAD_FAILED', `Error subiendo a Storage: ${msg}`, Number(error.statusCode || error.status || 502));
        err.retryAfter = error.retryAfter;
        throw err;
      }

      return { bucket: this.privateBucket, path: data?.path || objectPath, alreadyExisted: false };
    });
  }

  async promoteToPublic({ objectPath, contentType }) {
    const client = this._getAdminClient();

    return this._withRetry('promoteToPublic', async () => {
      const { data: blob, error: dlErr } = await client.storage.from(this.privateBucket).download(objectPath);
      if (dlErr || !blob) {
        throw storageError(
          'SUPABASE_STORAGE_DOWNLOAD_FAILED',
          `No se pudo leer el objeto privado ${objectPath}: ${dlErr?.message || 'vacío'}`,
          Number(dlErr?.statusCode || 502)
        );
      }

      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: upErr } = await client.storage.from(this.publicBucket).upload(objectPath, buffer, {
        contentType: contentType || 'image/jpeg',
        upsert: false,
      });

      if (upErr && !String(upErr.message || '').toLowerCase().includes('already exists')) {
        throw storageError(
          'SUPABASE_STORAGE_PUBLISH_FAILED',
          `No se pudo publicar en bucket público: ${upErr.message}`,
          Number(upErr.statusCode || 502)
        );
      }

      const { data: pub } = client.storage.from(this.publicBucket).getPublicUrl(objectPath);
      return {
        publicBucket: this.publicBucket,
        objectPath,
        publicUrl: pub?.publicUrl || null,
      };
    });
  }

  async createSignedReviewUrl(bucket, objectPath) {
    const client = this._getAdminClient();
    const { data, error } = await client.storage.from(bucket).createSignedUrl(objectPath, this.signedUrlTtlSeconds);
    if (error) {
      throw storageError('SUPABASE_SIGNED_URL_FAILED', `No se pudo generar URL firmada: ${error.message}`, 502);
    }
    return data?.signedUrl || null;
  }

  async removeObject(bucket, objectPath) {
    const client = this._getAdminClient();
    const { error } = await client.storage.from(bucket).remove([objectPath]);
    if (error) {
      throw storageError('SUPABASE_STORAGE_REMOVE_FAILED', `No se pudo retirar el objeto: ${error.message}`, 502);
    }
    return true;
  }

  async exists(bucket, objectPath) {
    const client = this._getAdminClient();
    const folder = objectPath.includes('/') ? objectPath.slice(0, objectPath.lastIndexOf('/')) : '';
    const fileName = objectPath.includes('/') ? objectPath.slice(objectPath.lastIndexOf('/') + 1) : objectPath;
    const { data, error } = await client.storage.from(bucket).list(folder, { search: fileName, limit: 10 });
    if (error) {
      throw storageError('SUPABASE_STORAGE_LIST_FAILED', `Error listando Storage: ${error.message}`, 502);
    }
    return Array.isArray(data) && data.some((entry) => entry.name === fileName);
  }
}

module.exports = new SupabasePhotoStorage();
module.exports.SupabasePhotoStorage = SupabasePhotoStorage;
