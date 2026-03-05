const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  vehicleNumber: { type: String, required: true, uppercase: true },
  package: { type: String, enum: ['basic', 'premium', 'deluxe'], required: true },
  vehicle: { type: String, enum: ['bike', 'car', 'suv', 'truck'], required: true },
  date: { type: String, required: true },       // YYYY-MM-DD
  time: { type: String, required: true },       // HH:MM
  price: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'cancelled', 'completed'],
    default: 'pending',
  },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  completedAt: Date,
  notes: String,
}, { timestamps: true });

// Prevent double booking same slot
bookingSchema.index({ date: 1, time: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
