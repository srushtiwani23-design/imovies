const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['card', 'upi', 'netbanking'], required: true },
    status: { type: String, enum: ['success', 'failed', 'refunded'], required: true },
    transactionId: { type: String, required: true },
    reference: { type: String, default: '' }, // masked card / UPI id / bank
    failureReason: { type: String, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
