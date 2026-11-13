const fs = require('fs');
const path = require('path');
const env = require('./env-config');
const { Client } = require('pg');

function getCleanUrl() {
  const url = env.db.supabaseDbUrl || process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error('SUPABASE_DB_URL no está configurada en .env');
  }
  return url.replace(/\[([^\]]+)\]/, '$1');
}

async function getClient() {
  const connectionString = getCleanUrl();
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000
  });
  await client.connect();
  return client;
}

async function migrate() {
  console.log('[Supabase CLI] Conectando a Supabase PostgreSQL...');
  const client = await getClient();
  try {
    const schemaFile = path.resolve(__dirname, '../../../supabase/supabase-esquema-mvp.sql');
    if (!fs.existsSync(schemaFile)) {
      throw new Error(`Archivo de esquema no encontrado: ${schemaFile}`);
    }
    const sql = fs.readFileSync(schemaFile, 'utf8');
    console.log('[Supabase CLI] Aplicando esquema app_private y políticas RLS...');
    await client.query(sql);
    console.log('[Supabase CLI] ✓ Esquema app_private y políticas RLS aplicadas con éxito.');
  } finally {
    await client.end();
  }
}

async function seed() {
  console.log('[Supabase CLI] Conectando a Supabase PostgreSQL...');
  const client = await getClient();
  try {
    const seedFile = path.resolve(__dirname, '../../../supabase/supabase-datos-demo.sql');
    if (!fs.existsSync(seedFile)) {
      throw new Error(`Archivo de semillas no encontrado: ${seedFile}`);
    }
    const sql = fs.readFileSync(seedFile, 'utf8');
    console.log('[Supabase CLI] Sembrando catálogo demo (feria, cafés, usuarios)...');
    await client.query(sql);

    const places = await client.query('SELECT count(*) AS total FROM app_private.places');
    const events = await client.query('SELECT count(*) AS total FROM app_private.events');
    console.log(`[Supabase CLI] ✓ Datos demo sembrados: ${places.rows[0].total} lugares, ${events.rows[0].total} eventos.`);
  } finally {
    await client.end();
  }
}

async function check() {
  console.log('[Supabase CLI] Diagnosticando conexión a Supabase...');
  const client = await getClient();
  try {
    const res = await client.query('SELECT current_user, current_database(), version()');
    console.log('[Supabase CLI] ✓ Conexión exitosa:', res.rows[0]);

    const schemas = await client.query('SELECT schema_name FROM information_schema.schemata WHERE schema_name IN (\'app_private\', \'public\')');
    console.log('[Supabase CLI] Esquemas:', schemas.rows.map(r => r.schema_name).join(', '));

    const tables = await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'app_private\' ORDER BY table_name');
    console.log(`[Supabase CLI] Tablas en app_private (${tables.rows.length}):`, tables.rows.map(r => r.table_name).join(', '));
  } finally {
    await client.end();
  }
}

async function main() {
  const cmd = process.argv[2] || 'check';
  try {
    if (cmd === 'migrate' || cmd === 'up') {
      await migrate();
    } else if (cmd === 'seed') {
      await seed();
    } else if (cmd === 'check' || cmd === 'status') {
      await check();
    } else {
      console.log(`Uso: node supabase-cli.js [migrate|seed|check]`);
    }
    process.exit(0);
  } catch (err) {
    console.error('[Supabase CLI] Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { migrate, seed, check };

