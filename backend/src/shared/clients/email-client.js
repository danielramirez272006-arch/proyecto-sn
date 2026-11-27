const env = require('../config/env-config');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class EmailClient {
  constructor() {
    this.sentEmails = [];
    this.failNext = false;
  }

  getConfig() {
    const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
    const isPlaceholder = !brevoApiKey || brevoApiKey.startsWith('REEMPLAZAR_');
    const explicitProvider = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
    const provider = explicitProvider || (!isPlaceholder ? 'brevo' : 'local');

    return {
      provider,
      brevoApiKey: isPlaceholder ? '' : brevoApiKey,
      brevoApiUrl: process.env.BREVO_API_URL || env.email?.brevoApiUrl || 'https://api.brevo.com/v3/smtp/email',
      senderEmail: process.env.BREVO_SENDER_EMAIL || env.email?.senderEmail || 'no-reply@synodos.cr',
      senderName: process.env.BREVO_SENDER_NAME || env.email?.senderName || 'Synodos Pet OS',
      replyTo: process.env.BREVO_REPLY_TO || env.email?.replyTo || '',
      timeoutMs: parseInt(process.env.EMAIL_TIMEOUT_MS || String(env.email?.timeoutMs || 10000), 10),
    };
  }

  isBrevoConfigured() {
    const cfg = this.getConfig();
    return cfg.provider === 'brevo' && Boolean(cfg.brevoApiKey);
  }

  getStatus() {
    const cfg = this.getConfig();
    const configured = this.isBrevoConfigured();
    return {
      provider: configured ? 'brevo' : 'local',
      configured,
      senderEmail: cfg.senderEmail,
      senderName: cfg.senderName,
    };
  }

  async _sendViaBrevo({ to, toName, subject, html, text, templateId, params, idempotencyKey, tags }, cfg) {
    const payload = {
      sender: {
        name: cfg.senderName,
        email: cfg.senderEmail,
      },
      to: [
        {
          email: to,
          ...(toName ? { name: toName } : {}),
        },
      ],
    };

    if (templateId && Number.isInteger(Number(templateId)) && Number(templateId) > 0) {
      payload.templateId = Number(templateId);
      if (params && typeof params === 'object') {
        payload.params = params;
      }
      if (subject) {
        payload.subject = subject;
      }
    } else {
      payload.subject = subject;
      payload.htmlContent = html || `<p>${escapeHtml(text || subject)}</p>`;
      payload.textContent = text || subject;
    }

    if (cfg.replyTo) {
      payload.replyTo = { email: cfg.replyTo };
    }
    if (Array.isArray(tags) && tags.length > 0) {
      payload.tags = tags.slice(0, 5);
    }
    if (idempotencyKey) {
      payload.headers = { 'X-Idempotency-Key': String(idempotencyKey) };
    }

    const res = await fetch(cfg.brevoApiUrl, {
      method: 'POST',
      headers: {
        'api-key': cfg.brevoApiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`BREVO_EMAIL_ERROR (${res.status}): ${errBody.slice(0, 240)}`);
    }

    const data = await res.json().catch(() => ({}));
    return {
      messageId: data.messageId || `brevo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
  }

  async sendMail({
    to,
    toName = '',
    subject,
    html,
    text,
    templateId = null,
    params = null,
    idempotencyKey = null,
    tags = [],
    forceTransport = false,
  }) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('SIMULATED_EMAIL_TRANSPORT_ERROR: Servidor SMTP no disponible');
    }

    const cfg = this.getConfig();
    const useBrevo = this.isBrevoConfigured() && (!env.isTest || forceTransport);
    const sentAt = new Date().toISOString();

    let messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let provider = 'local';

    if (useBrevo) {
      const brevoRes = await this._sendViaBrevo(
        { to, toName, subject, html, text, templateId, params, idempotencyKey, tags },
        cfg
      );
      messageId = brevoRes.messageId;
      provider = 'brevo';
    }

    const emailRecord = {
      id: messageId,
      provider,
      to,
      subject,
      html,
      text: text || subject,
      templateId: templateId || null,
      idempotencyKey,
      sentAt,
      status: 'DELIVERED',
    };

    this.sentEmails.push(emailRecord);
    if (this.sentEmails.length > 200) {
      this.sentEmails.shift();
    }

    return { ok: true, provider, messageId: emailRecord.id, timestamp: emailRecord.sentAt };
  }

  getSentEmails() {
    return [...this.sentEmails];
  }

  clearSentEmails() {
    this.sentEmails = [];
  }

  simulateFailure() {
    this.failNext = true;
  }
}

module.exports = new EmailClient();
