const crypto = require('crypto');
const sseBroadcaster = require('../realtime/sse-broadcaster');
const auditService = require('../audit/audit-service');
const { ttlCache } = require('../cache/ttl-cache-service');
const { formatSuccess, formatError } = require('../utils/http-response');

class SupabaseWebhookHandler {
  async handleWebhook(req, res) {
    try {
      const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
      const signature = req.headers['x-supabase-webhook-signature'] || req.headers['x-webhook-secret'];

      // Si hay secreto configurado, validar que coincida
      if (webhookSecret && signature !== webhookSecret) {
        return res.status(401).json(formatError('INVALID_WEBHOOK_SIGNATURE', 'Firma o token de webhook de Supabase inválido'));
      }

      const payload = req.body || {};
      const { type, table, schema, record, old_record } = payload;

      console.log(`[Supabase Webhook] Recibido evento ${type || 'UNKNOWN'} en ${schema || 'app_private'}.${table || 'unknown'}`);

      // 1. Invalidar cachés relacionadas
      if (table === 'places') {
        ttlCache.clear('places');
      } else if (table === 'events') {
        ttlCache.clear('events');
      }

      // 2. Retransmitir a clientes frontend conectados vía SSE
      sseBroadcaster.broadcast('supabase:sync', {
        type: type || 'UPDATE',
        table: table || 'general',
        schema: schema || 'app_private',
        record: record || null,
        timestamp: new Date().toISOString()
      });

      // 3. Si un evento se canceló, alertar al agente de operaciones
      let agentTriggered = false;
      if (table === 'events' && record && record.status === 'cancelled') {
        try {
          const affectedPlansJob = require('../../autonomous-agents/plan-operations-agent/affected-plans-job');
          affectedPlansJob.checkAndProposeForAffectedPlans().catch(err => {
            console.error('[Supabase Webhook] Error disparando agente de planes:', err.message);
          });
          agentTriggered = true;
        } catch (_) {}
      }

      // 4. Registrar en pista de auditoría inmutable
      try {
        await auditService.recordAction({
          action_type: 'SUPABASE_WEBHOOK_DISPATCHED',
          entity_type: table || 'database',
          entity_id: record?.id || 'batch',
          performed_by: 'supabase_system',
          payload_snapshot: { type, table, record_id: record?.id, agent_triggered: agentTriggered }
        });
      } catch (_) {}

      return res.status(200).json(formatSuccess({
        received: true,
        type: type || 'PING',
        table: table || null,
        agent_triggered: agentTriggered,
        timestamp: new Date().toISOString()
      }, 'Webhook de Supabase procesado exitosamente'));
    } catch (err) {
      console.error('[Supabase Webhook] Error procesando webhook:', err);
      return res.status(500).json(formatError('WEBHOOK_PROCESSING_ERROR', err.message));
    }
  }
}

module.exports = new SupabaseWebhookHandler();
