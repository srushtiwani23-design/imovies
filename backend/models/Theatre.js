const mongoose = require('mongoose');

const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Theatre name is required'], trim: true },
    city: { type: String, required: [true, 'City is required'], trim: true },
    address: { type: String, trim: true, default: '' },
    screens: { type: Number, default: 3, min: 1, max: 20 },
    amenities: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

theatreSchema.index({ city: 1, name: 1 });

module.exports = mongoose.model('Theatre', theatreSchema);
