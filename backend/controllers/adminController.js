const PickupModel = require('../models/PickupModel');
const EmployeeModel = require('../models/EmployeeModel');
const UserModel = require('../models/UserModel');
const db = require('../config/db');
const { generateVoucher } = require('../utils/generateVoucher');

// ---------- PICKUP MANAGEMENT ----------
const getPendingPickups = async (req, res) => {
  try {
    const pickups = await PickupModel.getPendingPickups();
    res.json(pickups);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const getAvailableEmployees = async (req, res) => {
  try {
    const employees = await EmployeeModel.getAvailableEmployees();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const assignPickup = async (req, res) => {
  try {
    const { pickupId } = req.params;
    const { employeeId } = req.body;
    const pickup = await PickupModel.getPickupById(pickupId);
    if (!pickup) return res.status(404).json({ message: 'Pickup not found.' });
    await PickupModel.assignPickupToEmployee(pickupId, employeeId);
    res.json({ message: 'Pickup assigned successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const completePickup = async (req, res) => {
  try {
    const { pickupId } = req.params;
    const { actual_weight } = req.body;
    const pickup = await PickupModel.getPickupById(pickupId);
    if (!pickup) return res.status(404).json({ message: 'Pickup not found.' });
    await PickupModel.updatePickupStatus(pickupId, 'collected', actual_weight);

    const [rateRows] = await db.query(
      'SELECT points_per_kg FROM reward_rates WHERE category_id = ?',
      [pickup.category_id]
    );
    const pointsPerKg = rateRows[0]?.points_per_kg || 10;
    const pointsEarned = Math.round(parseFloat(actual_weight) * pointsPerKg);
    await UserModel.updateUserPoints(pickup.user_id, pointsEarned);

    await db.query(
      `INSERT INTO rewards (user_id, pickup_id, points_earned, reward_type, value_ghs) 
       VALUES (?, ?, ?, 'points', 0)`,
      [pickup.user_id, pickupId, pointsEarned]
    );

    res.json({ message: 'Pickup completed!', pointsEarned });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ---------- REWARD RATES ----------
const getRewardRates = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.points_per_kg, c.name as category_name 
       FROM reward_rates r 
       JOIN waste_categories c ON r.category_id = c.id`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const updateRewardRate = async (req, res) => {
  try {
    const { rateId } = req.params;
    const { points_per_kg } = req.body;
    await db.query('UPDATE reward_rates SET points_per_kg = ? WHERE id = ?', [points_per_kg, rateId]);
    res.json({ message: 'Reward rate updated successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// ---------- VOUCHERS ----------
const getVouchers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM vouchers WHERE is_active = true');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const createVoucher = async (req, res) => {
  try {
    const { voucher_code, points_required, reward_type, value_ghs } = req.body;
    await db.query(
      'INSERT INTO vouchers (voucher_code, points_required, reward_type, value_ghs) VALUES (?, ?, ?, ?)',
      [voucher_code, points_required, reward_type, value_ghs]
    );
    res.json({ message: 'Voucher created successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const redeemVoucher = async (req, res) => {
  try {
    const { voucherId } = req.params;
    const userId = req.user.id;
    const [userRows] = await db.query('SELECT total_points FROM users WHERE id = ?', [userId]);
    const userPoints = userRows[0]?.total_points || 0;
    const [voucherRows] = await db.query('SELECT * FROM vouchers WHERE id = ? AND is_active = true', [voucherId]);
    const voucher = voucherRows[0];
    if (!voucher) return res.status(404).json({ message: 'Voucher not found or inactive.' });
    if (userPoints < voucher.points_required) {
      return res.status(400).json({ message: 'Insufficient points.' });
    }
    await db.query('UPDATE users SET total_points = total_points - ? WHERE id = ?', [voucher.points_required, userId]);
    await db.query('INSERT INTO user_vouchers (user_id, voucher_id) VALUES (?, ?)', [userId, voucherId]);
    res.json({
      message: 'Voucher redeemed successfully!',
      voucher_code: voucher.voucher_code,
      remaining_points: userPoints - voucher.points_required
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// ---------- USER MANAGEMENT (Admin) ----------
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, first_name, last_name, username, email, phone, role, total_points, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    res.json({ message: 'User role updated successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ---------- ANALYTICS ----------
const getWasteByCategory = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.name as category, SUM(p.actual_weight) as total_weight 
       FROM pickup_requests p 
       JOIN waste_categories c ON p.category_id = c.id 
       WHERE p.status = 'collected' AND p.actual_weight IS NOT NULL
       GROUP BY p.category_id`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

const getPickupsOverTime = async (req, res) => {
  try {
    const days = req.query.days || 7;
    const [rows] = await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM pickup_requests 
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

const getTopRecyclers = async (req, res) => {
  try {
    const limit = req.query.limit || 5;
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, total_points 
       FROM users 
       WHERE role = 'citizen' AND total_points > 0
       ORDER BY total_points DESC 
       LIMIT ?`,
      [parseInt(limit)]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

const getRewardsSummary = async (req, res) => {
  try {
    const [totalPickups] = await db.query(`SELECT COUNT(*) as count FROM pickup_requests WHERE status = 'collected'`);
    const [totalPoints] = await db.query(`SELECT SUM(points_earned) as total FROM rewards`);
    const [vouchersRedeemed] = await db.query(`SELECT COUNT(*) as count FROM user_vouchers`);
    const [activeCitizens] = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'citizen'`);
    res.json({
      totalPickups: totalPickups[0]?.count || 0,
      totalPointsIssued: totalPoints[0]?.total || 0,
      vouchersRedeemed: vouchersRedeemed[0]?.count || 0,
      activeCitizens: activeCitizens[0]?.count || 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getPendingPickups,
  getAvailableEmployees,
  assignPickup,
  completePickup,
  getRewardRates,
  updateRewardRate,
  getVouchers,
  createVoucher,
  redeemVoucher,
  getAllUsers,
  updateUserRole,
  getWasteByCategory,
  getPickupsOverTime,
  getTopRecyclers,
  getRewardsSummary
};