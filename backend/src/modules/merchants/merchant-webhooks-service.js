const crypto = require('node:crypto');
const { query, execute } = require('../../shared/config/database');

class MerchantWebhooksService {
  /**
   * Registra una suscripción a webhooks para un comercio aliado
   */
  async registerSubscription({ merchantId, targetUrl, events = ['*'] }) {
    if (!merchantId || !targetUrl) {
      throw new Error('merchantId y targetUrl son obligatorios para registrar un webhook');
    }

    try {
      new URL(targetUrl);
    } catch {
      throw new Error('targetUrl debe ser una URL válida (ej: https://comercio.cr/webhook)');
    }

    const id = `wh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const secret = `sec_${crypto.randomBytes(24).toString('hex')}`;
    const eventsJson = JSON.stringify(Array.isArray(events) ? events : [events]);

    await execute(
      `INSERT INTO merchant_webhooks (id, merchant_id, target_url, secret, events_json, active, created_at)
       VALUES (?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP)`,
      [id, merchantId, targetUrl, secret, eventsJson]
    );

    return {
      id,
      merchant_id: merchantId,
      target_url: targetUrl,
      secret,
      events: Array.isArray(events) ? events : [events],
      active: true,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Lista las suscripciones de un comercio
   */
  async listSubscriptions(merchantId) {
    const rows = await query(
      'SELECT id, merchant_id, target_url, events_json, active, created_at FROM merchant_webhooks WHERE merchant_id = ? ORDER BY created_at DESC',
      [merchantId]
    );

    return (rows || []).map(r => {
      let events = ['*'];
      try { events = JSON.parse(r.events_json); } catch {}
      return {
        id: r.id,
        merchant_id: r.merchant_id,
        target_url: r.target_url,
        events,
        active: Boolean(r.active),
        created_at: r.created_at
      };
    });
  }

  /**
   * Elimina una suscripción
   */
  async deleteSubscription(id, merchantId = null) {
    let sql = 'DELETE FROM merchant_webhooks WHERE id = ?';
    const params = [id];
    if (merchantId) {
      sql += ' AND merchant_id = ?';
      params.push(merchantId);
    }
    await execute(sql, params);
    return { deleted: true, id };
  }

  /**
   * Despacha un evento a todos los comercios suscritos con firma criptográfica
   */
  async dispatch(eventType, payload = {}) {
    const subscriptions = await query('SELECT * FROM merchant_webhooks WHERE active = TRUE');
    if (!subscriptions || subscriptions.length === 0) {
      return { dispatched_count: 0, results: [] };
    }

    const matchingSubs = subscriptions.filter(sub => {
      let evts = [];
      try { evts = JSON.parse(sub.events_json); } catch { evts = ['*']; }
      return evts.includes('*') || evts.includes(eventType);
    });

    const results = [];
    const payloadStr = JSON.stringify(payload);

    for (const sub of matchingSubs) {
      const deliveryId = `del_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const signature = crypto.createHmac('sha256', sub.secret).update(payloadStr).digest('hex');
      const startTime = Date.now();

      let success = true;
      let status = 200;
      let responseBody = '{"received":true}';

      // Intento de envío HTTP simulado o fetch si hay red
      try {
        if (typeof globalThis.fetch === 'function' && sub.target_url.startsWith('http')) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          try {
            const res = await fetch(sub.target_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Sinergia-Event': eventType,
                'X-Sinergia-Signature': `sha256=${signature}`,
                'X-Sinergia-Delivery-Id': deliveryId,
                'X-Sinergia-Timestamp': new Date().toISOString()
              },
              body: payloadStr,
              signal: controller.signal
            });
            status = res.status;
            success = res.ok;
            responseBody = (await res.text()).slice(0, 500);
          } catch (fetchErr) {
            success = false;
            status = 504;
            responseBody = fetchErr.message;
          } finally {
            clearTimeout(timeout);
          }
        }
      } catch (e) {
        success = false;
        status = 500;
        responseBody = e.message;
      }

      const durationMs = Date.now() - startTime;

      try {
        await execute(
          `INSERT INTO merchant_webhook_deliveries 
           (id, subscription_id, event_type, payload_json, response_status, response_body, duration_ms, success, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [deliveryId, sub.id, eventType, payloadStr, status, responseBody, durationMs, success ? 1 : 0]
        );
      } catch (err) {
        console.warn('[MerchantWebhooksService] Error registrando delivery:', err.message);
      }

      results.push({
        delivery_id: deliveryId,
        subscription_id: sub.id,
        target_url: sub.target_url,
        event_type: eventType,
        success,
        status,
        duration_ms: durationMs
      });
    }

    return {
      dispatched_count: results.length,
      event_type: eventType,
      results
    };
  }

  /**
   * Obtiene historial de envíos de webhooks
   */
  async getDeliveries({ merchantId = null, limit = 50 } = {}) {
    let sql = `
      SELECT d.id, d.subscription_id, d.event_type, d.payload_json, d.response_status, d.response_body, d.duration_ms, d.success, d.created_at, w.merchant_id, w.target_url
      FROM merchant_webhook_deliveries d
      JOIN merchant_webhooks w ON d.subscription_id = w.id
    `;
    const params = [];

    if (merchantId) {
      sql += ' WHERE w.merchant_id = ?';
      params.push(merchantId);
    }

    sql += ' ORDER BY d.created_at DESC LIMIT ?';
    params.push(limit);

    const rows = await query(sql, params);
    return (rows || []).map(r => {
      let p = {};
      try { p = JSON.parse(r.payload_json); } catch {}
      return {
        ...r,
        payload: p,
        success: Boolean(r.success)
      };
    });
  }
}

module.exports = new MerchantWebhooksService();

