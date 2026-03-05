require('dotenv').config();
const mongoose = require('mongoose');
const User       = require('../models/User');
const Staff      = require('../models/Staff');
const Inventory  = require('../models/Inventory');
const Booking    = require('../models/Booking');
const Customer   = require('../models/Customer');
const Transaction= require('../models/Transaction');
const Expense    = require('../models/Expense');

// ─── Pricing (mirrors frontend helpers.js) ────────────────────────────────────
const PACKAGES = { basic: 200, premium: 400, deluxe: 700 };
const VEHICLE_MULT = { bike: 0.7, car: 1.0, suv: 1.3, truck: 1.6 };

function calcPrice(pkg, vehicle) {
  return Math.round(PACKAGES[pkg] * VEHICLE_MULT[vehicle]);
}
function calcPoints(amount) { return Math.floor(amount / 100); }
function membershipDiscount(membership, subtotal) {
  if (membership === 'platinum') return Math.round(subtotal * 0.15);
  if (membership === 'gold')     return Math.round(subtotal * 0.10);
  return 0;
}
function determineMembership(totalSpent) {
  if (totalSpent >= 15000) return 'platinum';
  if (totalSpent >= 5000)  return 'gold';
  return 'silver';
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function todayStr()    { return new Date().toISOString().split('T')[0]; }
function tomorrowStr() { return daysAgo(-1); }
function pick(arr)     { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Customer pool ────────────────────────────────────────────────────────────
const CUSTOMER_POOL = [
  { name: 'Arjun Mehta',    phone: '9876500001', email: 'arjun@gmail.com',    vehicle: { number: 'TN01AB1234', type: 'car'   } },
  { name: 'Divya Nair',     phone: '9876500002', email: 'divya@gmail.com',    vehicle: { number: 'TN02CD5678', type: 'suv'   } },
  { name: 'Karthik Raj',    phone: '9876500003', email: 'karthik@gmail.com',  vehicle: { number: 'TN03EF9012', type: 'bike'  } },
  { name: 'Meena Patel',    phone: '9876500004', email: 'meena@gmail.com',    vehicle: { number: 'TN04GH3456', type: 'car'   } },
  { name: 'Suresh Babu',    phone: '9876500005', email: 'suresh@gmail.com',   vehicle: { number: 'TN05IJ7890', type: 'truck' } },
  { name: 'Lakshmi Devi',   phone: '9876500006', email: 'lakshmi@gmail.com',  vehicle: { number: 'TN06KL1234', type: 'car'   } },
  { name: 'Rahul Sharma',   phone: '9876500007', email: 'rahul@gmail.com',    vehicle: { number: 'TN07MN5678', type: 'suv'   } },
  { name: 'Preethi Kumar',  phone: '9876500008', email: 'preethi@gmail.com',  vehicle: { number: 'TN08OP9012', type: 'car'   } },
  { name: 'Venkat Subbu',   phone: '9876500009', email: 'venkat@gmail.com',   vehicle: { number: 'TN09QR3456', type: 'car'   } },
  { name: 'Anjali Singh',   phone: '9876500010', email: 'anjali@gmail.com',   vehicle: { number: 'TN10ST7890', type: 'bike'  } },
  { name: 'Dinesh Moorthy', phone: '9876500011', email: 'dinesh@gmail.com',   vehicle: { number: 'TN11UV1234', type: 'suv'   } },
  { name: 'Kavitha Rajan',  phone: '9876500012', email: 'kavitha@gmail.com',  vehicle: { number: 'TN12WX5678', type: 'car'   } },
];

const PAYMENT_METHODS = ['cash', 'upi', 'card'];

// ─── Historical bookings: [daysAgo, time, phone, package, pointsUsed] ─────────
// 78 completed bookings spread across 90 days for rich reports
const HISTORY = [
  // ── ~3 months ago ──
  [89,'09:00','9876500001','basic',  0], [88,'10:00','9876500002','premium',0],
  [87,'11:00','9876500003','basic',  0], [85,'09:30','9876500004','deluxe', 0],
  [84,'14:00','9876500005','premium',0], [83,'08:30','9876500006','basic',  0],
  [82,'15:00','9876500007','deluxe', 0], [80,'10:30','9876500001','premium',0],
  [79,'11:30','9876500008','basic',  0], [78,'09:00','9876500009','premium',0],
  [77,'14:30','9876500010','basic',  0], [75,'10:00','9876500011','deluxe', 0],
  [74,'13:00','9876500012','premium',0], [73,'08:00','9876500002','deluxe', 0],
  [72,'09:30','9876500003','premium',0], [70,'10:00','9876500004','basic',  0],
  [69,'11:00','9876500005','premium',0], [68,'14:00','9876500006','deluxe', 0],
  [67,'15:30','9876500007','basic',  0], [65,'09:00','9876500001','deluxe', 0],
  // ── ~2 months ago ──
  [63,'10:30','9876500008','premium',0], [62,'11:00','9876500009','deluxe', 0],
  [61,'08:30','9876500010','basic',  0], [60,'13:30','9876500011','premium',0],
  [59,'14:00','9876500012','basic',  0], [58,'09:00','9876500001','premium',5],
  [57,'10:00','9876500002','basic',  0], [55,'11:30','9876500003','deluxe', 0],
  [54,'14:30','9876500004','premium',0], [53,'09:30','9876500005','deluxe', 0],
  [52,'08:00','9876500006','basic',  0], [51,'10:00','9876500007','premium',0],
  [50,'15:00','9876500008','deluxe', 0], [49,'11:00','9876500009','basic',  0],
  [48,'13:00','9876500010','premium',0], [46,'09:00','9876500011','deluxe', 8],
  [45,'10:30','9876500012','premium',0], [44,'08:30','9876500001','basic',  0],
  [43,'14:00','9876500002','deluxe', 0], [42,'11:30','9876500003','premium',0],
  [41,'09:00','9876500004','basic',  0], [40,'15:30','9876500005','deluxe', 0],
  // ── Last month ──
  [38,'10:00','9876500006','premium',0], [37,'09:30','9876500007','basic',  0],
  [36,'11:00','9876500008','deluxe', 0], [35,'14:00','9876500009','premium',4],
  [34,'08:30','9876500010','basic',  0], [33,'10:30','9876500011','premium',0],
  [32,'13:30','9876500012','deluxe', 0], [31,'09:00','9876500001','premium',0],
  [30,'15:00','9876500002','basic',  0], [29,'11:30','9876500003','deluxe', 0],
  [28,'10:00','9876500004','premium',0], [27,'08:00','9876500005','basic',  0],
  [26,'14:30','9876500006','deluxe', 6], [25,'09:30','9876500007','premium',0],
  [24,'11:00','9876500008','basic',  0], [23,'13:00','9876500009','deluxe', 0],
  [22,'10:30','9876500010','premium',0], [21,'08:30','9876500011','basic',  0],
  [20,'15:00','9876500012','premium',0], [19,'09:00','9876500001','deluxe',10],
  [18,'10:00','9876500002','premium',0], [17,'11:30','9876500003','basic',  0],
  [16,'14:00','9876500004','deluxe', 0], [15,'09:30','9876500005','premium',0],
  // ── Last 2 weeks ──
  [13,'10:00','9876500006','basic',  0], [12,'11:00','9876500007','deluxe', 0],
  [11,'09:30','9876500008','premium',4], [10,'14:00','9876500009','basic',  0],
  [9, '10:30','9876500010','deluxe', 0], [8, '09:00','9876500011','premium',0],
  [7, '11:00','9876500012','basic',  0], [6, '10:00','9876500001','premium',0],
  [5, '09:30','9876500002','deluxe', 5], [4, '11:30','9876500003','premium',0],
  [3, '14:00','9876500004','basic',  0], [2, '10:00','9876500005','deluxe', 0],
  [1, '09:00','9876500006','premium',3],
];

// ─── Monthly expenses ──────────────────────────────────────────────────────────
const EXPENSES = [
  // 3 months ago
  { n: 88, desc: 'Monthly Rent',             amt: 25000, cat: 'rent'        },
  { n: 87, desc: 'Staff Salaries',            amt: 44000, cat: 'salary'      },
  { n: 85, desc: 'Water & Electricity',       amt:  8500, cat: 'utilities'   },
  { n: 83, desc: 'Car Shampoo Restock',       amt:  3600, cat: 'supplies'    },
  { n: 80, desc: 'Pressure Washer Service',   amt:  4200, cat: 'maintenance' },
  { n: 78, desc: 'Foam Spray Restock',        amt:  5400, cat: 'supplies'    },
  { n: 75, desc: 'Pamphlet Printing',         amt:  1800, cat: 'marketing'   },
  // 2 months ago
  { n: 60, desc: 'Monthly Rent',             amt: 25000, cat: 'rent'        },
  { n: 59, desc: 'Staff Salaries',            amt: 44000, cat: 'salary'      },
  { n: 57, desc: 'Water & Electricity',       amt:  9100, cat: 'utilities'   },
  { n: 55, desc: 'Cleaning Cloth Restock',    amt:  1500, cat: 'supplies'    },
  { n: 53, desc: 'Vacuum Cleaner Repair',     amt:  2800, cat: 'equipment'   },
  { n: 50, desc: 'Car Wax Restock',           amt:  7000, cat: 'supplies'    },
  { n: 46, desc: 'Social Media Ads',          amt:  3000, cat: 'marketing'   },
  { n: 44, desc: 'Tire Polish Restock',       amt:  3300, cat: 'supplies'    },
  // Last month
  { n: 30, desc: 'Monthly Rent',             amt: 25000, cat: 'rent'        },
  { n: 29, desc: 'Staff Salaries',            amt: 44000, cat: 'salary'      },
  { n: 27, desc: 'Water & Electricity',       amt:  8200, cat: 'utilities'   },
  { n: 24, desc: 'Car Shampoo Restock',       amt:  3600, cat: 'supplies'    },
  { n: 21, desc: 'Hose & Nozzle Replacement', amt:  1200, cat: 'equipment'   },
  { n: 18, desc: 'Foam Spray Restock',        amt:  5400, cat: 'supplies'    },
  { n: 15, desc: 'Google Ads',               amt:  2500, cat: 'marketing'   },
  { n: 10, desc: 'Miscellaneous Supplies',    amt:   850, cat: 'other'       },
];

// ─── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect("mongodb://localhost:27017/sparkwash");
  console.log('🔌 Connected to MongoDB\n');

  // 1. Users
  await User.deleteMany({});
  for (const u of [
    { name: 'Admin User',    username: 'admin',      email: 'admin@sparkwash.com',  password: 'admin123',  role: 'admin' },
    { name: 'Ravi Kumar',    username: 'staff1',     email: 'ravi@sparkwash.com',   password: 'staff123',  role: 'staff' },
    { name: 'Priya Sharma',  username: 'accountant', email: 'priya@sparkwash.com',  password: 'acct123',   role: 'accountant' },
    { name: 'John Customer', username: 'customer',   email: 'customer@example.com', password: 'cust123',   role: 'customer' },
  ]) await User.create(u);
  console.log('✅ Users seeded (4)');

  // 2. Staff
  await Staff.deleteMany({});
  const staffDocs = await Staff.insertMany([
    { name: 'Ravi Kumar',  role: 'Washer',     phone: '9876543210', salary: 12000, commission: 5, monthlyEarnings: 0, attendance: true  },
    { name: 'Suresh M',    role: 'Detailer',   phone: '9123456789', salary: 14000, commission: 7, monthlyEarnings: 0, attendance: true  },
    { name: 'Anand R',     role: 'Supervisor', phone: '9000000001', salary: 18000, commission: 3, monthlyEarnings: 0, attendance: false },
  ]);
  const staffIds = staffDocs.map(s => s._id);
  console.log('✅ Staff seeded (3)');

  // 3. Inventory
  await Inventory.deleteMany({});
  await Inventory.insertMany([
    { name: 'Car Shampoo',    unit:'L',   quantity:50,  costPrice:120, threshold:10, usagePerWash:{basic:0.2,premium:0.3,deluxe:0.5} },
    { name: 'Foam Spray',     unit:'L',   quantity:30,  costPrice:180, threshold:8,  usagePerWash:{basic:0.3,premium:0.4,deluxe:0.6} },
    { name: 'Car Wax',        unit:'kg',  quantity:20,  costPrice:350, threshold:5,  usagePerWash:{basic:0,  premium:0,  deluxe:0.1} },
    { name: 'Tire Polish',    unit:'L',   quantity:15,  costPrice:220, threshold:4,  usagePerWash:{basic:0,  premium:0.1,deluxe:0.2} },
    { name: 'Cleaning Cloth', unit:'pcs', quantity:100, costPrice:30,  threshold:20, usagePerWash:{basic:1,  premium:2,  deluxe:3  } },
  ]);
  console.log('✅ Inventory seeded (5 items)');

  // 4. Customers
  await Customer.deleteMany({});
  const customerMap = {};
  for (const cp of CUSTOMER_POOL) {
    const doc = await Customer.create({
      name: cp.name, phone: cp.phone, email: cp.email,
      vehicleNumbers: [cp.vehicle.number],
      totalVisits: 0, totalSpent: 0, points: 0, membership: 'silver',
    });
    customerMap[cp.phone] = { doc, vehicle: cp.vehicle, points: 0, totalSpent: 0, washHistory: [] };
  }
  console.log(`✅ Customers seeded (${CUSTOMER_POOL.length})`);

  // 5. Bookings + Transactions
  await Booking.deleteMany({});
  await Transaction.deleteMany({});

  const staffEarnings = {};
  staffDocs.forEach(s => { staffEarnings[s._id.toString()] = 0; });

  for (const [dAgo, timeSlot, phone, pkg, ptsUsed] of HISTORY) {
    const cm        = customerMap[phone];
    const membership = determineMembership(cm.totalSpent);
    const subtotal  = calcPrice(pkg, cm.vehicle.type);
    const discount  = membershipDiscount(membership, subtotal);
    const ptVal     = ptsUsed * 10;
    const amount    = Math.max(0, subtotal - discount - ptVal);
    const earnedPts = calcPoints(amount);
    const method    = pick(PAYMENT_METHODS);
    const sId       = pick(staffIds);
    const dateStr   = daysAgo(dAgo);
    const completedAt = new Date(`${dateStr}T${timeSlot}:00`);
    completedAt.setMinutes(completedAt.getMinutes() + 45);

    const booking = await Booking.create({
      customerId: cm.doc._id, customerName: cm.doc.name, phone: cm.doc.phone,
      vehicleNumber: cm.vehicle.number, package: pkg, vehicle: cm.vehicle.type,
      date: dateStr, time: timeSlot, price: subtotal,
      status: 'completed', staffId: sId, completedAt,
      createdAt: new Date(`${dateStr}T${timeSlot}:00`),
    });

    await Transaction.create({
      bookingId: booking._id, customerId: cm.doc._id, customerName: cm.doc.name,
      staffId: sId, package: pkg, vehicle: cm.vehicle.type,
      subtotal, membershipDiscount: discount,
      pointsUsed: ptsUsed, pointsValue: ptVal, amount, method,
      earnedPoints: earnedPts, createdAt: completedAt,
    });

    // Accumulate customer stats
    cm.points     = Math.max(0, cm.points - ptsUsed) + earnedPts;
    cm.totalSpent += amount;
    cm.washHistory.push({ bookingId: booking._id, date: completedAt, package: pkg, vehicle: cm.vehicle.type, amount });

    // Accumulate commission (last 30 days only = current month)
    if (dAgo <= 30) {
      const commission = staffDocs.find(s => s._id.equals(sId))?.commission || 5;
      staffEarnings[sId.toString()] += Math.round(amount * commission / 100);
    }
  }

  // Persist customer stats
  for (const cp of CUSTOMER_POOL) {
    const cm = customerMap[cp.phone];
    await Customer.findByIdAndUpdate(cm.doc._id, {
      totalVisits: cm.washHistory.length,
      totalSpent:  cm.totalSpent,
      points:      cm.points,
      membership:  determineMembership(cm.totalSpent),
      lastVisit:   cm.washHistory.at(-1)?.date,
      washHistory: cm.washHistory,
    });
  }

  // Persist staff monthly earnings
  for (const s of staffDocs) {
    await Staff.findByIdAndUpdate(s._id, { monthlyEarnings: staffEarnings[s._id.toString()] || 0 });
  }
  console.log(`✅ Completed bookings seeded (${HISTORY.length})`);
  console.log(`✅ Transactions seeded (${HISTORY.length})`);

  // 6. Today's bookings
  const todayBookings = [
    { time:'09:00', phone:'9876500007', pkg:'premium', status:'approved',  staff: staffIds[0] },
    { time:'10:00', phone:'9876500008', pkg:'deluxe',  status:'approved',  staff: staffIds[1] },
    { time:'11:00', phone:'9876500009', pkg:'basic',   status:'pending',   staff: null },
    { time:'12:00', phone:'9876500010', pkg:'premium', status:'pending',   staff: null },
    { time:'14:00', phone:'9876500011', pkg:'deluxe',  status:'approved',  staff: staffIds[0] },
    { time:'15:30', phone:'9876500012', pkg:'basic',   status:'pending',   staff: null },
  ];
  for (const slot of todayBookings) {
    const cm = customerMap[slot.phone];
    await Booking.create({
      customerId: cm.doc._id, customerName: cm.doc.name, phone: cm.doc.phone,
      vehicleNumber: cm.vehicle.number, package: slot.pkg, vehicle: cm.vehicle.type,
      date: todayStr(), time: slot.time, price: calcPrice(slot.pkg, cm.vehicle.type),
      status: slot.status, staffId: slot.staff,
    });
  }
  console.log(`✅ Today's bookings seeded (6 — 3 approved, 3 pending)`);

  // 7. Tomorrow's bookings
  for (const slot of [
    { time:'09:30', phone:'9876500001', pkg:'deluxe'  },
    { time:'10:30', phone:'9876500002', pkg:'premium' },
    { time:'11:00', phone:'9876500003', pkg:'basic'   },
  ]) {
    const cm = customerMap[slot.phone];
    await Booking.create({
      customerId: cm.doc._id, customerName: cm.doc.name, phone: cm.doc.phone,
      vehicleNumber: cm.vehicle.number, package: slot.pkg, vehicle: cm.vehicle.type,
      date: tomorrowStr(), time: slot.time, price: calcPrice(slot.pkg, cm.vehicle.type),
      status: 'pending', staffId: null,
    });
  }
  console.log(`✅ Tomorrow's bookings seeded (3 pending)`);

  // 8. Expenses
  await Expense.deleteMany({});
  await Expense.insertMany(EXPENSES.map(e => ({
    description: e.desc, amount: e.amt, category: e.cat, date: daysAgo(e.n),
  })));
  console.log(`✅ Expenses seeded (${EXPENSES.length})`);

  // ── Summary ─────────────────────────────────────────────────────────────
  const totalRevenue  = HISTORY.reduce((s, [,, ph, pkg]) => s + calcPrice(pkg, CUSTOMER_POOL.find(c => c.phone === ph)?.vehicle.type || 'car'), 0);
  const totalExpenses = EXPENSES.reduce((s, e) => s + e.amt, 0);

  const membershipCounts = { silver: 0, gold: 0, platinum: 0 };
  for (const cp of CUSTOMER_POOL) {
    const cm = customerMap[cp.phone];
    membershipCounts[determineMembership(cm.totalSpent)]++;
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎉  SparkWash database seeded!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Customers    : ${CUSTOMER_POOL.length}  (🥈${membershipCounts.silver} silver · 🥇${membershipCounts.gold} gold · 💎${membershipCounts.platinum} platinum)`);
  console.log(`   Bookings     : ${HISTORY.length + 6 + 3} total`);
  console.log(`     ├ Completed: ${HISTORY.length} (over ~90 days)`);
  console.log(`     ├ Today    : 6  (3 approved · 3 pending)`);
  console.log(`     └ Tomorrow : 3  (pending)`);
  console.log(`   Transactions : ${HISTORY.length}`);
  console.log(`   Expenses     : ${EXPENSES.length}`);
  console.log(`   Revenue (90d): ₹${totalRevenue.toLocaleString('en-IN')}`);
  console.log(`   Expenses tot : ₹${totalExpenses.toLocaleString('en-IN')}`);
  console.log(`   Est. Profit  : ₹${(totalRevenue - totalExpenses).toLocaleString('en-IN')}`);
  console.log('───────────────────────────────────────────────────────');
  console.log('   Credentials:');
  console.log('     admin      / admin123');
  console.log('     staff1     / staff123');
  console.log('     accountant / acct123');
  console.log('     customer   / cust123');
  console.log('═══════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Seed error:', err.message); process.exit(1); });