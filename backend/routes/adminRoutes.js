const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

// ---------- PICKUP MANAGEMENT ----------
router.get('/pickups/pending', authenticate, isAdmin, adminController.getPendingPickups);
router.get('/employees/available', authenticate, isAdmin, adminController.getAvailableEmployees);
router.put('/pickups/assign/:pickupId', authenticate, isAdmin, adminController.assignPickup);
router.put('/pickups/complete/:pickupId', authenticate, isAdmin, adminController.completePickup);

// ---------- REWARD RATES ----------
router.get('/reward-rates', authenticate, isAdmin, adminController.getRewardRates);
router.put('/reward-rates/:rateId', authenticate, isAdmin, adminController.updateRewardRate);

// ---------- VOUCHERS ----------
router.get('/vouchers', authenticate, isAdmin, adminController.getVouchers);
router.post('/vouchers', authenticate, isAdmin, adminController.createVoucher);
router.post('/vouchers/redeem/:voucherId', authenticate, adminController.redeemVoucher);

// ---------- USER MANAGEMENT ----------
router.get('/users', authenticate, isAdmin, adminController.getAllUsers);
router.put('/users/:userId/role', authenticate, isAdmin, adminController.updateUserRole);

// ---------- ANALYTICS ----------
router.get('/stats/waste-by-category', authenticate, isAdmin, adminController.getWasteByCategory);
router.get('/stats/pickups-over-time', authenticate, isAdmin, adminController.getPickupsOverTime);
router.get('/stats/top-recyclers', authenticate, isAdmin, adminController.getTopRecyclers);
router.get('/stats/summary', authenticate, isAdmin, adminController.getRewardsSummary);

module.exports = router;