const db = require('../config/db');

const createReward = async (data) => {
  const { user_id, pickup_id, points_earned, reward_type, value_ghs, voucher_code, expiry_date } = data;
  const [result] = await db.query(
    `INSERT INTO rewards 
     (user_id, pickup_id, points_earned, reward_type, value_ghs, voucher_code, expiry_date, is_redeemed) 
     VALUES (?, ?, ?, ?, ?, ?, ?, false)`,
    [user_id, pickup_id, points_earned, reward_type, value_ghs, voucher_code, expiry_date]
  );
  return result.insertId;
};

const getRewardsByUser = async (userId) => {
  const [rows] = await db.query(
    `SELECT * FROM rewards WHERE user_id = ? ORDER BY issued_at DESC`,
    [userId]
  );
  return rows;
};

module.exports = { createReward, getRewardsByUser };