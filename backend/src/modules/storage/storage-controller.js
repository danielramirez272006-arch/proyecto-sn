const supabaseConfig = require('../../shared/config/supabase-config');
const { formatSuccess, formatError } = require('../../shared/utils/http-response');

const ALLOWED_BUCKETS = ['receipts', 'places', 'avatars', 'reports', 'general'];
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

class StorageController {
  async uploadFile(req, res) {
    try {
      const { 
        bucket = 'receipts', 
        file_name, 
        content_base64, 
        content_type = 'image/jpeg' 
      } = req.body;

      if (!file_name) {
        return res.status(400).json(formatError('MISSING_FILENAME', 'El campo file_name es obligatorio'));
      }

      if (!content_base64) {
        return res.status(400).json(formatError('MISSING_CONTENT', 'El campo content_base64 con los datos del archivo es obligatorio'));
      }

      if (!ALLOWED_BUCKETS.includes(bucket)) {
        return res.status(400).json(formatError('INVALID_BUCKET', `Bucket no permitido. Buckets válidos: ${ALLOWED_BUCKETS.join(', ')}`));
      }

      if (!ALLOWED_MIME_TYPES.includes(content_type)) {
        return res.status(400).json(formatError('UNSUPPORTED_MEDIA_TYPE', `Tipo de archivo no permitido. Tipos válidos: ${ALLOWED_MIME_TYPES.join(', ')}`));
      }

      // Convertir base64 a buffer
      const cleanBase64 = content_base64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return res.status(413).json(formatError('PAYLOAD_TOO_LARGE', `El archivo excede el tamaño máximo de 5MB (tamaño recibido: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB)`));
      }

      // Sanitizar nombre de archivo para evitar Path Traversal
      const safeFileName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniquePath = `${Date.now()}_${safeFileName}`;

      const uploadResult = await supabaseConfig.uploadStorageFile(
        bucket,
        uniquePath,
        buffer,
        content_type
      );

      return res.status(201).json(formatSuccess({
        bucket,
        file_name: safeFileName,
        path: uploadResult.path || uniquePath,
        url: uploadResult.url || uploadResult.publicUrl,
        size_bytes: buffer.length,
        content_type,
        provider: uploadResult.fallback ? 'Local Virtual Storage' : 'Supabase Cloud Storage',
        fallback: Boolean(uploadResult.fallback),
        created_at: new Date().toISOString()
      }, 'Archivo subido exitosamente'));
    } catch (err) {
      console.error('[StorageController] Error en subida:', err);
      return res.status(500).json(formatError('STORAGE_ERROR', `Error procesando la subida: ${err.message}`));
    }
  }

  async getStorageStatus(req, res) {
    const health = await supabaseConfig.checkHealth();
    return res.status(200).json(formatSuccess({
      storage_provider: health.configured ? 'Supabase Storage Cloud' : 'Local Fallback Storage',
      configured: health.configured,
      allowed_buckets: ALLOWED_BUCKETS,
      max_size_mb: 5
    }));
  }
}

module.exports = new StorageController();

