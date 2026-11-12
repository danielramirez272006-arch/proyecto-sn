const express = require('express');
const router = express.Router();
const foodController = require('./food-controller');

router.get('/places', (req, res, next) => foodController.getPlaces(req, res, next));
router.get('/coffee-pairing', (req, res) => foodController.getCoffeePairing(req, res));
router.get('/zero-waste', (req, res) => foodController.getZeroWasteDiscounts(req, res));
router.post('/menu-real-price', (req, res, next) => foodController.checkMenuRealPrice(req, res, next));

module.exports = router;

