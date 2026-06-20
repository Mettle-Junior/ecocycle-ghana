const db = require('../config/db');

const createPickup = async (data) => {
  const { user_id, category_id, estimated_weight, photo_url, pickup_lat, pickup_lng, pickup_address, scheduled_date } = data;
  const [result] = await db.query(
    `INSERT INTO pickup_requests 
     (user_id, category_id, estimated_weight, photo_url, pickup_lat, pickup_lng, pickup_address, scheduled_date, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [user_id, category_id, estimated_weight, photo_url, pickup_lat, pickup_lng, pickup_address, scheduled_date]
  );
  return result.insertId;
};

const getPickupsByUser = async (userId) => {
  const [rows] = await db.query(
    `SELECT p.*, c.name as category_name, c.reward_per_unit 
     FROM pickup_requests p 
     JOIN waste_categories c ON p.category_id = c.id 
     WHERE p.user_id = ? 
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return rows;
};

const getPendingPickups = async () => {
  const [rows] = await db.query(
    `SELECT p.*, u.first_name, u.last_name, u.phone, c.name as category_name 
     FROM pickup_requests p 
     JOIN users u ON p.user_id = u.id 
     JOIN waste_categories c ON p.category_id = c.id 
     WHERE p.status = 'pending' 
     ORDER BY p.created_at ASC`
  );
  return rows;
};

const getPickupById = async (id) => {
  const [rows] = await db.query('SELECT * FROM pickup_requests WHERE id = ?', [id]);
  return rows[0];
};

const updatePickupStatus = async (id, status, actual_weight = null) => {
  if (actual_weight !== null) {
    await db.query('UPDATE pickup_requests SET status = ?, actual_weight = ? WHERE id = ?', [status, actual_weight, id]);
  } else {
    await db.query('UPDATE pickup_requests SET status = ? WHERE id = ?', [status, id]);
  }
};

const assignPickupToEmployee = async (pickupId, employeeId) => {
  await db.query('UPDATE pickup_requests SET status = "assigned" WHERE id = ?', [pickupId]);
  await db.query('INSERT INTO collections (pickup_id, employee_id) VALUES (?, ?)', [pickupId, employeeId]);
};

module.exports = { 
  createPickup, 
  getPickupsByUser, 
  getPendingPickups, 
  getPickupById, 
  updatePickupStatus,
  assignPickupToEmployee 
};