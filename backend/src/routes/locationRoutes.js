const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Location
 * /location/staff:
 *   get:
 *     tags: [Location]
 *     summary: Get all active staff locations (Admin only)
 *     responses:
 *       200:
 *         description: Map of staffId -> location
 * /location/booking/:bookingId:
 *   get:
 *     tags: [Location]
 *     summary: Get assigned staff location for a booking (Customer)
 *     responses:
 *       200:
 *         description: Staff location for this booking
 */

// In-memory location store (per-process; replace with Redis in multi-instance prod)
const staffLocations = {};   // { staffId: { lat, lng, name, bookingId, timestamp } }


router.use(protect);

// Admin: get all staff locations
router.get('/staff', authorize('admin'), (req, res) => {
  res.json({ success: true, locations: staffLocations });
});

// Customer / Staff: get location for a specific booking's assigned staff
router.get('/booking/:bookingId', (req, res) => {
  const { bookingId } = req.params;
  const entry = Object.values(staffLocations).find(l => l.bookingId === bookingId);
  if (!entry) return res.json({ success: true, location: null });
  res.json({ success: true, location: entry });
});

// Staff: update own location (also done via socket, this is REST fallback)
router.post('/update', authorize('staff', 'admin'), (req, res) => {
  const { lat, lng, bookingId } = req.body;
  const staffId = req.user._id.toString();
  staffLocations[staffId] = {
    lat, lng, bookingId: bookingId || null,
    name: req.user.name,
    staffId,
    timestamp: new Date().toISOString(),
  };
  // Emit to all clients
  const io = req.app.get('io');
  if (io) io.emit('location:updated', { staffId, location: staffLocations[staffId] });
  res.json({ success: true });
});

// Staff: clear own location (go offline)
router.post('/clear', authorize('staff', 'admin'), (req, res) => {
  const staffId = req.user._id.toString();
  delete staffLocations[staffId];
  const io = req.app.get('io');
  if (io) io.emit('location:cleared', { staffId });
  res.json({ success: true });
});

// Export so server.js can pass io into the socket handler
module.exports = { router, staffLocations };
