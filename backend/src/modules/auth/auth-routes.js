const express = require('express');
const router = express.Router();
const authController = require('./auth-controller');

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/webauthn-verify', (req, res) => authController.webauthnVerify(req, res));
router.post('/guest-sync', (req, res) => authController.guestSync(req, res));

module.exports = router;

