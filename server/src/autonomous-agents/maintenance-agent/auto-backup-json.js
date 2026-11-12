const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class AutoBackupJson {
  async performBackup() {
    const dataDir = path.join(__dirname, '../../../data');
    const backupsDir = path.join(dataDir, 'backups');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    const combinedData = {};

    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(dataDir, f), 'utf8');
        combinedData[f] = JSON.parse(content);
      } catch (err) {
        console.warn(`[AutoBackup] Omitiendo archivo no parseable ${f}`);
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-snapshot-${timestamp}.json.gz`;
    const targetFile = path.join(backupsDir, backupName);

    const jsonBuffer = Buffer.from(JSON.stringify(combinedData, null, 2), 'utf8');
    const compressed = zlib.gzipSync(jsonBuffer);
    fs.writeFileSync(targetFile, compressed);

    console.log(`[AutoBackup] Copia de seguridad atómica creada exitosamente: ${targetFile} (${compressed.length} bytes)`);
    return { ok: true, backupFile: backupName, bytes: compressed.length };
  }
}

if (require.main === module) {
  new AutoBackupJson().performBackup().catch(console.error);
}

module.exports = new AutoBackupJson();

