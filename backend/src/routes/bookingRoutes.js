const router = require('express').Router();
const c = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Bookings
 * /bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: Get all bookings
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, approved, completed, cancelled]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of bookings
 *   post:
 *     tags: [Bookings]
 *     summary: Create a booking (public)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerName, phone, vehicleNumber, package, vehicle, date, time]
 *             properties:
 *               customerName:
 *                 type: string
 *               phone:
 *                 type: string
 *               vehicleNumber:
 *                 type: string
 *               package:
 *                 type: string
 *                 enum: [basic, premium, deluxe]
 *               vehicle:
 *                 type: string
 *                 enum: [bike, car, suv, truck]
 *               date:
 *                 type: string
 *               time:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created
 */
router.get('/slots', c.getBookedSlots);
router.post('/', c.createBooking);

router.use(protect);
router.get('/', authorize('admin', 'staff', 'accountant'), c.getBookings);
router.patch('/:id', authorize('admin', 'staff'), c.updateBooking);
router.post('/:id/complete', authorize('admin', 'staff'), c.completeBooking);

module.exports = router;
