const express = require('express');
const router = express.Router();
const clientController = require('./client-controller');

router.get('/vault', (req, res) => clientController.getVault(req, res));
router.post('/vault', (req, res) => clientController.updateVault(req, res));

module.exports = router;

