const { haversineDistanceKm } = require('../utils/geo-math');

const WIKIPEDIA_API_URL = 'https://es.wikipedia.org/w/api.php';
const COMMONS_API_URL = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'GoToX-PetOS/1.0 (https://gotox.local; info@gotox.local)';

function normalizeTokens(text) {
  const stopWords = new Set(['de', 'la', 'el', 'y', 'en', 'del', 'san', 'jose', 'costa', 'rica', 'parque', 'jardin']);
  return new Set(
    String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !stopWords.has(t))
  );
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function tokenOverlapScore(nameA, nameB) {
  const a = normalizeTokens(nameA);
  const b = normalizeTokens(nameB);
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const t of a) {
    if (b.has(t)) hits += 1;
  }
  return hits / Math.min(a.size, b.size);
}

class WikimediaPlacesClient {
  constructor({ timeoutMs = 6000 } = {}) {
    this.timeoutMs = timeoutMs;
  }

  async findPlacePhoto({ name, lat, lng, maxDistanceKm = 1.5, fetchImpl = fetch } = {}) {
    if (!name || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return null;
    }

    const params = new URLSearchParams({
      action: 'query',
      generator: 'geosearch',
      ggscoord: `${Number(lat)}|${Number(lng)}`,
      ggsradius: '1800',
      ggslimit: '12',
      prop: 'pageimages|coordinates|info',
      piprop: 'thumbnail|name',
      pithumbsize: '900',
      inprop: 'url',
      format: 'json',
    });

    let resp;
    try {
      resp = await fetchImpl(`${WIKIPEDIA_API_URL}?${params.toString()}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      return null;
    }

    if (!resp.ok) return null;
    const data = await resp.json().catch(() => null);
    const pages = Object.values(data?.query?.pages || {});
    if (pages.length === 0) return null;

    const candidates = pages
      .filter((p) => p?.thumbnail?.source && p?.pageimage)
      .map((p) => {
        const coord = Array.isArray(p.coordinates) ? p.coordinates[0] : null;
        const distKm = coord
          ? haversineDistanceKm(Number(lat), Number(lng), Number(coord.lat), Number(coord.lon))
          : null;
        const sim = tokenOverlapScore(name, p.title);
        return { page: p, distKm, sim };
      })
      .filter((c) => c.sim >= 0.5 && (c.distKm === null || c.distKm <= maxDistanceKm))
      .sort((a, b) => b.sim - a.sim);

    if (candidates.length === 0) return null;

    const best = candidates[0].page;
    let artist = null;
    let license = null;
    let commonsUrl = best.fullurl || null;

    try {
      const metaParams = new URLSearchParams({
        action: 'query',
        titles: `File:${best.pageimage}`,
        prop: 'imageinfo',
        iiprop: 'extmetadata|url',
        iiextmetadatafilter: 'Artist|LicenseShortName',
        format: 'json',
      });
      const metaResp = await fetchImpl(`${COMMONS_API_URL}?${metaParams.toString()}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (metaResp.ok) {
        const metaJson = await metaResp.json().catch(() => null);
        const filePages = Object.values(metaJson?.query?.pages || {});
        const info = filePages[0]?.imageinfo?.[0];
        if (info) {
          artist = stripHtml(info.extmetadata?.Artist?.value) || null;
          license = info.extmetadata?.LicenseShortName?.value || null;
          commonsUrl = info.descriptionurl || commonsUrl;
        }
      }
    } catch {
      // Conservar thumbnail con enlace de Wikipedia si falla metadata secundaria
    }

    const displayAuthor = [artist, license].filter(Boolean).join(' · ') || 'Wikimedia Commons';

    return {
      external_id: String(best.pageid),
      provider: 'wikimedia_commons',
      matched_name: best.title,
      author: artist || null,
      license: license || null,
      photo_url: best.thumbnail.source,
      gallery: [
        {
          url: best.thumbnail.source,
          attributions: [{ displayName: displayAuthor, uri: commonsUrl, photoUri: null }],
        },
      ],
      attributions: [{ displayName: displayAuthor, uri: commonsUrl, photoUri: null }],
      source_url: commonsUrl,
    };
  }
}

module.exports = new WikimediaPlacesClient();
module.exports.WikimediaPlacesClient = WikimediaPlacesClient;
