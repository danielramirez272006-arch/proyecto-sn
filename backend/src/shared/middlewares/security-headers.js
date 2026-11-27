/**
 * Cabeceras de seguridad HTTP para la API.
 * - La API solo devuelve JSON: se bloquea cualquier carga de recursos (CSP 'none') salvo en
 *   la documentación Swagger (/api/docs) y el demo estático (/demo), que sí cargan recursos.
 * - Las respuestas de autenticación y administración nunca deben guardarse en caché.
 */
function securityHeaders(req, res, next) {
  const url = String(req.originalUrl || req.url || '');
  const esDocumentacion = url.startsWith('/api/docs') || url.startsWith('/demo');
  const esApi = url.startsWith('/api');

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', esDocumentacion ? 'SAMEORIGIN' : 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), payment=(), usb=(), geolocation=(self)');

  if (esApi && !esDocumentacion) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    );
  } else if (!esDocumentacion) {
    // CSP endurecida para el SPA compilado (React + Leaflet OSM + fotos de Supabase Storage)
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https://*.supabase.co https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
        "connect-src 'self' https://*.supabase.co",
        "media-src 'self' blob: https://*.supabase.co",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ')
    );
  }

  if (url.startsWith('/api/admin') || url.startsWith('/api/auth')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
  }

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

module.exports = securityHeaders;
