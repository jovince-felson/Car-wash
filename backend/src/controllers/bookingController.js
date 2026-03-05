const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const Inventory = require('../models/Inventory');
const Staff = require('../models/Staff');
const emailService = require('../utils/email');
const logger = require('../config/logger');

const PACKAGES = {
  basic:   { name: 'Basic Wash',   price: 200 },
  premium: { name: 'Premium Wash', price: 400 },
  deluxe:  { name: 'Deluxe Wash',  price: 700 },
};
const VEHICLE_MULT = { bike: 0.7, car: 1.0, suv: 1.3, truck: 1.6 };
const MEMBERSHIP_DISCOUNT = { silver: 5, gold: 10, platinum: 15 };

function calcPrice(pkg, veh) {
  return Math.round((PACKAGES[pkg]?.price || 0) * (VEHICLE_MULT[veh] || 1));
}

// GET /api/bookings
exports.getBookings = async (req, res, next) => {
  try {
    const { status, date, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (date) filter.date = date;
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search } },
        { vehicleNumber: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .populate('staffId', 'name role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, total, bookings });
  } catch (err) { next(err); }
};

// POST /api/bookings
exports.createBooking = async (req, res, next) => {
  try {
    const { customerName, phone, vehicleNumber, package: pkg, vehicle, date, time } = req.body;

    // Double-booking check
    const conflict = await Booking.findOne({ date, time, status: { $nin: ['cancelled'] } });
    if (conflict)
      return res.status(409).json({ success: false, message: 'That time slot is already booked' });

    const price = calcPrice(pkg, vehicle);

    // Upsert customer
    let customer = await Customer.findOne({ phone });
    if (!customer) {
      customer = await Customer.create({ name: customerName, phone, vehicleNumbers: [vehicleNumber.toUpperCase()] });
    } else {
      if (!customer.vehicleNumbers.includes(vehicleNumber.toUpperCase())) {
        customer.vehicleNumbers.push(vehicleNumber.toUpperCase());
      }
      customer.name = customerName;
      await customer.save();
    }

    const booking = await Booking.create({
      customerId: customer._id,
      customerName, phone,
      vehicleNumber: vehicleNumber.toUpperCase(),
      package: pkg, vehicle, date, time, price,
    });

    // Emit real-time event
    const io = req.app.get('io');
    if (io) io.emit('booking:new', { booking });

    // Send confirmation email if customer has email
    if (customer.email) {
      await emailService.sendBookingConfirmation(customer.email, {
        name: customerName, package: PACKAGES[pkg]?.name, date, time, price,
      }).catch(e => logger.warn('Email failed', { error: e.message }));
    }

    logger.info(`Booking created: ${booking._id} for ${customerName}`);
    res.status(201).json({ success: true, booking });
  } catch (err) { next(err); }
};

// PATCH /api/bookings/:id
exports.updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('staffId', 'name role');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const io = req.app.get('io');
    if (io) io.emit('booking:updated', { booking });

    res.json({ success: true, booking });
  } catch (err) { next(err); }
};

// POST /api/bookings/:id/complete
exports.completeBooking = async (req, res, next) => {
  try {
    const { pointsToRedeem = 0, method = 'cash' } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'approved')
      return res.status(400).json({ success: false, message: 'Booking must be approved first' });

    const customer = await Customer.findById(booking.customerId);
    const discountPct = customer ? (MEMBERSHIP_DISCOUNT[customer.membership] || 0) : 0;
    const membershipDiscount = Math.round(booking.price * discountPct / 100);
    const pointsValue = Math.min(pointsToRedeem, booking.price - membershipDiscount);
    const amount = Math.max(0, booking.price - membershipDiscount - pointsValue);
    const earnedPoints = Math.floor(amount / 100);

    // Mark booking complete
    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();

    // Record transaction
    const txn = await Transaction.create({
      bookingId: booking._id,
      customerId: booking.customerId,
      customerName: booking.customerName,
      staffId: booking.staffId,
      package: booking.package,
      vehicle: booking.vehicle,
      subtotal: booking.price,
      membershipDiscount,
      pointsUsed: pointsToRedeem,
      pointsValue,
      amount,
      method,
      earnedPoints,
    });

    // Update customer
    if (customer) {
      customer.totalVisits += 1;
      customer.totalSpent += amount;
      customer.points = Math.max(0, (customer.points - pointsToRedeem) + earnedPoints);
      customer.lastVisit = new Date();
      customer.washHistory.push({
        bookingId: booking._id,
        date: new Date(),
        package: booking.package,
        vehicle: booking.vehicleNumber,
        amount,
      });
      customer.updateMembership();
      customer.followUpSent = false;
      await customer.save();
    }

    // Staff commission
    if (booking.staffId) {
      const staff = await Staff.findById(booking.staffId);
      if (staff) {
        const commission = amount * (staff.commission / 100);
        staff.monthlyEarnings += commission;
        await staff.save();
      }
    }

    // Deduct inventory
    const inventory = await Inventory.find();
    for (const item of inventory) {
      const usage = item.usagePerWash?.[booking.package] || 0;
      if (usage > 0) {
        item.quantity = Math.max(0, item.quantity - usage);
        await item.save();
        // Alert if low stock
        if (item.quantity <= item.threshold) {
          const io = req.app.get('io');
          if (io) io.emit('inventory:low', { item: item.name, quantity: item.quantity });
        }
      }
    }

    // Invoice email
    if (customer?.email) {
      await emailService.sendInvoice(customer.email, {
        name: booking.customerName, txnId: txn._id.toString().slice(-8).toUpperCase(),
        package: PACKAGES[booking.package]?.name, amount, method, earnedPoints,
      }).catch(e => logger.warn('Invoice email failed', { error: e.message }));
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('booking:completed', { bookingId: booking._id, amount });
      io.emit('dashboard:refresh');
    }

    logger.info(`Booking completed: ${booking._id}, amount ₹${amount}`);
    res.json({ success: true, booking, transaction: txn });
  } catch (err) { next(err); }
};

// GET /api/bookings/slots?date=YYYY-MM-DD
exports.getBookedSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    const bookings = await Booking.find({ date, status: { $nin: ['cancelled'] } }, 'time');
    res.json({ success: true, slots: bookings.map(b => b.time) });
  } catch (err) { next(err); }
};
