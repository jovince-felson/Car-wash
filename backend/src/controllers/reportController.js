const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Expense = require('../models/Expense');
const Inventory = require('../models/Inventory');

// GET /api/reports/dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStr = today.slice(0, 7);
    const monthStart = new Date(`${monthStr}-01`);
    const monthEnd = new Date(monthStart); monthEnd.setMonth(monthEnd.getMonth() + 1);

    const [
      todayBookings, pendingCount, monthTxns,
      totalCustomers, lowStockItems, staff,
    ] = await Promise.all([
      Booking.find({ date: today }).populate('staffId', 'name'),
      Booking.countDocuments({ status: 'pending' }),
      Transaction.find({ createdAt: { $gte: monthStart, $lt: monthEnd } }),
      Customer.countDocuments(),
      Inventory.find({ $where: 'this.quantity <= this.threshold' }),
      Staff.find({ isActive: true }),
    ]);

    // Low stock via JS since $where is deprecated in newer Mongo
    const allInventory = await Inventory.find();
    const lowStock = allInventory.filter(i => i.quantity <= i.threshold);

    const monthRevenue = monthTxns.reduce((s, t) => s + t.amount, 0);

    // Top package
    const pkgCounts = await Booking.aggregate([
      { $group: { _id: '$package', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    const recentTxns = await Transaction.find().sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      todayBookings,
      pendingCount,
      monthRevenue,
      totalCustomers,
      lowStockAlerts: lowStock.length,
      lowStockItems: lowStock,
      staff,
      recentTransactions: recentTxns,
      topPackage: pkgCounts[0]?._id || null,
    });
  } catch (err) { next(err); }
};

// GET /api/reports/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    // Revenue by package
    const byPackage = await Transaction.aggregate([
      { $group: { _id: '$package', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    // Revenue by vehicle
    const byVehicle = await Transaction.aggregate([
      { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'booking' } },
      { $unwind: '$booking' },
      { $group: { _id: '$booking.vehicle', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    // Payment methods
    const byMethod = await Transaction.aggregate([
      { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    // Monthly revenue (last 6 months)
    const monthlyRevenue = await Transaction.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 6 },
    ]);

    // Monthly expenses (last 6 months)
    const monthlyExpenses = await Expense.aggregate([
      {
        $group: {
          _id: '$date',
          total: { $sum: '$amount' },
        },
      },
    ]);

    // Collapse expenses to month
    const expByMonth = {};
    monthlyExpenses.forEach(e => {
      const m = e._id?.slice(0, 7);
      if (m) expByMonth[m] = (expByMonth[m] || 0) + e.total;
    });

    // Top customers
    const topCustomers = await Customer.find().sort({ totalSpent: -1 }).limit(5);

    // Staff performance
    const staffPerf = await Transaction.aggregate([
      { $match: { staffId: { $ne: null } } },
      { $group: { _id: '$staffId', washes: { $sum: 1 }, earned: { $sum: '$amount' } } },
      { $lookup: { from: 'staff', localField: '_id', foreignField: '_id', as: 'staff' } },
      { $unwind: '$staff' },
      { $project: { name: '$staff.name', role: '$staff.role', washes: 1, earned: 1, commission: '$staff.commission', monthlyEarnings: '$staff.monthlyEarnings' } },
    ]);

    res.json({
      success: true,
      byPackage, byVehicle, byMethod,
      monthlyRevenue, expByMonth,
      topCustomers, staffPerf,
    });
  } catch (err) { next(err); }
};

// GET /api/reports/pnl
exports.getPnL = async (req, res, next) => {
  try {
    const revenueByMonth = await Transaction.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$amount' } } },
      { $sort: { _id: -1 } },
    ]);
    const expenseByMonth = await Expense.aggregate([
      { $group: { _id: { $substr: ['$date', 0, 7] }, expenses: { $sum: '$amount' } } },
    ]);
    const expMap = {};
    expenseByMonth.forEach(e => { expMap[e._id] = e.expenses; });
    const pnl = revenueByMonth.map(r => ({
      month: r._id,
      revenue: r.revenue,
      expenses: expMap[r._id] || 0,
      profit: r.revenue - (expMap[r._id] || 0),
    }));
    res.json({ success: true, pnl });
  } catch (err) { next(err); }
};
