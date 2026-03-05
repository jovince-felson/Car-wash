const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');

// GET /api/customers
exports.getCustomers = async (req, res, next) => {
  try {
    const { search, membership } = req.query;
    const filter = {};
    if (membership && membership !== 'all') filter.membership = membership;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search } },
        { vehicleNumbers: { $regex: search, $options: 'i' } },
      ];
    }
    const customers = await Customer.find(filter).sort({ totalSpent: -1 });
    res.json({ success: true, customers });
  } catch (err) { next(err); }
};

// GET /api/customers/:id
exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    const transactions = await Transaction.find({ customerId: customer._id }).sort({ createdAt: -1 });
    res.json({ success: true, customer, transactions });
  } catch (err) { next(err); }
};

// PATCH /api/customers/:id
exports.updateCustomer = async (req, res, next) => {
  try {
    const allowed = ['notes', 'email', 'name'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const customer = await Customer.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, customer });
  } catch (err) { next(err); }
};

// GET /api/customers/stats
exports.getStats = async (req, res, next) => {
  try {
    const total = await Customer.countDocuments();
    const byMembership = await Customer.aggregate([
      { $group: { _id: '$membership', count: { $sum: 1 } } },
    ]);
    const topCustomers = await Customer.find().sort({ totalSpent: -1 }).limit(5);
    res.json({ success: true, total, byMembership, topCustomers });
  } catch (err) { next(err); }
};
