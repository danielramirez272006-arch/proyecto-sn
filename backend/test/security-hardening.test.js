const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';

const app = require('../src/app');
const { generateToken } = require('../src/shared/middlewares/auth-role-guard');
const { runMigrations, runSeeds } = require('../src/shared/config/database');

const RUTAS_SOLO_ADMIN = [
  ['GET', '/api/health/deep'],
  ['GET', '/api/health/system'],
  ['GET', '/api/cache/stats'],
  ['GET', '/api/audit/verify-chain'],
  ['POST', '/api/audit/chain'],
  ['GET', '/api/audit/chain/plan/pln_demo'],
  ['POST', '/api/notifications/queue'],
  ['POST', '/api/notifications/outbox/process'],
  ['GET', '/api/notifications/outbox/status'],
  ['POST', '/api/merchants/webhooks/subscriptions'],
  ['GET', '/api/merchants/webhooks/subscriptions?merchant_id=x'],
  ['DELETE', '/api/merchants/webhooks/subscriptions/sub_x?merchant_id=x'],
  ['POST', '/api/merchants/webhooks/dispatch'],
  ['GET', '/api/merchants/webhooks/deliveries'],
  ['GET', '/api/admin/duplicates'],
  ['GET', '/api/admin/places/photos/pending'],
  ['POST', '/api/admin/places/photos/upload'],
];

async function conServidor(fn) {
  await runMigrations();
  await runSeeds();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

function pedir(base, metodo, ruta, { token = null, headers = {}, body } = {}) {
  return fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: metodo === 'GET' || metodo === 'DELETE' ? undefined : JSON.stringify(body || {}),
  });
}

test('Seguridad: rutas administrativas y operativas rechazan anónimos y usuarios sin rol admin', async () => {
  await conServidor(async (base) => {
    const tokenCliente = generateToken({ id: 'usr_cli_1', role: 'client', name: 'Cliente' });

    for (const [metodo, ruta] of RUTAS_SOLO_ADMIN) {
      const anonimo = await pedir(base, metodo, ruta);
      assert.equal(anonimo.status, 401, `${metodo} ${ruta} debe responder 401 sin sesión (obtuvo ${anonimo.status})`);

      const cliente = await pedir(base, metodo, ruta, { token: tokenCliente });
      assert.equal(cliente.status, 403, `${metodo} ${ruta} debe responder 403 a un cliente (obtuvo ${cliente.status})`);
    }
  });
});

test('Seguridad: un administrador sí accede a las rutas de diagnóstico', async () => {
  await conServidor(async (base) => {
    const tokenAdmin = generateToken({ id: 'usr_admin_1', role: 'admin', name: 'Admin' });
    const sistema = await pedir(base, 'GET', '/api/health/system', { token: tokenAdmin });
    assert.equal(sistema.status, 200);
    const cache = await pedir(base, 'GET', '/api/cache/stats', { token: tokenAdmin });
    assert.equal(cache.status, 200);
  });
});

test('Seguridad: un refresh token no sirve como token de acceso admin', async () => {
  await conServidor(async (base) => {
    const { generateRefreshToken } = require('../src/shared/middlewares/auth-role-guard');
    const refresh = generateRefreshToken({ id: 'usr_admin_1', role: 'admin', name: 'Admin' });
    const res = await pedir(base, 'GET', '/api/admin/duplicates', { token: refresh });
    assert.equal(res.status, 401);
  });
});

test('Seguridad: un token firmado con otro secreto es rechazado', async () => {
  await conServidor(async (base) => {
    const jwt = require('jsonwebtoken');
    const falso = jwt.sign({ id: 'usr_admin_1', role: 'admin' }, 'secreto-falso-del-atacante', { expiresIn: '1h' });
    const res = await pedir(base, 'GET', '/api/admin/duplicates', { token: falso });
    assert.equal(res.status, 401);
  });
});

test('Seguridad: falsificar X-Forwarded-For no evade el límite de intentos de login', async () => {
  require('../src/shared/middlewares/rate-limiter').registry.reset();
  await conServidor(async (base) => {
    const estados = [];
    for (let i = 0; i < 12; i += 1) {
      const res = await pedir(base, 'POST', '/api/auth/login', {
        headers: { 'x-test-rate-limit': '1', 'x-forwarded-for': `203.0.113.${i + 1}` },
        body: { email: `intruso${i}@gotox.cr`, password: 'incorrecta' },
      });
      estados.push(res.status);
    }
    assert.notEqual(estados[9], 429, `Los primeros 10 intentos no deben bloquearse. Estados: ${estados.join(',')}`);
    assert.equal(estados[10], 429, `El 11.º intento desde la misma IP real debe bloquearse. Estados: ${estados.join(',')}`);
  });
});

test('Seguridad: límite por cuenta frena la fuerza bruta contra un mismo correo', async () => {
  require('../src/shared/middlewares/rate-limiter').registry.reset();
  await conServidor(async (base) => {
    const estados = [];
    for (let i = 0; i < 7; i += 1) {
      const res = await pedir(base, 'POST', '/api/auth/login', {
        headers: { 'x-test-rate-limit': '1' },
        body: { email: 'victima@gotox.cr', password: `intento${i}` },
      });
      estados.push(res.status);
    }
    assert.notEqual(estados[4], 429, `Los primeros 5 intentos no deben bloquearse. Estados: ${estados.join(',')}`);
    assert.equal(estados[5], 429, `El 6.º intento al mismo correo debe bloquearse. Estados: ${estados.join(',')}`);
  });
});

test('Seguridad: cabeceras endurecidas y sin X-Powered-By', async () => {
  await conServidor(async (base) => {
    const res = await pedir(base, 'GET', '/api/health');
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.match(res.headers.get('content-security-policy') || '', /default-src 'none'/);
    assert.ok(res.headers.get('permissions-policy'));
  });
});

test('Seguridad: el registro ignora la elevación a rol admin', async () => {
  await conServidor(async (base) => {
    const res = await pedir(base, 'POST', '/api/auth/register', {
      body: { name: 'Intruso', email: `intruso_${Date.now()}@gotox.cr`, password: 'Password123!', role: 'admin' },
    });
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.data.user.role, 'client');
  });
});

test('Base de datos: schema_migrations, persistencia real de user_vaults y auto-upgrade PBKDF2', async () => {
  const crypto = require('node:crypto');
  const { query, execute } = require('../src/shared/config/database');
  const clientService = require('../src/modules/client-dashboard/client-service');
  const authService = require('../src/modules/auth/auth-service');

  await runMigrations();

  // 1. Verificar registro de migraciones aplicadas (incluye 011)
  const migRows = await query('SELECT filename FROM schema_migrations WHERE filename = ?', [
    '011-user-vaults-pets-and-ai-history.sql',
  ]);
  assert.equal(migRows.length, 1);

  // 2. Persistencia real en user_vaults (sobrevive limpieza de memoria)
  const uid = `usr_vault_${Date.now()}`;
  await clientService.updateVault(uid, {
    pets: [{ name: 'Bruno', species: 'dog', weight_kg: 28 }],
    vehicle_plate_digit: 5,
  });
  clientService.vaults.clear();
  const reloaded = await clientService.getVault(uid);
  assert.equal(reloaded.pets.length, 1);
  assert.equal(reloaded.pets[0].name, 'Bruno');
  assert.equal(reloaded.vehicle_plate_digit, 5);

  // 3. Auto-upgrade de contraseña legacy sha256_ a PBKDF2-SHA512 al iniciar sesión
  const legacyEmail = `legacy_${Date.now()}@gotox.cr`;
  const plainPass = 'ClaveLegacy2026!';
  const legacyHash = `sha256_${crypto.createHash('sha256').update(plainPass).digest('hex')}`;
  await execute(
    `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'client')`,
    [`usr_leg_${Date.now()}`, 'Usuario Legacy', legacyEmail, legacyHash]
  );

  await authService.login(legacyEmail, plainPass);
  const updatedRows = await query('SELECT password_hash FROM users WHERE LOWER(email) = ?', [legacyEmail]);
  assert.ok(updatedRows[0].password_hash.includes(':'), 'La contraseña legacy debe haberse migrado a PBKDF2 (salt:hash)');

  // 4. Limpieza de refresh_tokens revocados o expirados
  const activeId = `rt_active_${Date.now()}`;
  const revokedId = `rt_revoked_${Date.now()}`;
  const expiredId = `rt_expired_${Date.now()}`;
  await execute(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked) VALUES (?, 'usr_admin_1', 'h1', '2099-01-01 00:00:00', FALSE)`,
    [activeId]
  );
  await execute(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked) VALUES (?, 'usr_admin_1', 'h2', '2099-01-01 00:00:00', TRUE)`,
    [revokedId]
  );
  await execute(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked) VALUES (?, 'usr_admin_1', 'h3', '2020-01-01 00:00:00', FALSE)`,
    [expiredId]
  );

  await authService.purgeExpiredRefreshTokens();
  const remaining = await query('SELECT id FROM refresh_tokens WHERE id IN (?, ?, ?)', [activeId, revokedId, expiredId]);
  assert.deepEqual(remaining.map((r) => r.id), [activeId]);
});
