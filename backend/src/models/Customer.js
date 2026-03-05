const mongoose = require('mongoose');

const washHistorySchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  date: Date,
  package: String,
  vehicle: String,
  amount: Number,
}, { _id: false });

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  vehicleNumbers: [{ type: String, uppercase: true }],
  totalVisits: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  membership: { type: String, enum: ['silver', 'gold', 'platinum'], default: 'silver' },
  notes: { type: String, default: '' },
  washHistory: [washHistorySchema],
  lastVisit: Date,
  followUpSent: { type: Boolean, default: false },
}, { timestamps: true });

// Auto update membership based on totalSpent
customerSchema.methods.updateMembership = function () {
  if (this.totalSpent >= 15000) this.membership = 'platinum';
  else if (this.totalSpent >= 5000) this.membership = 'gold';
  else this.membership = 'silver';
};

module.exports = mongoose.model('Customer', customerSchema);
