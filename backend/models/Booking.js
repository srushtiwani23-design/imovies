const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true },
    seats: [{ type: String }],
    seatIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Seat' }],
    showTime: { type: Date, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'failed'],
      default: 'pending',
    },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    bookingCode: { type: String, required: true, unique: true },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes for booking history
bookingSchema.index({ user: 1, showTime: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ show: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
