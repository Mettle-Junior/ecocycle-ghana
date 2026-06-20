const UserModel = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER
const register = async (req, res) => {
  try {
    const { first_name, last_name, username, email, phone, password, location_lat, location_lng, location_address } = req.body;

    // Check if username or email already exists
    const existingUser = await UserModel.findUserByUsername(username);
    if (existingUser) return res.status(400).json({ message: 'Username already taken.' });

    if (email) {
      const existingEmail = await UserModel.findUserByEmail(email);
      if (existingEmail) return res.status(400).json({ message: 'Email already registered.' });
    }

    const userId = await UserModel.createUser({
      first_name, last_name, username, email, phone, password,
      location_lat, location_lng, location_address, role: 'citizen'
    });

    res.status(201).json({ message: 'User registered successfully!', userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await UserModel.findUserByUsername(username);
    if (!user) return res.status(401).json({ message: 'Invalid username or password.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid username or password.' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        total_points: user.total_points
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// GET PROFILE (protected)
const getProfile = async (req, res) => {
  try {
    const user = await UserModel.findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { register, login, getProfile };