const db = require('../config/db');
const bcrypt = require('bcryptjs');

const createUser = async (userData) => {
  const { first_name, last_name, username, email, phone, password, location_lat, location_lng, location_address, role } = userData;
  
  let password_hash = null;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    password_hash = await bcrypt.hash(password, salt);
  }

  const [result] = await db.query(
    `INSERT INTO users 
     (first_name, last_name, username, email, phone, password_hash, location_lat, location_lng, location_address, role, total_points) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [first_name, last_name, username, email, phone, password_hash, location_lat, location_lng, location_address, role || 'citizen']
  );
  return result.insertId;
};

const findUserByEmail = async (email) => {
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
};

const findUserByUsername = async (username) => {
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0];
};

const findUserById = async (id) => {
  const [rows] = await db.query('SELECT id, first_name, last_name, username, email, phone, role, total_points, location_address FROM users WHERE id = ?', [id]);
  return rows[0];
};

const updateUserPoints = async (userId, points) => {
  await db.query('UPDATE users SET total_points = total_points + ? WHERE id = ?', [points, userId]);
};

module.exports = { createUser, findUserByEmail, findUserByUsername, findUserById, updateUserPoints };