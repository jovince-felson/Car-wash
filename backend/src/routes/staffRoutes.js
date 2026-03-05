const router = require('express').Router();
const c = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Staff
 * /staff:
 *   get:
 *     tags: [Staff]
 *     summary: Get all staff
 *     responses:
 *       200:
 *         description: List of staff
 */
router.get('/', c.getStaff);
router.post('/', authorize('admin'), c.createStaff);
router.patch('/:id', authorize('admin'), c.updateStaff);
router.delete('/:id', authorize('admin'), c.deleteStaff);
router.patch('/:id/attendance', authorize('admin', 'staff'), c.toggleAttendance);

module.exports = router;
