const crypto = require('node:crypto');
const { query, execute } = require('../../shared/config/database');
const placesRepository = require('../places/places-repository');
const petCompatibilityService = require('../places/pet-compatibility-service');
const { BUILTIN_RAG_DOCUMENTS } = require('./rag-seed-docs');

const SPANISH_STOPWORDS = new Set([
  'a', 'al', 'algo', 'ante', 'como', 'con', 'contra', 'cual', 'cuando', 'de', 'del',
  'desde', 'donde', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era', 'eres', 'es',
  'esa', 'ese', 'eso', 'esta', 'estamos', 'estan', 'estar', 'este', 'esto', 'fue', 'ha',
  'hay', 'hola', 'ir', 'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'me', 'mi', 'mis',
  'muy', 'no', 'nos', 'o', 'para', 'pero', 'por', 'porque', 'puedo', 'que', 'quien',
  'se', 'sea', 'ser', 'si', 'sin', 'sobre', 'soy', 'su', 'sus', 'te', 'tengo', 'tu',
  'tus', 'un', 'una', 'unas', 'uno', 'unos', 'vamos', 'voy', 'y', 'ya', 'yo',
]);

const PLACE_INTENT_REGEX = /(restaurante|restaurantes|cafe|cafeteria|cafeterias|terraza|terrazas|comer|comida|desayuno|almuerzo|cena|brunch|soda|bar|cerveza|pizza|hamburguesa|sushi|donde|lugar|lugares|sitio|sitios|local|locales|escalante|escazu|santa ana|heredia|alajuela|cartago|curridabat|san pedro|rohrmoser|sabana|san jose|pet friendly|pet-friendly|paseo|salir)/i;

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return [...new Set(normalizeText(value)
    .split(' ')
    .filter((word) => word.length >= 2 && !SPANISH_STOPWORDS.has(word)))];
}

function chunkText(text, maxChars = 650, overlap = 100) {
  const clean = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buffer = '';

  for (const para of paragraphs) {
    if ((buffer + '\n\n' + para).trim().length <= maxChars) {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
    } else {
      if (buffer) chunks.push(buffer);
      if (para.length <= maxChars) {
        buffer = para;
      } else {
        for (let i = 0; i < para.length; i += Math.max(120, maxChars - overlap)) {
          chunks.push(para.slice(i, i + maxChars).trim());
        }
        buffer = '';
      }
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

class RagService {
  constructor() {
    this._initialized = false;
    this._docsCache = null;
    this._docsCacheTs = 0;
    this._cacheTtlMs = 30 * 1000;
  }

  invalidateCache() {
    this._docsCache = null;
    this._docsCacheTs = 0;
  }

  async ensureInitialized() {
    if (this._initialized) return;

    await execute(`
      CREATE TABLE IF NOT EXISTS rag_documents (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(80) NOT NULL DEFAULT 'general',
        source_type VARCHAR(40) NOT NULL DEFAULT 'admin_upload',
        source_ref VARCHAR(500) NULL,
        tags TEXT NULL,
        content TEXT NOT NULL,
        content_hash VARCHAR(64) NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const existing = await query('SELECT COUNT(*) AS cnt FROM rag_documents').catch(() => [{ cnt: 0 }]);
    const count = Number(existing?.[0]?.cnt || 0);
    if (count === 0) {
      for (const doc of BUILTIN_RAG_DOCUMENTS) {
        const hash = crypto.createHash('sha256').update(doc.content).digest('hex');
        await execute(
          `INSERT INTO rag_documents (id, title, category, source_type, source_ref, tags, content, content_hash, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [doc.id, doc.title, doc.category, doc.source_type, doc.source_ref, doc.tags, doc.content, hash]
        ).catch(() => {});
      }
    }

    this._initialized = true;
  }

  async _getActiveDocuments() {
    await this.ensureInitialized();
    const now = Date.now();
    if (this._docsCache && now - this._docsCacheTs < this._cacheTtlMs) {
      return this._docsCache;
    }
    const rows = await query(
      `SELECT id, title, category, source_type, source_ref, tags, content, content_hash, updated_at
       FROM rag_documents
       WHERE is_active = 1
       ORDER BY updated_at DESC`
    );
    this._docsCache = (rows || []).map((doc) => ({ ...doc, chunks: chunkText(doc.content) }));
    this._docsCacheTs = now;
    return this._docsCache;
  }

  async listDocuments({ category = null, sourceType = null } = {}) {
    await this.ensureInitialized();
    const clauses = ['1 = 1'];
    const params = [];
    if (category) {
      clauses.push('category = ?');
      params.push(String(category).trim());
    }
    if (sourceType) {
      clauses.push('source_type = ?');
      params.push(String(sourceType).trim());
    }
    const rows = await query(
      `SELECT id, title, category, source_type, source_ref, tags, LENGTH(content) AS content_length, content_hash, is_active, created_at, updated_at
       FROM rag_documents
       WHERE ${clauses.join(' AND ')}
       ORDER BY updated_at DESC`,
      params
    );
    return rows || [];
  }

  async upsertDocument({ id = null, title, category = 'general', sourceType = 'admin_upload', sourceRef = null, tags = '', content, published = false }) {
    await this.ensureInitialized();
    const cleanTitle = String(title || '').trim();
    const cleanContent = String(content || '').trim();
    if (!cleanTitle || cleanTitle.length < 3) {
      const err = new Error('El título del documento RAG es obligatorio (mínimo 3 caracteres).');
      err.status = 400;
      throw err;
    }
    if (!cleanContent || cleanContent.length < 20) {
      const err = new Error('El contenido del documento RAG debe tener al menos 20 caracteres.');
      err.status = 400;
      throw err;
    }

    const docId = String(id || `rag_doc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`).trim();
    const cleanCategory = String(category || 'general').trim().slice(0, 80);
    const cleanTags = Array.isArray(tags) ? tags.join(',') : String(tags || '').trim();
    const contentHash = crypto.createHash('sha256').update(cleanContent).digest('hex');

    const isActive = published === true ? 1 : 0;
    await execute(
      `INSERT INTO rag_documents (id, title, category, source_type, source_ref, tags, content, content_hash, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET title = excluded.title, category = excluded.category,
         source_type = excluded.source_type, source_ref = excluded.source_ref, tags = excluded.tags,
         content = excluded.content, content_hash = excluded.content_hash, is_active = excluded.is_active,
         updated_at = CURRENT_TIMESTAMP`,
      [docId, cleanTitle, cleanCategory, sourceType, sourceRef, cleanTags, cleanContent, contentHash, isActive]
    );

    this.invalidateCache();
    return {
      id: docId,
      title: cleanTitle,
      category: cleanCategory,
      source_type: sourceType,
      source_ref: sourceRef,
      tags: cleanTags,
      published: isActive === 1,
      chunks_count: chunkText(cleanContent).length,
      content_hash: contentHash,
    };
  }

  async deleteDocument(id) {
    await this.ensureInitialized();
    const cleanId = String(id || '').trim();
    const res = await execute('DELETE FROM rag_documents WHERE id = ?', [cleanId]);
    this.invalidateCache();
    return { deleted: (res?.changes || res?.affectedRows || 0) > 0, id: cleanId };
  }

  _scoreTokens(queryTokens, normalizedQuery, targetText, boost = 1) {
    if (!queryTokens.length || !targetText) return 0;
    const normTarget = normalizeText(targetText);
    if (!normTarget) return 0;

    const words = new Set(normTarget.split(' '));
    const paddedTarget = ` ${normTarget} `;
    let score = 0;
    if (queryTokens.length > 1 && paddedTarget.includes(` ${normalizedQuery} `)) {
      score += 6 * boost;
    }
    for (const token of queryTokens) {
      if (words.has(token)) {
        score += (token.length >= 5 ? 2.5 : 1.5) * boost;
      } else if (token.length >= 4 && [...words].some((word) =>
        word === token + 's' || word === token + 'es' ||
        token === word + 's' || token === word + 'es'
      )) {
        score += 1.25 * boost;
      }
    }
    return score;
  }

  async searchDocuments(queryText, { limit = 3 } = {}) {
    const docs = await this._getActiveDocuments();
    const normalizedQuery = normalizeText(queryText);
    const queryTokens = tokenize(queryText);
    if (!queryTokens.length) return [];

    const scored = [];
    for (const doc of docs) {
      const titleScore = this._scoreTokens(queryTokens, normalizedQuery, doc.title, 2.2);
      const tagsScore = this._scoreTokens(queryTokens, normalizedQuery, doc.tags, 2.0);
      const { chunks } = doc;

      let bestChunk = chunks[0] || '';
      let bestChunkScore = 0;
      for (const chunk of chunks) {
        const cScore = this._scoreTokens(queryTokens, normalizedQuery, chunk, 1.0);
        if (cScore > bestChunkScore) {
          bestChunkScore = cScore;
          bestChunk = chunk;
        }
      }

      const totalScore = titleScore + tagsScore + bestChunkScore;
      if (totalScore > 0) {
        scored.push({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          source_type: doc.source_type,
          source_ref: doc.source_ref,
          excerpt: bestChunk,
          score: Number(totalScore.toFixed(2)),
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, Math.min(10, Number(limit) || 3)));
  }

  async searchCatalogPlaces(queryText, { limit = 3 } = {}) {
    const normalizedQuery = normalizeText(queryText);
    const queryTokens = tokenize(queryText);
    if (!queryTokens.length) return [];

    const places = await placesRepository.findAll({ limit: 800 }).catch(() => []);
    if (!Array.isArray(places) || places.length === 0) return [];

    const petQuery = /\b(pet friendly|mascotas?|perr[oa]s?|gat[oa]s?|canin[oa]s?|felin[oa]s?)\b/.test(normalizedQuery);
    const species = [];
    if (/\b(perr[oa]s?|canin[oa]s?)\b/.test(normalizedQuery)) species.push('dog');
    if (/\b(gat[oa]s?|felin[oa]s?)\b/.test(normalizedQuery)) species.push('cat');
    const now = new Date();
    const scored = [];
    for (const place of places) {
      const nameScore = this._scoreTokens(queryTokens, normalizedQuery, place.name, 2.6);
      const addrScore = this._scoreTokens(
        queryTokens,
        normalizedQuery,
        `${place.address || ''} ${place.district || ''} ${place.canton || ''} ${place.province || ''}`,
        2.0
      );
      const metaScore = this._scoreTokens(
        queryTokens,
        normalizedQuery,
        `${place.category || ''} ${place.description || ''}`,
        1.2
      );
      let total = nameScore + addrScore + metaScore;
      if (total <= 0) continue;

      const policy = petCompatibilityService.reconcileEvidence(
        [petCompatibilityService.extractInternalPolicy(place)], now
      );
      const speciesAllowed = policy.conditions.species_allowed;
      let petAccess = policy.is_confirmed ? policy.access_status : 'unknown';
      if (petAccess === 'allowed' && species.length) {
        if (!speciesAllowed?.length) petAccess = 'unknown';
        else if (!species.every((value) => speciesAllowed.includes(value))) petAccess = 'species_not_allowed';
      }
      if (petQuery && petAccess === 'allowed') total += 2;
      if (place.photo_url) total += 0.6;
      const verified = Boolean(place.verified_by_admin ?? place.verified);
      if (verified) total += 0.5;

      scored.push({
        id: place.id,
        name: place.name,
        category: place.category || 'restaurante',
        address: place.address || place.canton || null,
        verified,
        pet_access: petAccess,
        pet_access_seating: petAccess === 'allowed' ? policy.conditions.seating_access : null,
        has_photo: Boolean(place.photo_url),
        score: Number(total.toFixed(2)),
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, Math.min(8, Number(limit) || 3)));
  }

  /**
   * Recuperación híbrida completa para inyectar contexto real en Argos / Agentes IA.
   */
  async retrieveContext(queryText, { maxDocs = 2, maxPlaces = 3, includePlaces = 'auto' } = {}) {
    const cleanQuery = String(queryText || '').trim();
    if (!cleanQuery) {
      return { documents: [], places: [], promptBlock: '' };
    }

    const shouldSearchPlaces =
      includePlaces === true ||
      (includePlaces === 'auto' && PLACE_INTENT_REGEX.test(normalizeText(cleanQuery)));

    const [documents, places] = await Promise.all([
      this.searchDocuments(cleanQuery, { limit: maxDocs }).catch(() => []),
      shouldSearchPlaces ? this.searchCatalogPlaces(cleanQuery, { limit: maxPlaces }).catch(() => []) : Promise.resolve([]),
    ]);

    const sections = [];
    if (documents.length > 0) {
      const docLines = documents.map(
        (d, idx) => `[Guía ${idx + 1}: ${d.title}]\n${d.excerpt}`
      );
      sections.push(`GUÍAS PUBLICADAS DE SYNODOS:\n${docLines.join('\n\n')}`);
    }

    if (places.length > 0) {
      const accessLabels = {
        allowed: 'admisión confirmada según el catálogo',
        not_allowed: 'no admite mascotas según el catálogo',
        species_not_allowed: 'la política confirmada no incluye todas las especies solicitadas',
        unknown: 'admisión por confirmar',
      };
      const placeLines = places.map((p) => {
        const seating = { indoor: 'interior', outdoor: 'exterior', both: 'interior y exterior' }[p.pet_access_seating];
        return `- ${p.name} (${p.category}) — ${p.address || 'dirección no registrada'}. Mascotas: ${accessLabels[p.pet_access]}${seating ? ` (${seating})` : ''}.`;
      });
      sections.push(`LOCALES REALES DEL CATÁLOGO SYNODOS (no inventes nombres):\n${placeLines.join('\n')}`);
    } else if (shouldSearchPlaces) {
      sections.push('No se recuperaron locales del catálogo para esta consulta. No sugieras nombres inventados.');
    }

    return {
      documents,
      places,
      promptBlock: sections.join('\n\n'),
    };
  }
}

module.exports = new RagService();
module.exports.chunkText = chunkText;
