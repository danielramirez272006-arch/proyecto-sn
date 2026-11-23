const net = require('node:net');
const { isPrivateOrReservedIp } = require('../../modules/places/photo-security-validator');

const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|rules)/gi,
  /disregard\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|rules)/gi,
  /olvida\s+(?:todas\s+)?las\s+instrucciones\s+anteriores/gi,
  /ignora\s+(?:todas\s+)?las\s+instrucciones\s+anteriores/gi,
  /reveal\s+(?:your\s+)?(?:system\s+prompt|api\s+key|secret)/gi,
  /muestra\s+(?:tu\s+)?(?:system\s+prompt|prompt\s+del\s+sistema|api\s+key)/gi,
  /<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]/gi,
  /###\s*(?:system|instruction|assistant)\s*:/gi
];

/**
 * Limpia recursivamente objetos y arreglos eliminando claves de Prototype Pollution
 * (__proto__, constructor, prototype) y bytes nulos (\0) en strings.
 */
function sanitizeValue(value, depth = 0) {
  if (depth > 12 || value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.replace(/\0/g, '');
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = sanitizeValue(value[i], depth + 1);
    }
    return value;
  }

  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (DANGEROUS_OBJECT_KEYS.has(key)) {
        delete value[key];
      } else {
        value[key] = sanitizeValue(value[key], depth + 1);
      }
    }
    return value;
  }

  return value;
}

/**
 * Middleware Express para prevenir Prototype Pollution y Null-Byte Injection
 * en req.body, req.query y req.params.
 */
function payloadSanitizer(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    sanitizeValue(req.params);
  }
  next();
}

/**
 * Detecta y neutraliza intentos de Prompt Injection / Jailbreak antes de enviarlos
 * a modelos LLM (Google Gemini o DeepSeek).
 */
function sanitizePromptInjection(input = '', maxLen = 800) {
  let cleanText = String(input || '').replace(/\0/g, '');
  let injectionDetected = false;

  for (const regex of PROMPT_INJECTION_PATTERNS) {
    if (regex.test(cleanText)) {
      injectionDetected = true;
      cleanText = cleanText.replace(regex, '[INSTRUCCION_BLOQUEADA]');
    }
    regex.lastIndex = 0;
  }

  return {
    cleanText: cleanText.slice(0, maxLen),
    injectionDetected
  };
}

/**
 * Valida una URL saliente (photo_url o target_url de webhook) contra SSRF:
 * bloquea esquemas distintos de http/https, localhost, dominios internos y rangos de IP privados/metadata cloud.
 */
function assertSafeOutboundUrl(rawUrl, { requireHttps = false } = {}) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    const err = new Error('La URL proporcionada no tiene un formato válido.');
    err.status = 400;
    err.code = 'INVALID_URL';
    throw err;
  }

  const protocol = parsed.protocol.toLowerCase();
  if (requireHttps && protocol !== 'https:') {
    const err = new Error('Solo se permiten URLs con protocolo seguro HTTPS.');
    err.status = 400;
    err.code = 'INSECURE_PROTOCOL_BLOCKED';
    throw err;
  }
  if (protocol !== 'http:' && protocol !== 'https:') {
    const err = new Error('Protocolo de URL no permitido. Solo se admite HTTP/HTTPS.');
    err.status = 400;
    err.code = 'UNSUPPORTED_URL_PROTOCOL';
    throw err;
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();

  const blockedHostnames = new Set([
    'localhost',
    '0.0.0.0',
    'metadata.google.internal',
    'metadata',
    'instance-data'
  ]);

  if (
    blockedHostnames.has(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    const err = new Error(`Destino de red interno o local bloqueado por protección anti-SSRF (${hostname}).`);
    err.status = 400;
    err.code = 'SSRF_PRIVATE_IP_BLOCKED';
    throw err;
  }

  if (net.isIP(hostname) && isPrivateOrReservedIp(hostname)) {
    const err = new Error(`Dirección IP privada, loopback o de metadatos cloud bloqueada por protección anti-SSRF (${hostname}).`);
    err.status = 400;
    err.code = 'SSRF_PRIVATE_IP_BLOCKED';
    throw err;
  }

  return parsed.toString();
}

module.exports = {
  payloadSanitizer,
  sanitizeValue,
  sanitizePromptInjection,
  assertSafeOutboundUrl
};
