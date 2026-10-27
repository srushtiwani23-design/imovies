const crypto = require('crypto');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Seat = require('../models/Seat');
const Show = require('../models/Show');
const Movie = require('../models/Movie');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { emitSeatUpdate } = require('../socket');
const { getPagination, paged, generateCode, formatIST } = require('../utils/helpers');

const MAX_SEATS_PER_BOOKING = 10;

/*
 * Demo payment gateway.
 * No real money moves. These test values simulate a failed payment:
 *   Card 4000 0000 0000 0002   |   UPI fail@upi
 * Everything else that is correctly formatted succeeds.
 */
const TEST_FAIL_CARD = '4000000000000002';
const TEST_FAIL_UPI = 'fail@upi';

function validatePaymentDetails(method, details = {}) {
  if (method === 'card') {
    const num = String(details.cardNumber || '').replace(/\s+/g, '');
    if (!/^\d{16}$/.test(num)) return 'Enter a valid 16 digit card number';
    return null;
  }
  if (method === 'upi') {
    if (!/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(String(details.upiId || '').trim())) return 'Enter a valid UPI ID, like name@bank';
    return null;
  }
  if (method === 'netbanking') {
    if (!details.bank) return 'Choose your bank';
    return null;
  }
  return 'Choose a payment method';
}

function processDemoPayment(method, details = {}) {
  if (method === 'card') {
    const num = String(details.cardNumber).replace(/\s+/g, '');
    const reference = `Card ending ${num.slice(-4)}`;
    if (num === TEST_FAIL_CARD) return { ok: false, reference, reason: 'Card declined by the bank' };
    return { ok: true, reference };
  }
  if (method === 'upi') {
    const id = String(details.upiId).trim().toLowerCase();
    if (id === TEST_FAIL_UPI) return { ok: false, reference: id, reason: 'UPI request was declined' };
    return { ok: true, reference: id };
  }
  return { ok: true, reference: String(details.bank) };
}

const transactionId = () => `TXN${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

// POST /api/bookings  { showId, seatLabels, paymentMethod, paymentDetails }
exports.createBooking = asyncHandler(async (req, res) => {
  const { showId, seatLabels, paymentMethod, paymentDetails } = req.body;
  if (!showId) throw new AppError('Show is required', 400);
  if (!Array.isArray(seatLabels) || !seatLabels.length) throw new AppError('Select at least one seat', 400);
  const labels = [...new Set(seatLabels.map(String))].sort();
  if (labels.length > MAX_SEATS_PER_BOOKING) {
    throw new AppError(`You can book up to ${MAX_SEATS_PER_BOOKING} seats at a time`, 400);
  }

  const show = await Show.findById(showId);
  if (!show || !show.isActive) throw new AppError('Show not found', 404);
  if (show.startTime <= new Date()) throw new AppError('Booking is closed for this show', 400);

  const detailsError = validatePaymentDetails(paymentMethod, paymentDetails);
  if (detailsError) throw new AppError(detailsError, 400);

  // Seats must still be held by this user
  const seats = await Seat.find({
    show: show._id,
    label: { $in: labels },
    status: 'locked',
    lockedBy: req.user._id,
    lockedUntil: { $gt: new Date() },
  });
  if (seats.length !== labels.length) {
    throw new AppError('Your seat hold has expired. Please select your seats again.', 409);
  }

  const totalAmount = seats.reduce((sum, seat) => sum + seat.price, 0);
  const booking = await Booking.create({
    user: req.user._id,
    show: show._id,
    movie: show.movie,
    theatre: show.theatre,
    seats: labels,
    seatIds: seats.map((s) => s._id),
    showTime: show.startTime,
    totalAmount,
    status: 'pending',
    bookingCode: generateCode(),
  });

  const result = processDemoPayment(paymentMethod, paymentDetails);
  const payment = await Payment.create({
    booking: booking._id,
    user: req.user._id,
    amount: totalAmount,
    method: paymentMethod,
    status: result.ok ? 'success' : 'failed',
    transactionId: transactionId(),
    reference: result.reference,
    failureReason: result.ok ? '' : result.reason,
  });
  booking.payment = payment._id;

  if (!result.ok) {
    booking.status = 'failed';
    await booking.save();
    await Notification.create({
      user: req.user._id,
      type: 'payment',
      title: 'Payment failed',
      message: `Your payment of ₹${totalAmount} did not go through (${result.reason}). Your seats are held for a few more minutes.`,
    });
    throw new AppError(`Payment failed: ${result.reason}. Your seats are still held, so you can try again.`, 402);
  }

  // Convert the hold into a booking, only for seats this user still holds
  const update = await Seat.updateMany(
    { _id: { $in: booking.seatIds }, status: 'locked', lockedBy: req.user._id },
    { $set: { status: 'booked', booking: booking._id, lockedBy: null, lockedUntil: null } }
  );

  if (update.modifiedCount !== seats.length) {
    await Seat.updateMany(
      { booking: booking._id, status: 'booked' },
      { $set: { status: 'available', booking: null } }
    );
    booking.status = 'failed';
    await booking.save();
    payment.status = 'refunded';
    await payment.save();
    throw new AppError('Your seats could not be confirmed. The payment has been refunded.', 409);
  }

  booking.status = 'confirmed';
  await booking.save();
  await Show.updateOne({ _id: show._id }, { $inc: { availableSeats: -seats.length } });

  const movie = await Movie.findById(show.movie).select('title').lean();
  await Notification.create({
    user: req.user._id,
    type: 'booking',
    title: 'Booking confirmed',
    message: `${movie?.title || 'Your movie'}: seats ${labels.join(', ')} on ${formatIST(show.startTime)}. Booking code ${booking.bookingCode}.`,
  });

  emitSeatUpdate(req.app.get('io'), show._id, labels, 'booked', req.user._id);
  res.status(201).json({ success: true, booking });
});

// GET /api/bookings/my?type=upcoming|past&page=
exports.getMyBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 6, 20);
  const now = new Date();
  const type = req.query.type === 'past' ? 'past' : 'upcoming';

  const filter =
    type === 'upcoming'
      ? { user: req.user._id, status: 'confirmed', showTime: { $gte: now } }
      : {
          user: req.user._id,
          status: { $in: ['confirmed', 'cancelled'] },
          $or: [{ showTime: { $lt: now } }, { status: 'cancelled' }],
        };

  const [items, total] = await Promise.all([
    Booking.find(filter)
      .populate('movie', 'title posterUrl language durationMins genre')
      .populate('theatre', 'name city')
      .sort({ showTime: type === 'upcoming' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);
  res.json(paged(items, total, page, limit));
});

// GET /api/bookings (admin) ?status=&page=
exports.getAllBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Booking.find(filter)
      .populate('user', 'name email')
      .populate('movie', 'title')
      .populate('theatre', 'name city')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);
  res.json(paged(items, total, page, limit));
});

// GET /api/bookings/:id
exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('movie', 'title posterUrl language durationMins certificate genre')
    .populate('theatre', 'name city address')
    .populate('show', 'screen format startTime')
    .populate('payment', 'method status reference transactionId amount createdAt');
  if (!booking) throw new AppError('Booking not found', 404);
  if (String(booking.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw new AppError('You can only view your own bookings', 403);
  }
  res.json({ success: true, booking });
});

// PUT /api/bookings/:id/cancel
exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  if (String(booking.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw new AppError('You can only cancel your own bookings', 403);
  }
  if (booking.status !== 'confirmed') throw new AppError('Only confirmed bookings can be cancelled', 400);

  const windowHours = Number(process.env.CANCEL_WINDOW_HOURS ?? 2);
  if (booking.showTime.getTime() - Date.now() < windowHours * 60 * 60 * 1000) {
    throw new AppError(`Bookings can be cancelled up to ${windowHours} hours before the show`, 400);
  }

  await Seat.updateMany(
    { booking: booking._id, status: 'booked' },
    { $set: { status: 'available', booking: null } }
  );
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  await booking.save();

  if (booking.payment) await Payment.updateOne({ _id: booking.payment }, { $set: { status: 'refunded' } });
  await Show.updateOne({ _id: booking.show }, { $inc: { availableSeats: booking.seats.length } });

  await Notification.create({
    user: booking.user,
    type: 'cancellation',
    title: 'Booking cancelled',
    message: `Booking ${booking.bookingCode} was cancelled. ₹${booking.totalAmount} will be refunded to your original payment method.`,
  });

  emitSeatUpdate(req.app.get('io'), booking.show, booking.seats, 'available');
  res.json({ success: true, booking });
});
