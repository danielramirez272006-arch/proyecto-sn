/**
 * Parser y validador canónico de URLs de YouTube.
 * Garantiza que YouTube sea la ÚNICA fuente de videos y que viajen exclusivamente sobre HTTPS.
 */

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'music.youtube.com'
]);

function parseAndValidateYouTubeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('La URL del video es obligatoria.');
  }

  const trimmed = rawUrl.trim();

  // 1. Validar estrictamente HTTPS
  if (!trimmed.toLowerCase().startsWith('https://')) {
    throw new Error('Únicamente se permiten enlaces HTTPS de YouTube.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch (err) {
    throw new Error('La URL proporcionada no es una URL válida.');
  }

  // 2. Validar que el dominio pertenezca exclusivamente a YouTube
  const hostname = parsedUrl.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new Error('YouTube es la única fuente de videos permitida. Se rechazaron enlaces de otros dominios.');
  }

  let youtubeId = null;

  if (hostname === 'youtu.be') {
    // Formato https://youtu.be/dQw4w9WgXcQ
    youtubeId = parsedUrl.pathname.slice(1).split('/')[0].split('?')[0];
  } else {
    // Formato https://www.youtube.com/watch?v=dQw4w9WgXcQ
    if (parsedUrl.pathname === '/watch') {
      youtubeId = parsedUrl.searchParams.get('v');
    } else if (
      parsedUrl.pathname.startsWith('/embed/') ||
      parsedUrl.pathname.startsWith('/v/') ||
      parsedUrl.pathname.startsWith('/shorts/')
    ) {
      // Formato https://www.youtube.com/embed/dQw4w9WgXcQ o shorts
      const parts = parsedUrl.pathname.split('/').filter(Boolean);
      youtubeId = parts[1] || null;
    }
  }

  if (!youtubeId || !YOUTUBE_ID_REGEX.test(youtubeId)) {
    throw new Error('No se pudo extraer un ID canónico válido de YouTube (debe tener exactamente 11 caracteres alfanuméricos).');
  }

  return {
    youtube_id: youtubeId,
    canonical_url: `https://www.youtube.com/watch?v=${youtubeId}`
  };
}

function parseYouTubeIdOrUrl(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Identificador o URL de YouTube requerido.');
  }

  const trimmed = input.trim();
  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return {
      youtube_id: trimmed,
      canonical_url: `https://www.youtube.com/watch?v=${trimmed}`
    };
  }

  return parseAndValidateYouTubeUrl(trimmed);
}

module.exports = {
  parseAndValidateYouTubeUrl,
  parseYouTubeIdOrUrl,
  YOUTUBE_ID_REGEX
};

