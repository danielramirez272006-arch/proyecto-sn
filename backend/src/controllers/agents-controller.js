const aiAgentsHubService = require('../services/ai-agents-hub-service');
const { success, notFound, forbidden } = require('../shared/utils/http-response');

class AgentsController {
  listAgents(req, res) {
    const agents = aiAgentsHubService.listAgents();
    return success(res, { agents, total: agents.length });
  }

  async runAgent(req, res, next) {
    try {
      const result = await aiAgentsHubService.runAgent(req.params.agentName, req.body || {}, req.user);
      return success(res, result);
    } catch (err) {
      if (err.status === 404) return notFound(res, err.message);
      if (err.status === 403) return forbidden(res, err.message);
      next(err);
    }
  }

  async listLogs(req, res, next) {
    try {
      const logs = await aiAgentsHubService.listLogs({
        agentName: req.query.agent || null,
        limit: req.query.limit,
      });
      return success(res, { logs, total: logs.length });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AgentsController();
