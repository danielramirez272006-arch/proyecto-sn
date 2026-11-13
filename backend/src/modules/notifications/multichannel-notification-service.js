const crypto = require('node:crypto');
const { query, execute } = require('../../shared/config/database');
const outboxRepository = require('./outbox-repository');

// Clave VAPID pública persistente / calculada
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDZKrxZJjSPO4hCEFiT88zkR3G5QfX1XfJ0Ew9X1o7t4';

class MultichannelNotificationService {
  getVapidPublicKey() {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Registra una suscripción Web Push del navegador
   */
  async subscribePush({ userId = null, endpoint, keys = {}, userAgent = '' }) {
    if (!endpoint || !keys.p256dh || !keys.auth) {
      throw new Error('Parámetros de suscripción Web Push incompletos (requiere endpoint, p256dh y auth)');
    }

    const id = `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // Desactivar suscripciones duplicadas del mismo endpoint
    await execute('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);

    await execute(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP)`,
      [id, userId, endpoint, keys.p256dh, keys.auth, (userAgent || '').slice(0, 255)]
    );

    return {
      id,
      subscribed: true,
      channel: 'webpush',
      user_id: userId
    };
  }

  /**
   * Cancela una suscripción Web Push
   */
  async unsubscribePush(endpoint) {
    await execute('UPDATE push_subscriptions SET active = FALSE WHERE endpoint = ?', [endpoint]);
    return { unsubscribed: true };
  }

  /**
   * Genera plantilla formateada para WhatsApp / SMS en Costa Rica (+506)
   */
  formatWhatsAppTemplate(type, payload = {}) {
    switch (type) {
      case 'plan_confirmed':
        return `🎉 *¡Plan Confirmado en Sinergia Urbana!*\nHola ${payload.guest_name || 'amig@'}, tu salida grupal "${payload.plan_title}" ya quedó confirmada.\n📍 Primera parada: ${payload.first_stop || 'Costa Rica'}\n🕒 Hora: ${payload.start_time || 'Revisar en app'}\n🔗 Ver detalles: https://sinergia.cr/p/${payload.plan_code}`;

      case 'sos_alert':
        return `🚨 *ALERTA DE AUXILIO CIUDADANO S.O.S.*\nSe reportó una emergencia cerca de tu ubicación:\n⚠️ Tipo: ${payload.emergency_type || 'General'}\n📍 Zona: ${payload.location_name || 'San José, CR'}\n🕒 Hace un momento.\nSi puedes asistir de forma segura, ingresa a https://sinergia.cr/sos/${payload.sos_id}`;

      case 'proposal_alternative':
        return `⚠️ *Cambio en tu Itinerario*\nEl evento original para "${payload.plan_title}" fue modificado (${payload.reason}).\nRevisa la propuesta de la IA y vota aquí: https://sinergia.cr/p/${payload.plan_code}`;

      default:
        return `🔔 *Sinergia Urbana*: ${payload.message || 'Tienes una nueva actualización en tu cuenta.'}`;
    }
  }

  /**
   * Encola una notificación multicanal (Email, Web Push o WhatsApp)
   */
  async queueNotification({ channel = 'email', recipient, type, payload = {}, title = '', priority = 'normal' }) {
    const idempotencyKey = `notif_${channel}_${type}_${crypto.createHash('md5').update(`${recipient}_${JSON.stringify(payload)}`).digest('hex').slice(0, 16)}`;

    let messageBody = '';
    if (channel === 'whatsapp' || channel === 'sms') {
      messageBody = this.formatWhatsAppTemplate(type, payload);
    } else {
      messageBody = payload.body || payload.message || title;
    }

    const outboxItem = await outboxRepository.enqueue({
      recipient,
      type: `${channel}:${type}`,
      payload: {
        channel,
        title: title || 'Notificación Sinergia Urbana',
        body: messageBody,
        priority,
        ...payload
      },
      idempotencyKey
    });

    return {
      enqueued: true,
      idempotency_key: idempotencyKey,
      channel,
      recipient,
      outbox_id: outboxItem?.id || null
    };
  }

  /**
   * Procesa la cola multicanal
   */
  async processOutboxBatch(batchSize = 10) {
    const batch = await outboxRepository.claimPendingBatch(batchSize, 30);
    const results = [];

    for (const item of batch) {
      try {
        let parsed = item.payload;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch {}
        }

        const channel = parsed.channel || (item.type.includes(':') ? item.type.split(':')[0] : 'email');

        // Despacho simulado según canal
        if (channel === 'webpush') {
          // Despacho Web Push VAPID payload
          results.push({ id: item.id, channel: 'webpush', recipient: item.recipient, status: 'dispatched' });
        } else if (channel === 'whatsapp' || channel === 'sms') {
          // Despacho SMS / WhatsApp Gateway
          results.push({ id: item.id, channel, recipient: item.recipient, status: 'dispatched' });
        } else {
          results.push({ id: item.id, channel: 'email', recipient: item.recipient, status: 'dispatched' });
        }

        await outboxRepository.markSent(item.id);
      } catch (err) {
        await outboxRepository.markFailed(item.id, err.message, item.attempts);
        results.push({ id: item.id, status: 'retry_scheduled', error: err.message });
      }
    }

    return results;
  }

  /**
   * Obtiene estadísticas completas de la cola de salida
   */
  async getQueueStats() {
    const rawStats = await outboxRepository.getQueueStats();
    const subsCount = await query('SELECT COUNT(*) as total FROM push_subscriptions WHERE active = TRUE');
    const totalSubs = subsCount && subsCount[0] ? Number(subsCount[0].total) : 0;

    return {
      outbox: rawStats,
      active_push_subscriptions: totalSubs,
      channels_supported: ['email', 'webpush', 'whatsapp', 'sms'],
      server_time: new Date().toISOString()
    };
  }
}

module.exports = new MultichannelNotificationService();

