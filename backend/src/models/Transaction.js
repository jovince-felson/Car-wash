const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: String,
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  package: String,
  vehicle: String,
  subtotal: { type: Number, required: true },
  membershipDiscount: { type: Number, default: 0 },
  pointsUsed: { type: Number, default: 0 },
  pointsValue: { type: Number, default: 0 },
  amount: { type: Number, required: true },   // final paid
  method: { type: String, enum: ['cash', 'upi', 'card'], required: true },
  earnedPoints: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
