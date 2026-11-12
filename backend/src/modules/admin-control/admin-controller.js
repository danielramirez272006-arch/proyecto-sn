const adminService = require('./admin-service');
const placesRepository = require('../places/places-repository');
const notificationService = require('../notifications/notification-service');
const deepSeekClient = require('../../shared/config/deepseek-config');
const { scheduler } = require('../../autonomous-agents');
const { success, created, notFound, badRequest } = require('../../shared/utils/http-response');

class AdminController {
  async patchEvent(req, res, next) {
    try {
      const { status, start_time, end_time } = req.body;
      if (!status) return badRequest(res, 'El campo status es requerido');

      const result = await adminService.updateEventStatus(req.params.id, status, start_time, end_time);
      return success(res, result);
    } catch (err) {
      if (err.message === 'EVENT_NOT_FOUND') return notFound(res, 'Evento no encontrado');
      next(err);
    }
  }

  async createPlace(req, res, next) {
    try {
      const place = await placesRepository.create(req.body);
      return created(res, place);
    } catch (err) {
      next(err);
    }
  }

  async updatePlace(req, res, next) {
    try {
      const updated = await placesRepository.update(req.params.id, req.body);
      if (!updated) return notFound(res, 'Lugar no encontrado');
      return success(res, updated);
    } catch (err) {
      next(err);
    }
  }

  async setPlaceLock(req, res, next) {
    try {
      const { verified_by_admin } = req.body;
      const updated = await adminService.setPlaceVerificationLock(req.params.id, Boolean(verified_by_admin));
      return success(res, updated);
    } catch (err) {
      next(err);
    }
  }

  async getDuplicateCandidates(req, res, next) {
    try {
      const dupes = await adminService.findDuplicatePlaces();
      return success(res, dupes);
    } catch (err) {
      next(err);
    }
  }

  async mergePlaces(req, res, next) {
    try {
      const { primary_id, duplicate_id } = req.body;
      if (!primary_id || !duplicate_id) return badRequest(res, 'primary_id y duplicate_id son requeridos');

      const result = await adminService.mergePlaces(primary_id, duplicate_id);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getNotificationsStatus(req, res, next) {
    try {
      const status = await notificationService.getQueueStatus();
      return success(res, status);
    } catch (err) {
      next(err);
    }
  }

  async retryNotification(req, res, next) {
    try {
      const result = await notificationService.retryFailedNotification(req.params.id);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getCopilotTelemetry(req, res) {
    return success(res, {
      ai_metrics: deepSeekClient.getMetrics(),
      agent_scheduler: scheduler.getStatus(),
    });
  }

  async getAgentsStatus(req, res) {
    return success(res, scheduler.getStatus());
  }

  async runAgentJob(req, res, next) {
    try {
      const { jobName } = req.params;
      const result = await scheduler.runJob(jobName);
      return success(res, result);
    } catch (err) {
      if (err.message.includes('Tarea de agente no encontrada')) {
        return notFound(res, err.message);
      }
      next(err);
    }
  }

  async getAuditLogs(req, res, next) {
    try {
      const logs = await adminService.getAuditLogs();
      return success(res, logs);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
