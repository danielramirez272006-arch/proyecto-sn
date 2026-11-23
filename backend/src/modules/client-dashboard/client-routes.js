const express = require('express');
const router = express.Router();
const clientController = require('./client-controller');
const { authenticateOptional, requireAuth } = require('../../shared/middlewares/auth-role-guard');

router.get('/overview', authenticateOptional, (req, res) => clientController.getOverview(req, res));
router.get('/vault', requireAuth, (req, res) => clientController.getVault(req, res));
router.post('/vault', requireAuth, (req, res) => clientController.updateVault(req, res));

module.exports = router;
