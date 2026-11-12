const groupPlanRepository = require('./group-plan-repository');
const sseBroadcaster = require('../../shared/realtime/sse-broadcaster');

class GroupPlanService {
  async getPlan(code, currentActor = null) {
    const plan = await groupPlanRepository.findByCode(code);
    if (!plan) return null;

    // Mascarar información sensible para visitantes generales
    const isOrganizer = currentActor && currentActor.id === plan.organizer_id;

    const sanitizedGuests = plan.guests.map(g => ({
      id: g.id,
      name: g.name,
      attendance_status: g.attendance_status,
      // Solo el organizador o el propio invitado ve el email/teléfono
      email: isOrganizer ? g.email : undefined,
    }));

    return {
      ...plan,
      guests: sanitizedGuests,
      user_permissions: {
        can_edit: Boolean(isOrganizer),
        can_confirm: Boolean(isOrganizer),
        can_vote: true,
      }
    };
  }

  async createPlan(data, organizerId) {
    const result = await groupPlanRepository.createPlan({
      title: data.title,
      organizerId,
      budgetCrc: data.budget_crc,
      options: data.options || [],
    });
    return result;
  }

  async joinAsGuest(planCode, name, email = null, phone = null) {
    const plan = await groupPlanRepository.findByCode(planCode);
    if (!plan) throw new Error('PLAN_NOT_FOUND');

    const guest = await groupPlanRepository.addGuest(plan.id, name, email, phone);
    sseBroadcaster.broadcast(`plan:${planCode}`, 'GUEST_JOINED', { name: guest.name });
    return guest;
  }

  async castVote(planCode, guestToken, optionId, voteType) {
    if (!['can', 'prefer', 'cannot'].includes(voteType)) {
      throw new Error('INVALID_VOTE_TYPE');
    }

    const plan = await groupPlanRepository.findByCode(planCode);
    if (!plan) throw new Error('PLAN_NOT_FOUND');

    const guest = await groupPlanRepository.findGuestByToken(plan.id, guestToken);
    if (!guest) throw new Error('INVALID_GUEST_TOKEN');

    const result = await groupPlanRepository.voteOption(plan.id, guest.id, optionId, voteType);
    sseBroadcaster.broadcast(`plan:${planCode}`, 'VOTE_UPDATED', { optionId, voteType, guestName: guest.name });
    return result;
  }

  async confirmPlan(planCode, organizerId, selectedOptionId) {
    const plan = await groupPlanRepository.findByCode(planCode);
    if (!plan) throw new Error('PLAN_NOT_FOUND');

    const result = await groupPlanRepository.confirmPlan(plan.id, organizerId, selectedOptionId);
    sseBroadcaster.broadcast(`plan:${planCode}`, 'PLAN_CONFIRMED', { selectedOptionId, revision: result.revision });
    return result;
  }

  async handleProposalDecision(planCode, proposalId, decision, expectedRevision, actorId) {
    const plan = await groupPlanRepository.findByCode(planCode);
    if (!plan) throw new Error('PLAN_NOT_FOUND');

    if (decision === 'accept') {
      const result = await groupPlanRepository.applyProposal(plan.id, proposalId, expectedRevision, actorId);
      sseBroadcaster.broadcast(`plan:${planCode}`, 'PROPOSAL_ACCEPTED', {
        new_revision: result.new_revision,
        new_option_id: result.new_option_id,
      });
      return result;
    } else {
      // Rechazar o descartar
      const { execute } = require('../../shared/config/database');
      await execute("UPDATE plan_proposals SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [proposalId]);
      sseBroadcaster.broadcast(`plan:${planCode}`, 'PROPOSAL_REJECTED', { proposalId });
      return { ok: true, status: 'rejected' };
    }
  }

  async editPlan(planCode, organizerId, updates) {
    const plan = await groupPlanRepository.findByCode(planCode);
    if (!plan) throw new Error('PLAN_NOT_FOUND');

    const result = await groupPlanRepository.updatePlanManual(plan.id, organizerId, updates);
    sseBroadcaster.broadcast(`plan:${planCode}`, 'PLAN_UPDATED', { revision: result.revision });
    return result;
  }
}

module.exports = new GroupPlanService();
