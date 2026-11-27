process.env.NODE_ENV = 'test';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const emailClient = require('../src/shared/clients/email-client');

describe('EmailClient — Modo local y preparación Brevo API v3', () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  };

  afterEach(() => {
    global.fetch = originalFetch;
    emailClient.clearSentEmails();
    for (const [k, v] of Object.entries(originalEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('usa modo local de respaldo cuando BREVO_API_KEY no está configurada', async () => {
    delete process.env.BREVO_API_KEY;
    delete process.env.EMAIL_PROVIDER;

    assert.equal(emailClient.isBrevoConfigured(), false);
    assert.equal(emailClient.getStatus().provider, 'local');

    const res = await emailClient.sendMail({
      to: 'usuario@synodos.cr',
      subject: 'Prueba local',
      text: 'Código 123456',
    });

    assert.equal(res.ok, true);
    assert.equal(res.provider, 'local');
    assert.equal(emailClient.getSentEmails().length, 1);
  });

  it('envía payload válido a Brevo REST API v3 cuando BREVO_API_KEY está configurada', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test-key-12345';
    process.env.BREVO_SENDER_EMAIL = 'soporte@synodos.cr';
    process.env.BREVO_SENDER_NAME = 'Synodos Pet OS';

    let capturedUrl = null;
    let capturedOptions = null;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 201,
        json: async () => ({ messageId: '<20261127.brevo@synodos.cr>' }),
      };
    };

    assert.equal(emailClient.isBrevoConfigured(), true);
    assert.equal(emailClient.getStatus().provider, 'brevo');

    const res = await emailClient.sendMail({
      to: 'carlos@ejemplo.cr',
      toName: 'Carlos',
      subject: 'Recuperación de contraseña — Synodos Pet OS',
      text: 'Tu código es ABC123',
      html: '<p>Tu código es <b>ABC123</b></p>',
      idempotencyKey: 'ntf_reset_1',
      tags: ['auth', 'password-reset'],
      forceTransport: true,
    });

    assert.equal(res.ok, true);
    assert.equal(res.provider, 'brevo');
    assert.equal(res.messageId, '<20261127.brevo@synodos.cr>');
    assert.equal(capturedUrl, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(capturedOptions.method, 'POST');
    assert.equal(capturedOptions.headers['api-key'], 'xkeysib-test-key-12345');

    const body = JSON.parse(capturedOptions.body);
    assert.deepEqual(body.sender, { name: 'Synodos Pet OS', email: 'soporte@synodos.cr' });
    assert.deepEqual(body.to, [{ email: 'carlos@ejemplo.cr', name: 'Carlos' }]);
    assert.equal(body.subject, 'Recuperación de contraseña — Synodos Pet OS');
    assert.equal(body.textContent, 'Tu código es ABC123');
    assert.equal(body.htmlContent, '<p>Tu código es <b>ABC123</b></p>');
    assert.deepEqual(body.tags, ['auth', 'password-reset']);
    assert.equal(body.headers['X-Idempotency-Key'], 'ntf_reset_1');
  });

  it('envía templateId y params a Brevo cuando se usa una plantilla visual', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test-key-12345';
    process.env.BREVO_SENDER_EMAIL = 'soporte@synodos.cr';

    let capturedBody = null;
    global.fetch = async (_url, options) => {
      capturedBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 201,
        json: async () => ({ messageId: '<20261127.tpl1@synodos.cr>' }),
      };
    };

    const res = await emailClient.sendMail({
      to: 'carlos@ejemplo.cr',
      toName: 'Carlos',
      subject: 'Recuperación de contraseña — Synodos Pet OS',
      templateId: 1,
      params: { NAME: 'Carlos', RESET_CODE: 'XYZ999', RESET_URL: 'https://synodos.cr/acceso' },
      forceTransport: true,
    });

    assert.equal(res.ok, true);
    assert.equal(res.provider, 'brevo');
    assert.equal(capturedBody.templateId, 1);
    assert.deepEqual(capturedBody.params, {
      NAME: 'Carlos',
      RESET_CODE: 'XYZ999',
      RESET_URL: 'https://synodos.cr/acceso',
    });
    assert.equal(capturedBody.htmlContent, undefined);
  });

  it('lanza error claro cuando Brevo responde con estado HTTP de error', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-invalid';
    global.fetch = async () => ({
      ok: false,
      status: 401,
      text: async () => '{"code":"unauthorized","message":"Key not found"}',
    });

    await assert.rejects(
      () => emailClient.sendMail({
        to: 'usuario@synodos.cr',
        subject: 'Reset',
        text: 'Token',
        forceTransport: true,
      }),
      /BREVO_EMAIL_ERROR \(401\)/
    );
  });
});
