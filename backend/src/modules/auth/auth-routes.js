const express = require('express');
const router = express.Router();
const authController = require('./auth-controller');
const { authLimiter, loginEmailLimiter } = require('../../shared/middlewares/rate-limiter');
const { requireAuth } = require('../../shared/middlewares/auth-role-guard');

router.get('/me', (req, res, next) => authController.getMe(req, res, next));
router.post('/login', authLimiter, loginEmailLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/register', authLimiter, (req, res, next) => authController.register(req, res, next));
router.post('/forgot-password', authLimiter, (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', authLimiter, (req, res, next) => authController.resetPassword(req, res, next));
router.post('/delete-account', requireAuth, authLimiter, (req, res, next) => authController.deleteAccount(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.post('/guest-session', (req, res, next) => authController.createGuestSession(req, res, next));
router.post('/webauthn-verify', (req, res) => authController.webauthnVerify(req, res));
router.post('/guest-sync', (req, res) => authController.guestSync(req, res));

module.exports = router;
