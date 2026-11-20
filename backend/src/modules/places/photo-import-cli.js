require('dotenv').config();
const { initDatabase, runMigrations, query } = require('../../shared/config/database');
const photoBatchImporter = require('./photo-batch-importer');

function parseArgs(argv) {
  const args = { cmd: 'import', dryRun: true, resume: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === 'reconcile' || a === 'report' || a === 'import') {
      args.cmd = a;
    } else if (a === '--commit') {
      args.dryRun = false;
    } else if (a === '--dry-run') {
      args.dryRun = true;
    } else if (a === '--resume') {
      args.resume = true;
    } else if (a.startsWith('--manifest=')) {
      args.manifest = a.slice('--manifest='.length);
    } else if (a.startsWith('--dir=')) {
      args.dir = a.slice('--dir='.length);
    } else if (a.startsWith('--batch-id=')) {
      args.batchId = a.slice('--batch-id='.length);
    } else if (a.startsWith('--concurrency=')) {
      args.concurrency = Number(a.slice('--concurrency='.length));
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await initDatabase();
  await runMigrations();

  if (args.cmd === 'reconcile') {
    const res = await photoBatchImporter.reconcileStorageAndDb();
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.missing_in_storage.length > 0 ? 2 : 0);
  }

  if (args.cmd === 'report') {
    const rows = args.batchId
      ? await query('SELECT * FROM photo_import_batches WHERE batch_id = ?', [args.batchId])
      : await query('SELECT batch_id, status, total_items, imported_count, skipped_count, pending_count, failed_count, updated_at FROM photo_import_batches ORDER BY created_at DESC LIMIT 20');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  }

  if (!args.manifest || !args.dir) {
    console.error('Uso: node photo-import-cli.js import --manifest=<archivo.csv|json> --dir=<carpeta> [--dry-run|--commit] [--batch-id=ID --resume] [--concurrency=2]');
    process.exit(1);
  }

  const report = await photoBatchImporter.importBatch({
    manifestPath: args.manifest,
    baseDir: args.dir,
    dryRun: args.dryRun,
    batchId: args.batchId,
    resume: args.resume,
    concurrency: args.concurrency,
  });

  console.log(JSON.stringify(report, null, 2));

  if (report.status === 'blocked') process.exit(3);
  if (report.failed_count > 0) process.exit(2);
  process.exit(0);
}

main().catch((err) => {
  console.error('[PhotoImportCLI] Error fatal:', err.message);
  process.exit(1);
});
