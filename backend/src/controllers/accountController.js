const Transaction = require('../models/Transaction');
const Expense = require('../models/Expense');

// GET /api/accounts/transactions
exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, month } = req.query;
    const filter = {};
    if (month) {
      const start = new Date(`${month}-01`);
      const end = new Date(start); end.setMonth(end.getMonth() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }
    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .populate('bookingId', 'date time vehicleNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, total, transactions });
  } catch (err) { next(err); }
};

// GET /api/accounts/expenses
exports.getExpenses = async (req, res, next) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json({ success: true, expenses });
  } catch (err) { next(err); }
};

// POST /api/accounts/expenses
exports.createExpense = async (req, res, next) => {
  try {
    const expense = await Expense.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json({ success: true, expense });
  } catch (err) { next(err); }
};

// DELETE /api/accounts/expenses/:id
exports.deleteExpense = async (req, res, next) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) { next(err); }
};
