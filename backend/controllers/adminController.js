const User = require('../models/User');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/admin/stats
exports.getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const [users, movies, theatres, upcomingShows, confirmedBookings, cancelledBookings, revenue, recentBookings] =
    await Promise.all([
      User.countDocuments({ role: 'user' }),
      Movie.countDocuments(),
      Theatre.countDocuments(),
      Show.countDocuments({ isActive: true, startTime: { $gte: now } }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Booking.find({ status: { $in: ['confirmed', 'cancelled'] } })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('user', 'name email')
        .populate('movie', 'title')
        .populate('theatre', 'name city')
        .lean(),
    ]);

  res.json({
    success: true,
    stats: {
      users,
      movies,
      theatres,
      upcomingShows,
      confirmedBookings,
      cancelledBookings,
      revenue: revenue[0]?.total || 0,
    },
    recentBookings,
  });
});
