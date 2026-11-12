const { runMigrations, runSeeds } = require('./database');

async function main() {
  const command = process.argv[2] || 'up';

  try {
    if (command === 'up' || command === 'migrate') {
      console.log('[DB CLI] Aplicando migraciones...');
      const res = await runMigrations();
      console.log('[DB CLI] Migraciones aplicadas con éxito:', res.filesApplied);
    } else if (command === 'seed') {
      console.log('[DB CLI] Aplicando seeds de catálogo...');
      const res = await runSeeds();
      console.log('[DB CLI] Seeds aplicados con éxito:', res.filesApplied);
    } else {
      console.log(`[DB CLI] Comando desconocido: ${command}. Use 'up' o 'seed'.`);
    }
    process.exit(0);
  } catch (err) {
    console.error('[DB CLI] Error ejecutando comando:', err);
    process.exit(1);
  }
}

main();

