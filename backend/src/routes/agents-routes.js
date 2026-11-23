const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agents-controller');
const { requireAuth, requireAdmin } = require('../shared/middlewares/auth-role-guard');
const { aiLimiter } = require('../shared/middlewares/rate-limiter');

router.get('/', (req, res) => agentsController.listAgents(req, res));
router.get('/logs', requireAdmin, (req, res, next) => agentsController.listLogs(req, res, next));
router.post('/:agentName/run', requireAuth, aiLimiter, (req, res, next) => agentsController.runAgent(req, res, next));

module.exports = router;
