const db = require('../config/db');
const PickupModel = require('../models/PickupModel');
const UserModel = require('../models/UserModel');

// Get employee's assigned pickups
const getAssignedPickups = async (req, res) => {
  try {
    const employeeId = req.user.id;

    // Get the employee record
    const [empRows] = await db.query('SELECT id FROM employees WHERE user_id = ?', [employeeId]);
    if (empRows.length === 0) {
      // Return empty array instead of 404 to prevent frontend errors
      return res.json([]);
    }
    const employeeRecordId = empRows[0].id;

    const [rows] = await db.query(
      `SELECT p.*, c.name as category_name, u.first_name, u.last_name, u.phone 
       FROM pickup_requests p 
       JOIN waste_categories c ON p.category_id = c.id 
       JOIN users u ON p.user_id = u.id 
       JOIN collections col ON col.pickup_id = p.id 
       WHERE col.employee_id = ? AND p.status = 'assigned' 
       ORDER BY p.created_at ASC`,
      [employeeRecordId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Mark pickup as collected (employee)
const collectPickup = async (req, res) => {
  try {
    const { pickupId } = req.params;
    const { actual_weight } = req.body;
    const employeeId = req.user.id;

    if (!actual_weight || actual_weight <= 0) {
      return res.status(400).json({ message: 'Valid actual weight is required.' });
    }

    const pickup = await PickupModel.getPickupById(pickupId);
    if (!pickup) return res.status(404).json({ message: 'Pickup not found.' });

    // Verify this pickup is assigned to this employee
    const [colRows] = await db.query(
      'SELECT * FROM collections WHERE pickup_id = ? AND employee_id IN (SELECT id FROM employees WHERE user_id = ?)',
      [pickupId, employeeId]
    );
    if (colRows.length === 0) {
      return res.status(403).json({ message: 'You are not assigned to this pickup.' });
    }

    // Update pickup status and actual weight
    await PickupModel.updatePickupStatus(pickupId, 'collected', actual_weight);

    // Calculate points based on category
    const [rateRows] = await db.query(
      'SELECT points_per_kg FROM reward_rates WHERE category_id = ?',
      [pickup.category_id]
    );
    const pointsPerKg = rateRows[0]?.points_per_kg || 10;
    const pointsEarned = Math.round(parseFloat(actual_weight) * pointsPerKg);

    // Update user's total points
    await UserModel.updateUserPoints(pickup.user_id, pointsEarned);

    // Create reward record
    await db.query(
      `INSERT INTO rewards (user_id, pickup_id, points_earned, reward_type, value_ghs) 
       VALUES (?, ?, ?, 'points', 0)`,
      [pickup.user_id, pickupId, pointsEarned]
    );

    res.json({ 
      message: 'Pickup collected successfully!',
      pointsEarned,
      totalPoints: pointsEarned
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Get collection history for this employee
const getHistory = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const [rows] = await db.query(
      `SELECT p.*, c.name as category_name, u.first_name, u.last_name, u.phone, 
              col.collected_at
       FROM pickup_requests p 
       JOIN waste_categories c ON p.category_id = c.id 
       JOIN users u ON p.user_id = u.id 
       JOIN collections col ON col.pickup_id = p.id 
       WHERE col.employee_id IN (SELECT id FROM employees WHERE user_id = ?) 
         AND p.status = 'collected'
       ORDER BY col.collected_at DESC`,
      [employeeId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getAssignedPickups, collectPickup, getHistory };