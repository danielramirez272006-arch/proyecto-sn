const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');

const VALID_PHOTO_TYPES = new Set(['fachada', 'interior', 'terraza', 'plato', 'otro']);

function validatorError(code, message, status = 400) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

/**
 * Resuelve una ruta local asegurando que no escape de baseDir (incluyendo enlaces simbólicos).
 */
function resolveSafeLocalPath(baseDir, targetRelativePath) {
  if (!baseDir || !targetRelativePath) {
    throw validatorError('INVALID_LOCAL_PATH', 'La carpeta base y la ruta del archivo son obligatorias.');
  }

  const realBase = fs.realpathSync(path.resolve(baseDir));
  const candidate = path.resolve(realBase, String(targetRelativePath));

  if (candidate !== realBase && !candidate.startsWith(realBase + path.sep)) {
    throw validatorError('PATH_TRAVERSAL_BLOCKED', 'La ruta del archivo sale de la carpeta permitida.');
  }

  if (!fs.existsSync(candidate)) {
    throw validatorError('FILE_NOT_FOUND', `Archivo no encontrado: ${targetRelativePath}`);
  }

  const realTarget = fs.realpathSync(candidate);
  if (realTarget !== realBase && !realTarget.startsWith(realBase + path.sep)) {
    throw validatorError('SYMLINK_ESCAPE_BLOCKED', 'El enlace simbólico apunta fuera de la carpeta permitida.');
  }

  const stat = fs.statSync(realTarget);
  if (!stat.isFile()) {
    throw validatorError('NOT_A_FILE', 'La ruta especificada no corresponde a un archivo regular.');
  }

  return realTarget;
}

function detectImageFormat(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { format: 'jpeg', mimeType: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { format: 'png', mimeType: 'image/png', ext: 'png' };
  }

  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { format: 'webp', mimeType: 'image/webp', ext: 'webp' };
  }

  return null;
}

function parsePngDimensions(buffer) {
  if (buffer.length < 24 || buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw validatorError('CORRUPT_PNG', 'Archivo PNG corrupto o sin cabecera IHDR.');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function stripPngMetadata(buffer) {
  const chunks = [buffer.subarray(0, 8)];
  let offset = 8;
  let stripped = false;
  const sensitiveTypes = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt']);

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const totalChunkLen = 12 + length;
    if (offset + totalChunkLen > buffer.length) {
      throw validatorError('CORRUPT_PNG', 'Chunk PNG truncado o corrupto.');
    }
    if (sensitiveTypes.has(type)) {
      stripped = true;
    } else {
      chunks.push(buffer.subarray(offset, offset + totalChunkLen));
    }
    offset += totalChunkLen;
    if (type === 'IEND') break;
  }

  return { sanitizedBuffer: Buffer.concat(chunks), stripped };
}

function parseAndStripJpeg(buffer) {
  let offset = 2; // Después de FF D8
  let width = null;
  let height = null;
  let stripped = false;
  const output = [buffer.subarray(0, 2)];

  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  // APP1 (EXIF/GPS/XMP), APP13 (IPTC), COM (comentarios)
  const stripMarkers = new Set([0xe1, 0xed, 0xfe]);

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      throw validatorError('CORRUPT_JPEG', 'Estructura JPEG inválida.');
    }
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= buffer.length) break;

    const marker = buffer[offset];
    offset += 1;

    // SOS (Start of Scan) — copiar el resto del stream de imagen tal cual
    if (marker === 0xda) {
      output.push(Buffer.from([0xff, marker]));
      output.push(buffer.subarray(offset));
      break;
    }

    if (marker === 0xd9) {
      output.push(Buffer.from([0xff, marker]));
      break;
    }

    // Marcadores sin longitud (RSTn, TEM)
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      output.push(Buffer.from([0xff, marker]));
      continue;
    }

    if (offset + 2 > buffer.length) {
      throw validatorError('CORRUPT_JPEG', 'Segmento JPEG truncado.');
    }
    const segLen = buffer.readUInt16BE(offset);
    if (segLen < 2 || offset + segLen > buffer.length) {
      throw validatorError('CORRUPT_JPEG', 'Longitud de segmento JPEG inválida.');
    }

    if (sofMarkers.has(marker) && segLen >= 7) {
      height = buffer.readUInt16BE(offset + 3);
      width = buffer.readUInt16BE(offset + 5);
    }

    if (stripMarkers.has(marker)) {
      stripped = true;
    } else {
      output.push(Buffer.from([0xff, marker]));
      output.push(buffer.subarray(offset, offset + segLen));
    }

    offset += segLen;
  }

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw validatorError('CORRUPT_JPEG', 'No se pudieron leer las dimensiones del JPEG.');
  }

  return { width, height, sanitizedBuffer: Buffer.concat(output), stripped };
}

function parseAndStripWebp(buffer) {
  let offset = 12;
  let width = null;
  let height = null;
  let stripped = false;
  const keptChunks = [];

  while (offset + 8 <= buffer.length) {
    const fourCC = buffer.subarray(offset, offset + 4).toString('ascii');
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const paddedSize = chunkSize + (chunkSize % 2);
    const totalLen = 8 + paddedSize;
    if (offset + 8 + chunkSize > buffer.length) {
      throw validatorError('CORRUPT_WEBP', 'Chunk WebP truncado.');
    }

    if (fourCC === 'VP8 ' && chunkSize >= 10) {
      const start = offset + 8;
      if (buffer[start + 3] === 0x9d && buffer[start + 4] === 0x01 && buffer[start + 5] === 0x2a) {
        width = buffer.readUInt16LE(start + 6) & 0x3fff;
        height = buffer.readUInt16LE(start + 8) & 0x3fff;
      }
    } else if (fourCC === 'VP8L' && chunkSize >= 5) {
      const start = offset + 8;
      const bits = buffer.readUInt32LE(start + 1);
      width = (bits & 0x3fff) + 1;
      height = ((bits >> 14) & 0x3fff) + 1;
    } else if (fourCC === 'VP8X' && chunkSize >= 10) {
      const start = offset + 8;
      width = (buffer[start + 4] | (buffer[start + 5] << 8) | (buffer[start + 6] << 16)) + 1;
      height = (buffer[start + 7] | (buffer[start + 8] << 8) | (buffer[start + 9] << 16)) + 1;
    }

    if (fourCC === 'EXIF' || fourCC === 'XMP ') {
      stripped = true;
    } else {
      const sliceEnd = Math.min(buffer.length, offset + totalLen);
      keptChunks.push(buffer.subarray(offset, sliceEnd));
    }

    offset += totalLen;
  }

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw validatorError('CORRUPT_WEBP', 'No se pudieron leer las dimensiones del WebP.');
  }

  let sanitizedBuffer = buffer;
  if (stripped) {
    const body = Buffer.concat(keptChunks);
    const header = Buffer.alloc(12);
    header.write('RIFF', 0, 'ascii');
    header.writeUInt32LE(4 + body.length, 4);
    header.write('WEBP', 8, 'ascii');
    sanitizedBuffer = Buffer.concat([header, body]);
  }

  return { width, height, sanitizedBuffer, stripped };
}

/**
 * Valida formato real, tamaño, dimensiones mínimas, elimina EXIF/metadatos sensibles y calcula hash SHA-256.
 */
function inspectAndSanitizeImage(buffer, { maxBytes = 8 * 1024 * 1024, minWidth = 400, minHeight = 300 } = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw validatorError('EMPTY_IMAGE', 'El archivo de imagen está vacío.');
  }
  if (buffer.length > maxBytes) {
    throw validatorError('IMAGE_TOO_LARGE', `La imagen excede el tamaño máximo permitido (${maxBytes} bytes).`);
  }

  const fmt = detectImageFormat(buffer);
  if (!fmt) {
    throw validatorError('UNSUPPORTED_IMAGE_FORMAT', 'Formato inválido. Solo se admiten JPEG, PNG o WebP reales.');
  }

  let width;
  let height;
  let sanitizedBuffer;
  let exifStripped = false;

  if (fmt.format === 'png') {
    ({ width, height } = parsePngDimensions(buffer));
    const res = stripPngMetadata(buffer);
    sanitizedBuffer = res.sanitizedBuffer;
    exifStripped = res.stripped;
  } else if (fmt.format === 'jpeg') {
    const res = parseAndStripJpeg(buffer);
    width = res.width;
    height = res.height;
    sanitizedBuffer = res.sanitizedBuffer;
    exifStripped = res.stripped;
  } else {
    const res = parseAndStripWebp(buffer);
    width = res.width;
    height = res.height;
    sanitizedBuffer = res.sanitizedBuffer;
    exifStripped = res.stripped;
  }

  if (width < minWidth || height < minHeight) {
    throw validatorError(
      'IMAGE_DIMENSIONS_TOO_SMALL',
      `Dimensiones insuficientes (${width}x${height}). Mínimo requerido: ${minWidth}x${minHeight}.`
    );
  }

  const contentHash = crypto.createHash('sha256').update(sanitizedBuffer).digest('hex');

  return {
    format: fmt.format,
    mimeType: fmt.mimeType,
    ext: fmt.ext,
    width,
    height,
    byteSize: sanitizedBuffer.length,
    contentHash,
    exifStripped,
    sanitizedBuffer,
    transformations: exifStripped ? ['stripped_sensitive_metadata_exif_xmp'] : [],
  };
}

function isPrivateOrReservedIp(ip) {
  if (!net.isIP(ip)) return true;
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    return false;
  }
  const lower = ip.toLowerCase();
  return (
    lower === '::1' ||
    lower === '::' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80')
  );
}

/**
 * Valida URLs externas contra SSRF (solo HTTPS, dominio permitido, sin IPs privadas).
 */
async function validateSafeExternalImageUrl(rawUrl, allowedHosts = [], lookupFn = dns.lookup) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    throw validatorError('INVALID_URL', 'URL externa inválida.');
  }

  if (parsed.protocol !== 'https:') {
    throw validatorError('INSECURE_PROTOCOL_BLOCKED', 'Solo se permiten URLs HTTPS.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (allowedHosts.length > 0 && !allowedHosts.includes(hostname)) {
    throw validatorError('UNTRUSTED_IMAGE_HOST', `Host externo no permitido: ${hostname}`);
  }

  if (net.isIP(hostname) && isPrivateOrReservedIp(hostname)) {
    throw validatorError('SSRF_PRIVATE_IP_BLOCKED', 'Destino de red privado o reservado bloqueado.');
  }

  const records = await lookupFn(hostname, { all: true });
  if (!Array.isArray(records) || records.length === 0) {
    throw validatorError('DNS_RESOLUTION_FAILED', `No se pudo resolver DNS para ${hostname}`);
  }
  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw validatorError('SSRF_PRIVATE_IP_BLOCKED', `Resolución DNS apunta a IP privada bloqueada (${rec.address}).`);
    }
  }

  return parsed.toString();
}

module.exports = {
  VALID_PHOTO_TYPES,
  resolveSafeLocalPath,
  detectImageFormat,
  inspectAndSanitizeImage,
  isPrivateOrReservedIp,
  validateSafeExternalImageUrl,
};
