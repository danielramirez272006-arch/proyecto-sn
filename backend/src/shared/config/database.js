const fs = require('fs');
const path = require('path');
const env = require('./env-config');
const metricsCollector = require('../telemetry/metrics-collector');

let dbClient = null;
let activeDialect = 'sqlite';
let initializationPromise = null;

async function initDatabase() {
  if (dbClient) return { client: dbClient, dialect: activeDialect };

  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    // 1. Probar Supabase / PostgreSQL si está configurado
    if ((env.db.dialect === 'postgres' || env.db.dialect === 'supabase' || env.db.supabaseDbUrl) && env.nodeEnv !== 'test') {
      try {
        const { Pool } = require('pg');
        let poolConfig;
        if (env.db.supabaseDbUrl) {
          const cleanedUrl = env.db.supabaseDbUrl.replace(/\[([^\]]+)\]/, '$1');
          poolConfig = { 
            connectionString: cleanedUrl, 
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
          };
        } else {
          poolConfig = {
            host: env.db.host,
            port: env.db.port || 5432,
            user: env.db.user,
            password: env.db.password,
            database: env.db.database,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
          };
        }
        const pool = new Pool(poolConfig);
        pool.on('connect', (client) => {
          client.query('SET search_path TO app_private, public').catch(() => {});
        });
        const testConn = await pool.connect();
        await testConn.query('SET search_path TO app_private, public').catch(() => {});
        testConn.release();

        dbClient = pool;
        activeDialect = 'postgres';
        console.log('[DB] Conectado exitosamente a Supabase PostgreSQL');
        return { client: dbClient, dialect: activeDialect };
      } catch (err) {
        console.warn(`[DB] Supabase PostgreSQL no disponible (${err.message}). Evaluando MySQL o SQLite de respaldo.`);
      }
    }

    // 2. Probar MySQL si fue configurado
    if (env.db.dialect === 'mysql' && env.nodeEnv !== 'test') {
      try {
        const mysql = require('mysql2/promise');
        const pool = mysql.createPool({
          host: env.db.host,
          port: env.db.port,
          user: env.db.user,
          password: env.db.password,
          database: env.db.database,
          waitForConnections: true,
          connectionLimit: env.db.connectionLimit,
          connectTimeout: 2000,
        });

        const connection = await pool.getConnection();
        connection.release();

        dbClient = pool;
        activeDialect = 'mysql';
        console.log(`[DB] Conectado exitosamente a MySQL (${env.db.host}:${env.db.port}/${env.db.database})`);
        return { client: dbClient, dialect: activeDialect };
      } catch (err) {
        console.warn(`[DB] MySQL no está disponible en ${env.db.host}:${env.db.port} (${err.code || err.message}). Activando motor relacional SQLite integrado.`);
      }
    }

    // 3. Fallback inteligente a SQLite integrado (Node v24 DatabaseSync)
    const { DatabaseSync } = require('node:sqlite');
    const dbFile = env.nodeEnv === 'test'
      ? ':memory:'
      : path.join(__dirname, '../../../data/local-sqlite-dev.db');

    const dir = path.dirname(dbFile);
    if (dbFile !== ':memory:' && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const sqliteDb = new DatabaseSync(dbFile);
    sqliteDb.exec('PRAGMA foreign_keys = ON;');

    dbClient = sqliteDb;
    activeDialect = 'sqlite';
    console.log(`[DB] Motor SQLite activado: ${dbFile}`);
    return { client: dbClient, dialect: activeDialect };
  })();

  return initializationPromise;
}

async function query(sql, rawParams = []) {
  const params = rawParams.map(p => p === undefined ? null : p);
  try {
    const { client, dialect } = await initDatabase();
    metricsCollector.recordDbQuery(true);

    if (dialect === 'postgres') {
      let paramIdx = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
      const res = await client.query(pgSql, params);
      return res.rows;
    }

    if (dialect === 'mysql') {
      const [rows] = await client.execute(sql, params);
      return rows;
    }

    const stmt = client.prepare(sql);
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
      return stmt.all(...params);
    } else {
      return stmt.run(...params);
    }
  } catch (err) {
    metricsCollector.recordDbQuery(false);
    throw err;
  }
}

async function execute(sql, params = []) {
  return query(sql, params);
}

async function transaction(fn) {
  const { client, dialect } = await initDatabase();

  if (dialect === 'postgres') {
    const connection = await client.connect();
    await connection.query('SET search_path TO app_private, public').catch(() => {});
    await connection.query('BEGIN');
    try {
      const runner = {
        query: async (sql, rawParams = []) => {
          const params = rawParams.map(p => p === undefined ? null : p);
          let paramIdx = 1;
          const pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
          const res = await connection.query(pgSql, params);
          return res.rows;
        },
        execute: async (sql, rawParams = []) => {
          const params = rawParams.map(p => p === undefined ? null : p);
          let paramIdx = 1;
          const pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
          const res = await connection.query(pgSql, params);
          return res.rows;
        }
      };
      const result = await fn(runner);
      await connection.query('COMMIT');
      return result;
    } catch (err) {
      await connection.query('ROLLBACK');
      throw err;
    } finally {
      connection.release();
    }
  }

  if (dialect === 'mysql') {
    const connection = await client.getConnection();
    await connection.beginTransaction();
    try {
      const runner = {
        query: async (sql, rawParams = []) => {
          const params = rawParams.map(p => p === undefined ? null : p);
          const [rows] = await connection.execute(sql, params);
          return rows;
        },
        execute: async (sql, rawParams = []) => {
          const params = rawParams.map(p => p === undefined ? null : p);
          const [rows] = await connection.execute(sql, params);
          return rows;
        }
      };
      const result = await fn(runner);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // SQLite transaction
  client.exec('BEGIN TRANSACTION;');
  try {
    const runner = {
      query: async (sql, rawParams = []) => {
        const params = rawParams.map(p => p === undefined ? null : p);
        const stmt = client.prepare(sql);
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          return stmt.all(...params);
        } else {
          return stmt.run(...params);
        }
      },
      execute: async (sql, rawParams = []) => {
        const params = rawParams.map(p => p === undefined ? null : p);
        const stmt = client.prepare(sql);
        return stmt.run(...params);
      }
    };
    const result = await fn(runner);
    client.exec('COMMIT;');
    return result;
  } catch (err) {
    client.exec('ROLLBACK;');
    throw err;
  }
}

async function checkHealth() {
  try {
    const { dialect } = await initDatabase();
    await query('SELECT 1 AS ok');
    return { ok: true, dialect, status: 'connected' };
  } catch (err) {
    return { ok: false, dialect: activeDialect, status: 'error', error: err.message };
  }
}

async function runMigrations() {
  const { client, dialect } = await initDatabase();
  const migrationsDir = path.join(__dirname, '../../../db/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    let sql = fs.readFileSync(fullPath, 'utf8');

    if (dialect === 'sqlite') {
      sql = sql.replace(/ON UPDATE CURRENT_TIMESTAMP/gi, '');
      sql = sql.replace(/DECIMAL\(\d+,\s*\d+\)/gi, 'NUMERIC');
    }

    if (dialect === 'postgres') {
      await client.query('CREATE SCHEMA IF NOT EXISTS app_private; SET search_path TO app_private, public;').catch(() => {});
      sql = sql.replace(/TINYINT\(1\)/gi, 'BOOLEAN');
      sql = sql.replace(/CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/gi, 'CURRENT_TIMESTAMP');
      const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        await client.query(stmt);
      }
    } else if (dialect === 'mysql') {
      const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        await client.query(stmt);
      }
    } else {
      client.exec(sql);
    }
  }
  return { success: true, dialect, filesApplied: files };
}

async function runSeeds() {
  const { client, dialect } = await initDatabase();
  const seedsDir = path.join(__dirname, '../../../db/seeds');
  const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const fullPath = path.join(seedsDir, file);
    let sql = fs.readFileSync(fullPath, 'utf8');

    if (dialect === 'postgres') {
      await client.query('SET search_path TO app_private, public;').catch(() => {});
      const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        await client.query(stmt);
      }
    } else if (dialect === 'mysql') {
      sql = sql.replace(/ON CONFLICT \(id\) DO NOTHING/gi, 'ON DUPLICATE KEY UPDATE id=id');
      sql = sql.replace(/ON CONFLICT \(plan_id, guest_id, option_id\) DO UPDATE SET vote_type = EXCLUDED\.vote_type, updated_at = CURRENT_TIMESTAMP/gi, 
        'ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type), updated_at = CURRENT_TIMESTAMP');
      
      const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        await client.query(stmt);
      }
    } else {
      client.exec(sql);
    }
  }
  return { success: true, dialect, filesApplied: files };
}

module.exports = {
  initDatabase,
  query,
  execute,
  transaction,
  withTransaction: transaction,
  checkHealth,
  runMigrations,
  runSeeds,
  getDialect: () => activeDialect,
  resetForTesting: () => { dbClient = null; initializationPromise = null; }
};
