const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: {
    type: String,
    enum: ['supplies', 'utilities', 'rent', 'salary', 'equipment', 'maintenance', 'marketing', 'other'],
    default: 'other',
  },
  date: { type: String, required: true },   // YYYY-MM-DD
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
