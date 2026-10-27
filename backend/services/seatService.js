const Seat = require('../models/Seat');
const AppError = require('../utils/AppError');
const { emitSeatUpdate } = require('../socket');

const lockMinutes = () => Number(process.env.LOCK_MINUTES) || 8;
const RELEASE = { $set: { status: 'available', lockedBy: null, lockedUntil: null } };

async function releaseExpiredLocks(showId, io) {
  const now = new Date();
  const expired = await Seat.find({ show: showId, status: 'locked', lockedUntil: { $lt: now } })
    .select('label')
    .lean();
  if (!expired.length) return;
  await Seat.updateMany({ _id: { $in: expired.map((s) => s._id) }, status: 'locked' }, RELEASE);
  emitSeatUpdate(io, showId, expired.map((s) => s.label), 'available');
}

// Holds the given seats for the user. Replaces any earlier hold this user had on the same show.
async function lockSeats({ show, labels, userId, io }) {
  const total = await Seat.countDocuments({ show: show._id, label: { $in: labels } });
  if (total !== labels.length) throw new AppError('One or more selected seats do not exist', 400);

  await releaseExpiredLocks(show._id, io);

  // Release this user's previous holds that are no longer selected
  const previous = await Seat.find({
    show: show._id,
    status: 'locked',
    lockedBy: userId,
    label: { $nin: labels },
  })
    .select('label')
    .lean();
  if (previous.length) {
    await Seat.updateMany({ _id: { $in: previous.map((s) => s._id) } }, RELEASE);
    emitSeatUpdate(io, show._id, previous.map((s) => s.label), 'available');
  }

  const lockedUntil = new Date(Date.now() + lockMinutes() * 60 * 1000);
  const locked = [];

  // Atomic per-seat update: only succeeds if the seat is free or already held by this user
  for (const label of labels) {
    // eslint-disable-next-line no-await-in-loop
    const seat = await Seat.findOneAndUpdate(
      {
        show: show._id,
        label,
        $or: [{ status: 'available' }, { status: 'locked', lockedBy: userId }],
      },
      { $set: { status: 'locked', lockedBy: userId, lockedUntil } },
      { new: true }
    );

    if (!seat) {
      if (locked.length) {
        await Seat.updateMany(
          { show: show._id, label: { $in: locked }, status: 'locked', lockedBy: userId },
          RELEASE
        );
        emitSeatUpdate(io, show._id, locked, 'available');
      }
      throw new AppError(`Seat ${label} was just taken by someone else. Please pick another seat.`, 409);
    }
    locked.push(label);
  }

  emitSeatUpdate(io, show._id, locked, 'locked', userId);
  return { labels: locked, lockedUntil };
}

async function unlockUserSeats({ showId, userId, io }) {
  const mine = await Seat.find({ show: showId, status: 'locked', lockedBy: userId }).select('label').lean();
  if (!mine.length) return 0;
  await Seat.updateMany({ _id: { $in: mine.map((s) => s._id) } }, RELEASE);
  emitSeatUpdate(io, showId, mine.map((s) => s.label), 'available');
  return mine.length;
}

module.exports = { releaseExpiredLocks, lockSeats, unlockUserSeats };
