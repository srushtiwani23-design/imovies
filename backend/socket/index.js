const { Server } = require('socket.io');
const Seat = require('../models/Seat');

function initSocket(server, allowedOrigins) {
  const io = new Server(server, { cors: { origin: allowedOrigins, credentials: true } });

  io.on('connection', (socket) => {
    // Each show has its own room so seat updates only reach people viewing that show
    socket.on('show:join', (showId) => {
      if (typeof showId === 'string') socket.join(`show:${showId}`);
    });
    socket.on('show:leave', (showId) => {
      if (typeof showId === 'string') socket.leave(`show:${showId}`);
    });
  });

  return io;
}

function emitSeatUpdate(io, showId, labels, status, userId = null) {
  if (!io || !labels || !labels.length) return;
  io.to(`show:${showId}`).emit('seats:update', {
    showId: String(showId),
    labels,
    status,
    userId: userId ? String(userId) : null,
  });
}

// Releases expired seat holds every 30 seconds and tells viewers in real time
function startLockSweeper(io, intervalMs = 30000) {
  setInterval(async () => {
    try {
      const now = new Date();
      const expired = await Seat.find({ status: 'locked', lockedUntil: { $lt: now } })
        .select('_id show label')
        .lean();
      if (!expired.length) return;

      await Seat.updateMany(
        { _id: { $in: expired.map((s) => s._id) }, status: 'locked', lockedUntil: { $lt: now } },
        { $set: { status: 'available', lockedBy: null, lockedUntil: null } }
      );

      const byShow = {};
      expired.forEach((s) => {
        const key = String(s.show);
        byShow[key] = byShow[key] || [];
        byShow[key].push(s.label);
      });
      Object.entries(byShow).forEach(([showId, labels]) => emitSeatUpdate(io, showId, labels, 'available'));
    } catch (err) {
      console.error('Seat lock sweeper error:', err.message);
    }
  }, intervalMs);
}

module.exports = { initSocket, emitSeatUpdate, startLockSweeper };
