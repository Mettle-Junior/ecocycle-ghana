const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate } = require('../middleware/auth');

// All employee routes require authentication
router.get('/pickups/assigned', authenticate, employeeController.getAssignedPickups);
router.put('/pickups/collect/:pickupId', authenticate, employeeController.collectPickup);
router.get('/pickups/history', authenticate, employeeController.getHistory);

module.exports = router;