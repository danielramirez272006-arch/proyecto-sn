const zlib = require('node:zlib');

const MIN_COMPRESS_BYTES = 1024;

/**
 * Middleware nativo de compresión HTTP gzip usando node:zlib (cero dependencias externas).
 * Comprime respuestas JSON/texto >= 1 KB cuando el cliente anuncia soporte para gzip.
 */
function responseCompressor(req, res, next) {
  const acceptEncoding = String(req.headers?.['accept-encoding'] || '').toLowerCase();
  if (!acceptEncoding.includes('gzip') || req.method === 'HEAD') {
    return next();
  }

  const originalJson = res.json.bind(res);
  res.json = function compressedJson(body) {
    if (res.headersSent) {
      return originalJson(body);
    }

    const serialized = JSON.stringify(body);
    if (!serialized || Buffer.byteLength(serialized, 'utf8') < MIN_COMPRESS_BYTES) {
      return originalJson(body);
    }

    try {
      const compressed = zlib.gzipSync(Buffer.from(serialized, 'utf8'), { level: 6 });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Length', compressed.length);
      return res.send(compressed);
    } catch {
      return originalJson(body);
    }
  };

  next();
}

module.exports = responseCompressor;
