const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  unit: { type: String, default: 'L' },
  quantity: { type: Number, required: true, default: 0 },
  costPrice: { type: Number, default: 0 },
  threshold: { type: Number, default: 5 },
  usagePerWash: {
    basic:   { type: Number, default: 0 },
    premium: { type: Number, default: 0 },
    deluxe:  { type: Number, default: 0 },
  },
}, { timestamps: true });

inventorySchema.virtual('isLow').get(function () {
  return this.quantity <= this.threshold;
});

module.exports = mongoose.model('Inventory', inventorySchema);
