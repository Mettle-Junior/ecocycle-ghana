const express = require('express');
const router = express.Router();
const pickupController = require('../controllers/pickupController');
const { authenticate } = require('../middleware/auth');

router.post('/pickup/request', authenticate, pickupController.requestPickup);
router.get('/pickup/history', authenticate, pickupController.getHistory);

module.exports = router;