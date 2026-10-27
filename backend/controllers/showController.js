const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const Booking = require('../models/Booking');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { buildSeats } = require('../utils/seatGenerator');
const { getPagination, paged, formatIST } = require('../utils/helpers');
const { releaseExpiredLocks, lockSeats, unlockUserSeats } = require('../services/seatService');

const MAX_SEATS_PER_BOOKING = 10;
const SHOW_BUFFER_MINS = 20; // cleaning time between two shows on the same screen

// GET /api/shows (admin) ?upcoming=true&movie=&theatre=&page=
exports.listShows = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const filter = {};
  if (req.query.upcoming === 'true') filter.startTime = { $gte: new Date() };
  if (req.query.movie) filter.movie = req.query.movie;
  if (req.query.theatre) filter.theatre = req.query.theatre;

  const [items, total] = await Promise.all([
    Show.find(filter)
      .populate('movie', 'title language durationMins')
      .populate('theatre', 'name city screens')
      .sort({ startTime: req.query.upcoming === 'true' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Show.countDocuments(filter),
  ]);
  res.json(paged(items, total, page, limit));
});

// GET /api/shows/:id
exports.getShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id)
    .populate('movie', 'title posterUrl language durationMins certificate genre')
    .populate('theatre', 'name city address');
  if (!show) throw new AppError('Show not found', 404);
  res.json({ success: true, show });
});

// GET /api/shows/:id/seats
exports.getShowSeats = asyncHandler(async (req, res) => {
  const exists = await Show.exists({ _id: req.params.id });
  if (!exists) throw new AppError('Show not found', 404);
  await releaseExpiredLocks(req.params.id, req.app.get('io'));

  const seats = await Seat.find({ show: req.params.id })
    .select('label row number type price status lockedBy lockedUntil')
    .sort({ row: 1, number: 1 })
    .lean();
  res.json({
    success: true,
    serverTime: new Date(),
    seats: seats.map((s) => ({ ...s, lockedBy: s.lockedBy ? String(s.lockedBy) : null })),
  });
});

// POST /api/shows/:id/lock  { seatLabels: ["C5","C6"] }
exports.lockSeats = asyncHandler(async (req, res) => {
  const { seatLabels } = req.body;
  if (!Array.isArray(seatLabels) || !seatLabels.length) throw new AppError('Select at least one seat', 400);
  const labels = [...new Set(seatLabels.map(String))];
  if (labels.length > MAX_SEATS_PER_BOOKING) {
    throw new AppError(`You can book up to ${MAX_SEATS_PER_BOOKING} seats at a time`, 400);
  }

  const show = await Show.findById(req.params.id);
  if (!show || !show.isActive) throw new AppError('Show not found', 404);
  if (show.startTime <= new Date()) throw new AppError('Booking is closed for this show', 400);

  const result = await lockSeats({ show, labels, userId: req.user._id, io: req.app.get('io') });
  res.json({ success: true, ...result });
});

// POST /api/shows/:id/unlock
exports.unlockSeats = asyncHandler(async (req, res) => {
  const released = await unlockUserSeats({ showId: req.params.id, userId: req.user._id, io: req.app.get('io') });
  res.json({ success: true, released });
});

// POST /api/shows (admin)
exports.createShow = asyncHandler(async (req, res) => {
  const {
    movie,
    theatre,
    screen,
    startTime,
    format,
    language,
    regularPrice,
    premiumPrice,
    rows = 8,
    seatsPerRow = 12,
    premiumRows = 2,
  } = req.body;
  if (!movie || !theatre || !startTime) throw new AppError('Movie, theatre and start time are required', 400);

  const [movieDoc, theatreDoc] = await Promise.all([Movie.findById(movie), Theatre.findById(theatre)]);
  if (!movieDoc) throw new AppError('Movie not found', 404);
  if (!theatreDoc) throw new AppError('Theatre not found', 404);

  const screenNo = Number(screen) || 1;
  if (screenNo < 1 || screenNo > theatreDoc.screens) {
    throw new AppError(`${theatreDoc.name} has screens 1 to ${theatreDoc.screens}`, 400);
  }

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) throw new AppError('Invalid start time', 400);
  if (start <= new Date()) throw new AppError('Show time must be in the future', 400);
  const end = new Date(start.getTime() + (movieDoc.durationMins + SHOW_BUFFER_MINS) * 60 * 1000);

  const rowsN = Number(rows);
  const perRow = Number(seatsPerRow);
  const regular = Number(regularPrice);
  const premium = Number(premiumPrice);
  if (!(rowsN >= 1 && rowsN <= 26)) throw new AppError('Rows must be between 1 and 26', 400);
  if (!(perRow >= 1 && perRow <= 30)) throw new AppError('Seats per row must be between 1 and 30', 400);
  if (!(regular >= 0) || !(premium >= 0)) throw new AppError('Enter valid ticket prices', 400);

  // Prevent two overlapping shows on the same screen
  const clash = await Show.findOne({
    theatre,
    screen: screenNo,
    isActive: true,
    startTime: { $lt: end },
    endTime: { $gt: start },
  });
  if (clash) {
    throw new AppError(`Screen ${screenNo} already has a show at ${formatIST(clash.startTime)}`, 409);
  }

  const show = await Show.create({
    movie,
    theatre,
    screen: screenNo,
    startTime: start,
    endTime: end,
    format: format || '2D',
    language: language || movieDoc.language,
    prices: { regular, premium },
    rows: rowsN,
    seatsPerRow: perRow,
    premiumRows: Math.min(Math.max(Number(premiumRows) || 0, 0), rowsN),
    totalSeats: rowsN * perRow,
    availableSeats: rowsN * perRow,
  });

  try {
    await Seat.insertMany(buildSeats(show));
  } catch (err) {
    await Show.findByIdAndDelete(show._id);
    throw err;
  }
  res.status(201).json({ success: true, show });
});

// PUT /api/shows/:id (admin) - prices, format and active status can change; the seat layout cannot
exports.updateShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) throw new AppError('Show not found', 404);
  const { regularPrice, premiumPrice, format, isActive } = req.body;

  if (regularPrice !== undefined && regularPrice !== '') {
    show.prices.regular = Number(regularPrice);
    await Seat.updateMany(
      { show: show._id, type: 'regular', status: 'available' },
      { $set: { price: show.prices.regular } }
    );
  }
  if (premiumPrice !== undefined && premiumPrice !== '') {
    show.prices.premium = Number(premiumPrice);
    await Seat.updateMany(
      { show: show._id, type: 'premium', status: 'available' },
      { $set: { price: show.prices.premium } }
    );
  }
  if (format) show.format = format;
  if (isActive !== undefined) show.isActive = isActive === true || isActive === 'true';

  await show.save();
  res.json({ success: true, show });
});

// DELETE /api/shows/:id (admin)
exports.deleteShow = asyncHandler(async (req, res) => {
  if (await Booking.exists({ show: req.params.id, status: 'confirmed' })) {
    throw new AppError('This show has confirmed bookings. Mark it inactive instead of deleting.', 400);
  }
  const show = await Show.findByIdAndDelete(req.params.id);
  if (!show) throw new AppError('Show not found', 404);
  await Seat.deleteMany({ show: show._id });
  res.json({ success: true, message: 'Show deleted' });
});
