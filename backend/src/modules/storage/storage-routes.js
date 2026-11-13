const express = require('express');
const router = express.Router();
const storageController = require('./storage-controller');

router.post('/upload', (req, res) => storageController.uploadFile(req, res));
router.get('/status', (req, res) => storageController.getStorageStatus(req, res));

module.exports = router;
