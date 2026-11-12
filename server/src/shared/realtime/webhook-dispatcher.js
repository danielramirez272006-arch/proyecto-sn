const crypto = require('crypto');
const env = require('../config/env-config');

class WebhookDispatcher {
  constructor() {
    this.targetUrl = env.webhook.url;
    this.secret = env.jwtSecret;
    this.deliveryHistory = [];
  }

  async dispatch(eventType, payload = {}) {
    if (!this.targetUrl) {
      this.recordDelivery(eventType, payload, 'SKIPPED_NO_URL');
      return { sent: false, reason: 'WEBHOOK_URL_NOT_CONFIGURED' };
    }

    const bodyString = JSON.stringify({
      event: eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(bodyString)
      .digest('hex');

    try {
      const response = await fetch(this.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Synergy-Signature': signature,
          'X-Synergy-Event': eventType,
        },
        body: bodyString,
        signal: AbortSignal.timeout(4000),
      });

      const ok = response.ok;
      this.recordDelivery(eventType, payload, ok ? 'SUCCESS' : `HTTP_${response.status}`);
      return { sent: ok, status: response.status };
    } catch (err) {
      this.recordDelivery(eventType, payload, `ERROR: ${err.message}`);
      return { sent: false, error: err.message };
    }
  }

  recordDelivery(event, payload, status) {
    this.deliveryHistory.unshift({
      event,
      status,
      timestamp: new Date().toISOString(),
    });
    if (this.deliveryHistory.length > 50) {
      this.deliveryHistory.pop();
    }
  }

  getRecentDeliveries() {
    return [...this.deliveryHistory];
  }
}

module.exports = new WebhookDispatcher();

