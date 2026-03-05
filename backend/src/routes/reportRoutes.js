const router = require('express').Router();
const c = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Reports
 * /reports/dashboard:
 *   get:
 *     tags: [Reports]
 *     summary: Dashboard stats
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/dashboard', c.getDashboard);
router.get('/analytics', authorize('admin', 'accountant'), c.getAnalytics);
router.get('/pnl', authorize('admin', 'accountant'), c.getPnL);

module.exports = router;
