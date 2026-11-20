const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';

const app = require('../src/app');
const { runMigrations, runSeeds, query } = require('../src/shared/config/database');
const { generateToken } = require('../src/shared/middlewares/auth-role-guard');
const { validateBody } = require('../src/middlewares/input-validator');
const { sanitizePiiForPrompt } = require('../src/services/ai-agents-hub-service');

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

function reqJson(base, method, path, { token = null, body } = {}) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
  });
}

test('Rúbrica: middleware validateBody valida tipos, requeridos y valores exactos', () => {
  const mw = validateBody({
    email: { required: true, type: 'string' },
    acceptTerms: { required: true, type: 'boolean', equals: true },
  });

  let statusCaptured = null;
  let nextCalled = false;
  const fakeRes = {
    status(code) { statusCaptured = code; return this; },
    json() { return this; },
  };

  mw({ body: { email: 'a@b.cr', acceptTerms: false } }, fakeRes, () => { nextCalled = true; });
  assert.equal(statusCaptured, 400);
  assert.equal(nextCalled, false);

  statusCaptured = null;
  mw({ body: { email: 'a@b.cr', acceptTerms: true } }, fakeRes, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(statusCaptured, null);
});

test('Rúbrica: registro exige acceptTerms/acceptPrivacy, usa bcrypt, guarda user_roles y user_consents', async () => {
  await conServidor(async (base) => {
    const email = `ley8968_${Date.now()}@gotox.cr`;

    // Sin aceptación de términos/privacidad -> 400
    const bad = await reqJson(base, 'POST', '/api/auth/register', {
      body: { name: 'Sofía', email, password: 'Password123!' },
    });
    assert.equal(bad.status, 400);

    // Con aceptación explícita -> 201
    const ok = await reqJson(base, 'POST', '/api/auth/register', {
      body: {
        name: 'Sofía',
        email,
        password: 'Password123!',
        acceptTerms: true,
        acceptPrivacy: true,
        termsVersion: '2026-11-v2',
      },
    });
    assert.equal(ok.status, 201);
    const json = await ok.json();
    const userId = json.data.user.id;

    // Verificar hash bcrypt ($2a$ / $2b$)
    const users = await query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    assert.ok(users[0].password_hash.startsWith('$2a$') || users[0].password_hash.startsWith('$2b$'));

    // Verificar 3FN user_roles y user_consents
    const roles = await query('SELECT role_id FROM user_roles WHERE user_id = ?', [userId]);
    assert.equal(roles.length, 1);
    assert.equal(roles[0].role_id, 'role_client');

    const consents = await query('SELECT terms_version, privacy_accepted FROM user_consents WHERE user_id = ?', [userId]);
    assert.equal(consents.length, 1);
    assert.equal(consents[0].terms_version, '2026-11-v2');
  });
});

test('Rúbrica: flujo completo forgot-password -> reset-password -> delete-account (Ley 8968)', async () => {
  await conServidor(async (base) => {
    const email = `ciclo_${Date.now()}@gotox.cr`;
    const reg = await reqJson(base, 'POST', '/api/auth/register', {
      body: { name: 'Carlos', email, password: 'ClaveInicial1!', acceptTerms: true, acceptPrivacy: true },
    });
    assert.equal(reg.status, 201);
    const regJson = await reg.json();
    const userId = regJson.data.user.id;

    // 1. Solicitar recuperación
    const forgot = await reqJson(base, 'POST', '/api/auth/forgot-password', { body: { email } });
    assert.equal(forgot.status, 200);
    const forgotJson = await forgot.json();
    assert.ok(forgotJson.data.dev_reset_token, 'En entorno no productivo debe devolver dev_reset_token');

    // 2. Restablecer contraseña
    const reset = await reqJson(base, 'POST', '/api/auth/reset-password', {
      body: { email, token: forgotJson.data.dev_reset_token, newPassword: 'NuevaClaveSegura2!' },
    });
    assert.equal(reset.status, 200);

    // Clave vieja falla; clave nueva funciona
    const oldLogin = await reqJson(base, 'POST', '/api/auth/login', {
      body: { email, password: 'ClaveInicial1!' },
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await reqJson(base, 'POST', '/api/auth/login', {
      body: { email, password: 'NuevaClaveSegura2!' },
    });
    assert.equal(newLogin.status, 200);
    const newToken = (await newLogin.json()).data.token;

    // 3. Baja de cuenta y anonimización (Ley N.º 8968)
    const delBad = await reqJson(base, 'POST', '/api/auth/delete-account', {
      token: newToken,
      body: { password: 'ClaveIncorrecta' },
    });
    assert.equal(delBad.status, 401);

    const delOk = await reqJson(base, 'POST', '/api/auth/delete-account', {
      token: newToken,
      body: { password: 'NuevaClaveSegura2!', reason: 'Ejercicio derecho de supresión' },
    });
    assert.equal(delOk.status, 200);
    const delJson = await delOk.json();
    assert.equal(delJson.data.status, 'completed');

    const delReqs = await query('SELECT * FROM data_deletion_requests WHERE user_id = ?', [userId]);
    assert.equal(delReqs.length, 1);

    const anonUser = await query('SELECT email, name FROM users WHERE id = ?', [userId]);
    assert.match(anonUser[0].email, /^deleted_.*@anonymized\.gotox\.local$/);
  });
});

test('Rúbrica: los 8 agentes de IA se ejecutan por API, respetan RBAC, anonimizan PII y registran en ai_interaction_logs', async () => {
  assert.equal(
    sanitizePiiForPrompt('Contactar a juan@gotox.cr o al 8888-7777 cédula 1-1234-5678'),
    'Contactar a [EMAIL_REDACTADO] o al [TELEFONO_REDACTADO] cédula [CEDULA_REDACTADA]'
  );

  await conServidor(async (base) => {
    const adminToken = generateToken({ id: 'usr_admin_1', role: 'admin', name: 'Admin' });
    const clientToken = generateToken({ id: 'usr_cli_1', role: 'client', name: 'Cliente' });

    // Catálogo debe listar los 8 agentes
    const listRes = await reqJson(base, 'GET', '/api/agents');
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.equal(listJson.data.agents.length, 8);

    // Cliente no puede ejecutar agente exclusivo de admin
    const forbiddenRes = await reqJson(base, 'POST', '/api/agents/daily-briefing/run', {
      token: clientToken,
      body: {},
    });
    assert.equal(forbiddenRes.status, 403);

    // Ejecutar los 8 agentes como admin y verificar registro en ai_interaction_logs
    const agentNames = listJson.data.agents.map((a) => a.name);
    for (const name of agentNames) {
      const runRes = await reqJson(base, 'POST', `/api/agents/${name}/run`, {
        token: adminToken,
        body: { message: 'Prueba de agente sin PII juan@gotox.cr', text: 'Café 2500 CRC' },
      });
      assert.equal(runRes.status, 200, `Agente ${name} debe responder 200`);
      const runJson = await runRes.json();
      assert.ok(runJson.data.log_id, `Agente ${name} debe devolver log_id en BD`);
    }

    // Consultar bitácora administrativa de IA
    const logsRes = await reqJson(base, 'GET', '/api/agents/logs?limit=20', { token: adminToken });
    assert.equal(logsRes.status, 200);
    const logsJson = await logsRes.json();
    assert.ok(logsJson.data.logs.length >= 8);
    // Verificar que ningún log guardó el correo en texto plano
    for (const log of logsJson.data.logs) {
      assert.equal(String(log.input_summary || '').includes('juan@gotox.cr'), false);
    }
  });
});
