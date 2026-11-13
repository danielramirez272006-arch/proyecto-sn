const outboxRepository = require('./outbox-repository');
const emailClient = require('../../shared/clients/email-client');
const { execute, query } = require('../../shared/config/database');

class NotificationService {
  async queueProposalNotification(plan, proposal, recipientEmail) {
    const idempotencyKey = `pending_prop_${plan.id}_prop${proposal.id}_${recipientEmail}`;
    const payload = {
      plan_code: plan.code,
      plan_title: plan.title,
      reason: proposal.reason,
      review_url: `/planes/${plan.code}?review_proposal=${proposal.id}`,
    };

    return await outboxRepository.enqueue({
      recipient: recipientEmail,
      type: 'pending_proposal',
      payload,
      idempotencyKey,
    });
  }

  async queueApprovedChangeNotification(plan, recipientEmail) {
    const idempotencyKey = `approved_change_${plan.id}_rev${plan.revision}_${recipientEmail}`;
    const payload = {
      plan_code: plan.code,
      plan_title: plan.title,
      revision: plan.revision,
      review_url: `/planes/${plan.code}`,
    };

    return await outboxRepository.enqueue({
      recipient: recipientEmail,
      type: 'approved_change',
      payload,
      idempotencyKey,
    });
  }

  async processPendingOutbox() {
    const batch = await outboxRepository.claimPendingBatch(10, 30);
    const results = [];

    for (const item of batch) {
      try {
        let subject = 'Actualización sobre tu salida grupal';
        let body = '';

        if (item.type === 'pending_proposal') {
          subject = `[Acción Requerida] Propuesta alternativa para "${item.payload.plan_title}"`;
          body = `Se detectó un cambio en el evento original (${item.payload.reason}). El organizador está revisando una opción alternativa en: ${item.payload.review_url}`;
        } else if (item.type === 'approved_change') {
          subject = `[Confirmado] Cambio aprobado en el itinerario de "${item.payload.plan_title}"`;
          body = `El plan fue actualizado a la versión ${item.payload.revision}. Revisa las paradas y confirma tu asistencia en: ${item.payload.review_url}`;
        }

        await emailClient.sendMail({
          to: item.recipient,
          subject,
          text: body,
          html: `<p>${body}</p>`,
          idempotencyKey: item.idempotency_key,
        });

        await outboxRepository.markSent(item.id);
        results.push({ id: item.id, status: 'sent' });
      } catch (err) {
        await outboxRepository.markFailed(item.id, err.message, item.attempts);
        results.push({ id: item.id, status: 'retry_scheduled', error: err.message });
      }
    }

    return results;
  }

  generateCalendarIcs(plan, confirmedOption) {
    const nowStr = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const stops = confirmedOption?.stops || [];
    const firstStop = stops[0] || {};
    const lastStop = stops[stops.length - 1] || firstStop;

    const startFormatted = firstStop.start_time 
      ? new Date(firstStop.start_time).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
      : nowStr;
    const endFormatted = lastStop.end_time 
      ? new Date(lastStop.end_time).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
      : nowStr;

    const summary = plan.title;
    const description = `Salida grupal coordinada con Sistema de Sinergia. Paradas: ${stops.map(s => s.place_name).join(' -> ')}`;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sinergia Urbana Costa Rica//ES',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:plan-${plan.code}@sinergia.cr`,
      `DTSTAMP:${nowStr}`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${firstStop.place_address || 'Costa Rica'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }

  async getQueueStatus() {
    const stats = await outboxRepository.getQueueStats();
    const recent = await query('SELECT * FROM notification_outbox ORDER BY created_at DESC LIMIT 20');
    return {
      stats,
      recent: recent.map(r => {
        let p = {};
        try { p = JSON.parse(r.payload); } catch {}
        return { ...r, payload: p };
      })
    };
  }

  async retryFailedNotification(id) {
    await execute(
      'UPDATE notification_outbox SET status = "pending", attempts = 0, next_attempt_at = CURRENT_TIMESTAMP, locked_until = NULL WHERE id = ?',
      [id]
    );
    return this.processPendingOutbox();
  }
}

module.exports = new NotificationService();

