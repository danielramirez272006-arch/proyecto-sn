const express = require('express');
const router = express.Router();
const authController = require('./auth-controller');
const { authLimiter, loginEmailLimiter } = require('../../shared/middlewares/rate-limiter');
const { requireAuth } = require('../../shared/middlewares/auth-role-guard');
const { validateBody } = require('../../middlewares/input-validator');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/me', (req, res, next) => authController.getMe(req, res, next));
router.post(
  '/login',
  authLimiter,
  loginEmailLimiter,
  validateBody({
    email: { required: true, type: 'string', pattern: EMAIL_RE, patternMessage: 'El formato del correo electrónico no es válido' },
    password: { required: true, type: 'string', minLength: 1 }
  }),
  (req, res, next) => authController.login(req, res, next)
);
router.post(
  '/register',
  authLimiter,
  validateBody({
    name: { required: true, type: 'string', minLength: 2, maxLength: 120 },
    email: { required: true, type: 'string', pattern: EMAIL_RE, patternMessage: 'El formato del correo electrónico no es válido' },
    password: { required: true, type: 'string', minLength: 8, maxLength: 128 },
    acceptTerms: { required: true, type: 'boolean', equals: true, equalsMessage: 'Debes aceptar los Términos y Condiciones (acceptTerms: true).' },
    acceptPrivacy: { required: true, type: 'boolean', equals: true, equalsMessage: 'Debes aceptar la Política de Privacidad (acceptPrivacy: true).' }
  }),
  (req, res, next) => authController.register(req, res, next)
);
router.post(
  '/forgot-password',
  authLimiter,
  validateBody({
    email: { required: true, type: 'string', pattern: EMAIL_RE, patternMessage: 'Debes proporcionar un correo electrónico válido.' }
  }),
  (req, res, next) => authController.forgotPassword(req, res, next)
);
router.post(
  '/reset-password',
  authLimiter,
  validateBody({
    email: { required: true, type: 'string', pattern: EMAIL_RE, patternMessage: 'El formato del correo electrónico no es válido' },
    token: { required: true, type: 'string', minLength: 6 },
    newPassword: { required: true, type: 'string', minLength: 8, maxLength: 128 }
  }),
  (req, res, next) => authController.resetPassword(req, res, next)
);
router.post(
  '/delete-account',
  requireAuth,
  authLimiter,
  validateBody({
    password: { required: true, type: 'string', minLength: 1 }
  }),
  (req, res, next) => authController.deleteAccount(req, res, next)
);
router.post('/refresh', authLimiter, (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.post('/guest-session', (req, res, next) => authController.createGuestSession(req, res, next));
router.post('/webauthn-verify', (req, res) => authController.webauthnVerify(req, res));
router.post('/guest-sync', (req, res) => authController.guestSync(req, res));

module.exports = router;
