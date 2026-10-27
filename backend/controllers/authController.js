const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const sendAuth = (res, user, status = 200) =>
  res.status(status).json({ success: true, token: signToken(user._id), user });

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, city } = req.body;
  if (!name || !email || !password) throw new AppError('Name, email and password are required', 400);

  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) throw new AppError('An account with this email already exists', 409);

  // Role is never taken from the request body, so nobody can sign up as admin
  const user = await User.create({ name, email, password, phone, city });
  sendAuth(res, user, 201);
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  sendAuth(res, user);
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/me
exports.updateMe = asyncHandler(async (req, res) => {
  const { name, phone, city } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  if (city !== undefined) req.user.city = city;
  await req.user.save();
  res.json({ success: true, user: req.user });
});
