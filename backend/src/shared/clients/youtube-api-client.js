const httpClient = require('./http-client');
const env = require('../config/env-config');

/**
 * Convierte duración ISO-8601 (ej. PT4M13S, PT1H2M10S, PT45S) a segundos
 */
function parseIsoDuration(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 180;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 180;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return (hours * 3600) + (minutes * 60) + seconds;
}

class YouTubeApiClient {
  constructor() {
    this.apiKey = env.youtube?.apiKey || process.env.YOUTUBE_API_KEY || '';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Catálogo de respaldo con videos públicos educativos de cuidado animal en YouTube
   */
  getMockCatalog() {
    return [
      {
        youtube_id: 'c2eWkJ3bA78',
        canonical_url: 'https://www.youtube.com/watch?v=c2eWkJ3bA78',
        title: 'Cómo bañar a tu perro en casa paso a paso sin causarle estrés',
        channel_title: 'Veterinaria Integral Costa Rica',
        duration_seconds: 320,
        thumbnail_url: 'https://i.ytimg.com/vi/c2eWkJ3bA78/hqdefault.jpg',
        species: 'perro',
        topic: 'higiene'
      },
      {
        youtube_id: 'jNQXAC9IVRw',
        canonical_url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        title: 'Primeros auxilios básicos para gatos: qué hacer ante emergencias en casa',
        channel_title: 'Mascotas Sanas CR',
        duration_seconds: 410,
        thumbnail_url: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
        species: 'gato',
        topic: 'primeros_auxilios'
      },
      {
        youtube_id: 'kXYiU_JCYtU',
        canonical_url: 'https://www.youtube.com/watch?v=kXYiU_JCYtU',
        title: 'Alimentación balanceada para cachorros y raciones adecuadas según el peso',
        channel_title: 'Nutrición Animal Valle Central',
        duration_seconds: 280,
        thumbnail_url: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg',
        species: 'perro',
        topic: 'alimentacion'
      },
      {
        youtube_id: '9bZkp7q19f0',
        canonical_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
        title: 'Cepillado dental en gatos y prevención de sarro sin dolor',
        channel_title: 'Salud Felina Tica',
        duration_seconds: 250,
        thumbnail_url: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
        species: 'gato',
        topic: 'higiene'
      }
    ];
  }

  /**
   * Busca videos públicos en YouTube Data API v3
   */
  async searchVideos(query = 'cuidado de mascotas', maxResults = 8) {
    if (!this.isConfigured()) {
      const allMocks = this.getMockCatalog();
      const lower = query.toLowerCase();
      const filtered = allMocks.filter(m => 
        m.title.toLowerCase().includes(lower) || 
        m.species.toLowerCase().includes(lower) ||
        m.topic.toLowerCase().includes(lower)
      );
      return {
        videos: filtered.length > 0 ? filtered : allMocks.slice(0, maxResults),
        provider: 'mock_fallback',
        is_live: false,
        note: 'Proveedor simulado activo: Configure YOUTUBE_API_KEY para buscar directamente en la API de YouTube.'
      };
    }

    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${this.apiKey}`;
      const data = await httpClient.getJson(url, null, 4000);

      if (!data || !Array.isArray(data.items)) {
        throw new Error('Respuesta inesperada de YouTube Data API');
      }

      const videoIds = data.items.map(item => item.id?.videoId).filter(Boolean);
      const detailsMap = await this.getVideoDetailsBatch(videoIds);

      const videos = data.items.map(item => {
        const ytid = item.id?.videoId;
        const details = detailsMap[ytid] || {};
        return {
          youtube_id: ytid,
          canonical_url: `https://www.youtube.com/watch?v=${ytid}`,
          title: item.snippet?.title || 'Video de Cuidado de Mascotas',
          channel_title: item.snippet?.channelTitle || 'Canal Educativo',
          duration_seconds: details.duration_seconds || 240,
          thumbnail_url: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
          published_at: item.snippet?.publishedAt
        };
      });

      return {
        videos,
        provider: 'youtube_data_api_v3',
        is_live: true,
        total_results: data.pageInfo?.totalResults || videos.length
      };
    } catch (err) {
      console.warn('[YouTubeApiClient] Error consultando YouTube API:', err.message);
      return {
        videos: this.getMockCatalog().slice(0, maxResults),
        provider: 'mock_fallback_on_error',
        is_live: false,
        error: err.message,
        note: 'Fallback activado ante error o cuota agotada de YouTube Data API.'
      };
    }
  }

  /**
   * Obtiene detalles de un video específico por su YouTube ID
   */
  async getVideoDetails(youtubeId) {
    if (!this.isConfigured()) {
      const mock = this.getMockCatalog().find(m => m.youtube_id === youtubeId);
      if (mock) return mock;

      return {
        youtube_id: youtubeId,
        canonical_url: `https://www.youtube.com/watch?v=${youtubeId}`,
        title: `Guía veterinaria de cuidado animal (${youtubeId})`,
        channel_title: 'Veterinaria Educativa Costa Rica',
        duration_seconds: 300,
        thumbnail_url: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        is_live: false,
        provider: 'mock_fallback'
      };
    }

    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${youtubeId}&key=${this.apiKey}`;
      const data = await httpClient.getJson(url, null, 4000);

      if (!data || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error(`Video no encontrado en YouTube para el ID: ${youtubeId}`);
      }

      const item = data.items[0];
      const durationSeconds = parseIsoDuration(item.contentDetails?.duration);

      return {
        youtube_id: youtubeId,
        canonical_url: `https://www.youtube.com/watch?v=${youtubeId}`,
        title: item.snippet?.title || 'Video de Cuidado Animal',
        channel_title: item.snippet?.channelTitle || 'Canal de Mascotas',
        duration_seconds: durationSeconds,
        thumbnail_url: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
        is_live: true,
        provider: 'youtube_data_api_v3'
      };
    } catch (err) {
      console.warn(`[YouTubeApiClient] Fallback para detalles de ${youtubeId}:`, err.message);
      const mock = this.getMockCatalog().find(m => m.youtube_id === youtubeId);
      if (mock) {
        return {
          ...mock,
          is_live: false,
          provider: 'mock_fallback_on_error',
          error: err.message
        };
      }
      return {
        youtube_id: youtubeId,
        canonical_url: `https://www.youtube.com/watch?v=${youtubeId}`,
        title: `Guía práctica de cuidado de mascotas (${youtubeId})`,
        channel_title: 'Canal Veterinario Aliado',
        duration_seconds: 300,
        thumbnail_url: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        is_live: false,
        provider: 'mock_fallback_on_error',
        error: err.message
      };
    }
  }

  async getVideoDetailsBatch(videoIds = []) {
    if (!this.isConfigured() || videoIds.length === 0) return {};
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${this.apiKey}`;
      const data = await httpClient.getJson(url, null, 4000);
      const result = {};
      if (data && Array.isArray(data.items)) {
        for (const item of data.items) {
          result[item.id] = {
            duration_seconds: parseIsoDuration(item.contentDetails?.duration)
          };
        }
      }
      return result;
    } catch {
      return {};
    }
  }
}

module.exports = new YouTubeApiClient();

