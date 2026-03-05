const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, default: 'Washer' },
  phone: { type: String, trim: true },
  salary: { type: Number, required: true, default: 0 },
  commission: { type: Number, default: 0 },       // percentage
  monthlyEarnings: { type: Number, default: 0 },
  attendance: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);
