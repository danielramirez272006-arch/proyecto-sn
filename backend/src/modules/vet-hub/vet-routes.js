const express = require('express');
const router = express.Router();
const vetController = require('./vet-controller');

router.get('/sos-24h', (req, res, next) => vetController.getSosClinics(req, res, next));
router.post('/triage', (req, res, next) => vetController.triage(req, res, next));
router.post('/barcode-scan', (req, res, next) => vetController.scanBarcode(req, res, next));
router.get('/senasa', (req, res) => vetController.getSenasa(req, res));

module.exports = router;

