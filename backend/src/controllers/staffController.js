const Staff = require('../models/Staff');

// GET /api/staff
exports.getStaff = async (req, res, next) => {
  try {
    const staff = await Staff.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, staff });
  } catch (err) { next(err); }
};

// POST /api/staff
exports.createStaff = async (req, res, next) => {
  try {
    const staff = await Staff.create(req.body);
    res.status(201).json({ success: true, staff });
  } catch (err) { next(err); }
};

// PATCH /api/staff/:id
exports.updateStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, staff });
  } catch (err) { next(err); }
};

// DELETE /api/staff/:id
exports.deleteStaff = async (req, res, next) => {
  try {
    await Staff.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Staff removed' });
  } catch (err) { next(err); }
};

// PATCH /api/staff/:id/attendance
exports.toggleAttendance = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    staff.attendance = !staff.attendance;
    await staff.save();
    res.json({ success: true, staff });
  } catch (err) { next(err); }
};
