const groupPlanService = require('./group-plan-service');
const { success, created, badRequest, notFound, forbidden, conflict } = require('../../shared/utils/http-response');

class GroupPlanController {
  async getPlan(req, res, next) {
    try {
      const plan = await groupPlanService.getPlan(req.params.code, req.user);
      if (!plan) return notFound(res, 'Plan no encontrado');
      return success(res, plan);
    } catch (err) {
      next(err);
    }
  }

  async createPlan(req, res, next) {
    try {
      const { title, budget_crc, options } = req.body;
      if (!title) return badRequest(res, 'El título del plan es requerido');

      const organizerId = req.user ? req.user.id : 'usr_organizer_1';
      const result = await groupPlanService.createPlan({ title, budget_crc, options }, organizerId);
      return created(res, result);
    } catch (err) {
      next(err);
    }
  }

  async joinAsGuest(req, res, next) {
    try {
      const { name, email, phone } = req.body;
      if (!name) return badRequest(res, 'Nombre de invitado requerido');

      const guest = await groupPlanService.joinAsGuest(req.params.code, name, email, phone);
      return created(res, guest);
    } catch (err) {
      next(err);
    }
  }

  async vote(req, res, next) {
    try {
      const { vote_type } = req.body;
      const guestToken = req.headers['x-guest-token'] || req.body.guest_token;

      if (!guestToken) {
        return forbidden(res, 'Se requiere cabecera x-guest-token para emitir voto de invitado');
      }

      const result = await groupPlanService.castVote(
        req.params.code,
        guestToken,
        req.params.optionId,
        vote_type
      );
      return success(res, result);
    } catch (err) {
      if (err.message === 'OPTION_NOT_IN_PLAN') return badRequest(res, 'La opción no pertenece a este plan');
      if (err.message === 'INVALID_GUEST_TOKEN') return forbidden(res, 'Token de invitado no válido para este plan');
      next(err);
    }
  }

  async confirm(req, res, next) {
    try {
      const { selected_option_id } = req.body;
      if (!selected_option_id) return badRequest(res, 'selected_option_id es requerido para confirmar el plan');

      const organizerId = req.user ? req.user.id : 'usr_organizer_1';
      const result = await groupPlanService.confirmPlan(req.params.code, organizerId, selected_option_id);
      return success(res, result);
    } catch (err) {
      if (err.message === 'UNAUTHORIZED_ORGANIZER') return forbidden(res, 'Solo el organizador puede confirmar el plan');
      next(err);
    }
  }

  async decideProposal(req, res, next) {
    try {
      const { decision, expected_revision } = req.body;
      if (!decision || !['accept', 'reject'].includes(decision)) {
        return badRequest(res, "decision debe ser 'accept' o 'reject'");
      }
      if (decision === 'accept' && typeof expected_revision !== 'number') {
        return badRequest(res, "expected_revision numérico es requerido para aceptar una propuesta");
      }

      const actorId = req.user ? req.user.id : 'usr_organizer_1';
      const result = await groupPlanService.handleProposalDecision(
        req.params.code,
        req.params.id,
        decision,
        expected_revision,
        actorId
      );
      return success(res, result);
    } catch (err) {
      if (err.message === 'STALE_REVISION_CONFLICT') {
        return conflict(res, 'Conflicto: La propuesta se calculó sobre una versión previa y el plan ya cambió.', {
          current_revision: err.currentRevision
        });
      }
      next(err);
    }
  }

  async updateManual(req, res, next) {
    try {
      const organizerId = req.user ? req.user.id : 'usr_organizer_1';
      const result = await groupPlanService.editPlan(req.params.code, organizerId, req.body);
      return success(res, result);
    } catch (err) {
      if (err.message === 'UNAUTHORIZED_ORGANIZER') return forbidden(res, 'Solo el organizador puede editar el plan');
      next(err);
    }
  }
}

module.exports = new GroupPlanController();

