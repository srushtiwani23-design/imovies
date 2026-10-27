const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const getToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

// Requires a valid JWT
const protect = asyncHandler(async (req, res, next) => {
  const token = getToken(req);
  if (!token) throw new AppError('Please log in to continue', 401);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('This account no longer exists', 401);
  req.user = user;
  next();
});

// Attaches the user if a valid token is present, but never blocks the request
const optionalAuth = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch (err) {
    req.user = null;
  }
  next();
};

// Role-based access: admin only
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return next(new AppError('Admin access only', 403));
  return next();
};

module.exports = { protect, optionalAuth, adminOnly };
