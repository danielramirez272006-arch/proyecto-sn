require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initDatabase, query } = require('../../shared/config/database');
const geminiClient = require('../../shared/config/gemini-config');
const { resolveSafeLocalPath, inspectAndSanitizeImage } = require('./photo-security-validator');

function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function collectImageFiles(baseDir, currentDir = baseDir, acc = []) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      collectImageFiles(baseDir, full, acc);
    } else if (entry.isFile() && /\.(jpe?g|png|webp)$/i.test(entry.name)) {
      acc.push(path.relative(baseDir, full));
    }
  }
  return acc;
}

async function suggestWithGemini({ relPath, placesCatalog }) {
  if (!geminiClient.isConfigured()) {
    return { suggested_place_id: '', suggested_type: 'otro', confidence: 'none', note: 'Gemini no configurado; asignar place_id manualmente' };
  }

  const catalogText = placesCatalog
    .slice(0, 40)
    .map((p) => `- ${p.id}: ${p.name} (${p.address || ''})`)
    .join('\n');

  const prompt = `Eres un asistente de clasificación en borrador. NO inventes lugares ni apruebes derechos.
Archivo relativo: "${relPath}"
Catálogo de lugares reales:
${catalogText}

Si el nombre de archivo o carpeta coincide claramente con un lugar del catálogo, responde JSON estricto:
{"suggested_place_id":"<id o vacio>","suggested_type":"fachada|interior|terraza|plato|otro","confidence":"high|low|none","note":"motivo breve"}
Si no hay coincidencia clara, deja suggested_place_id vacío.`;

  try {
    const resp = await geminiClient.generateJson(prompt);
    if (resp && typeof resp === 'object') {
      return {
        suggested_place_id: String(resp.suggested_place_id || '').trim(),
        suggested_type: ['fachada', 'interior', 'terraza', 'plato', 'otro'].includes(resp.suggested_type)
          ? resp.suggested_type
          : 'otro',
        confidence: resp.confidence || 'low',
        note: String(resp.note || 'Sugerencia de borrador por IA; requiere revisión humana'),
      };
    }
  } catch {
    // Fallback sin IA
  }
  return { suggested_place_id: '', suggested_type: 'otro', confidence: 'none', note: 'Asignar place_id y licencia manualmente' };
}

async function main() {
  const argv = process.argv.slice(2);
  let dir = null;
  let out = 'place-photos-draft.csv';
  let useAi = false;

  for (const a of argv) {
    if (a.startsWith('--dir=')) dir = a.slice('--dir='.length);
    else if (a.startsWith('--out=')) out = a.slice('--out='.length);
    else if (a === '--ai') useAi = true;
  }

  if (!dir) {
    console.error('Uso: node photo-ai-draft-cli.js --dir=<carpeta_fotos> [--out=borrador.csv] [--ai]');
    process.exit(1);
  }

  const absDir = path.resolve(dir);
  if (!fs.existsSync(absDir)) {
    console.error(`Carpeta no encontrada: ${absDir}`);
    process.exit(1);
  }

  await initDatabase();
  const placesCatalog = await query('SELECT id, name, address FROM places LIMIT 200').catch(() => []);
  const files = collectImageFiles(absDir);

  const header = [
    'place_id',
    'branch_label',
    'file',
    'photo_type',
    'author',
    'license',
    'is_cover',
    'ai_confidence',
    'review_note',
  ];
  const lines = [header.join(',')];

  for (const relPath of files) {
    try {
      const safePath = resolveSafeLocalPath(absDir, relPath);
      const buf = fs.readFileSync(safePath);
      inspectAndSanitizeImage(buf);
      const suggestion = useAi
        ? await suggestWithGemini({ relPath, placesCatalog })
        : { suggested_place_id: '', suggested_type: 'otro', confidence: 'manual', note: 'Pendiente de completar place_id, autor y licencia' };

      lines.push(
        [
          suggestion.suggested_place_id,
          '',
          relPath.replace(/\\/g, '/'),
          suggestion.suggested_type,
          '',
          '',
          'false',
          suggestion.confidence,
          suggestion.note,
        ]
          .map(escapeCsv)
          .join(',')
      );
    } catch (err) {
      lines.push(['', '', relPath.replace(/\\/g, '/'), 'otro', '', '', 'false', 'invalid', err.message].map(escapeCsv).join(','));
    }
  }

  const outPath = path.resolve(out);
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, files_scanned: files.length, output: outPath, ai_enabled: useAi }, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[PhotoDraftCLI] Error:', err.message);
    process.exit(1);
  });
}

module.exports = { collectImageFiles, suggestWithGemini };
