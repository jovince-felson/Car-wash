require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Staff = require('../models/Staff');
const Inventory = require('../models/Inventory');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Users
  await User.deleteMany({});
  const users = [
    { name: 'Admin User',    username: 'admin',      email: 'admin@sparkwash.com',      password: 'admin123',  role: 'admin' },
    { name: 'Ravi Kumar',    username: 'staff1',     email: 'ravi@sparkwash.com',       password: 'staff123',  role: 'staff' },
    { name: 'Priya Sharma',  username: 'accountant', email: 'priya@sparkwash.com',      password: 'acct123',   role: 'accountant' },
    { name: 'John Customer', username: 'customer',   email: 'customer@example.com',     password: 'cust123',   role: 'customer' },
  ];
  for (const u of users) {
    await User.create(u);
  }
  console.log('✅ Users seeded');

  // Staff
  await Staff.deleteMany({});
  await Staff.insertMany([
    { name: 'Ravi Kumar',  role: 'Washer',   phone: '9876543210', salary: 12000, commission: 5,  monthlyEarnings: 0, attendance: false },
    { name: 'Suresh M',    role: 'Detailer', phone: '9123456789', salary: 14000, commission: 7,  monthlyEarnings: 0, attendance: false },
    { name: 'Anand R',     role: 'Supervisor', phone: '9000000001', salary: 18000, commission: 3, monthlyEarnings: 0, attendance: false },
  ]);
  console.log('✅ Staff seeded');

  // Inventory
  await Inventory.deleteMany({});
  await Inventory.insertMany([
    { name: 'Car Shampoo',   unit: 'L',   quantity: 50, costPrice: 120, threshold: 10, usagePerWash: { basic: 0.2, premium: 0.3, deluxe: 0.5 } },
    { name: 'Foam Spray',    unit: 'L',   quantity: 30, costPrice: 180, threshold: 8,  usagePerWash: { basic: 0.3, premium: 0.4, deluxe: 0.6 } },
    { name: 'Car Wax',       unit: 'kg',  quantity: 20, costPrice: 350, threshold: 5,  usagePerWash: { basic: 0,   premium: 0,   deluxe: 0.1 } },
    { name: 'Tire Polish',   unit: 'L',   quantity: 15, costPrice: 220, threshold: 4,  usagePerWash: { basic: 0,   premium: 0.1, deluxe: 0.2 } },
    { name: 'Cleaning Cloth',unit: 'pcs', quantity: 100,costPrice: 30,  threshold: 20, usagePerWash: { basic: 1,   premium: 2,   deluxe: 3   } },
  ]);
  console.log('✅ Inventory seeded');

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('Default logins:');
  console.log('  admin / admin123');
  console.log('  staff1 / staff123');
  console.log('  accountant / acct123');
  console.log('  customer / cust123');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
