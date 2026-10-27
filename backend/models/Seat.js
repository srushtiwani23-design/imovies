const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
  label: { type: String, required: true }, // e.g. "C7"
  row: { type: String, required: true },
  number: { type: Number, required: true },
  type: { type: String, enum: ['regular', 'premium'], default: 'regular' },
  price: { type: Number, required: true },
  status: { type: String, enum: ['available', 'locked', 'booked'], default: 'available' },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lockedUntil: { type: Date, default: null },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
});

// Indexes for seat availability
seatSchema.index({ show: 1, label: 1 }, { unique: true });
seatSchema.index({ show: 1, status: 1 });
seatSchema.index({ status: 1, lockedUntil: 1 });

module.exports = mongoose.model('Seat', seatSchema);
