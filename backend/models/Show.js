const mongoose = require('mongoose');

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true },
    screen: { type: Number, required: true, min: 1 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    language: { type: String, default: '' },
    format: { type: String, enum: ['2D', '3D', 'IMAX'], default: '2D' },
    prices: {
      regular: { type: Number, required: true, min: 0 },
      premium: { type: Number, required: true, min: 0 },
    },
    rows: { type: Number, required: true, min: 1, max: 26 },
    seatsPerRow: { type: Number, required: true, min: 1, max: 30 },
    premiumRows: { type: Number, default: 2, min: 0 },
    totalSeats: { type: Number, default: 0 },
    availableSeats: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for show filtering
showSchema.index({ movie: 1, startTime: 1 });
showSchema.index({ theatre: 1, startTime: 1 });
showSchema.index({ theatre: 1, screen: 1, startTime: 1 });

module.exports = mongoose.model('Show', showSchema);
