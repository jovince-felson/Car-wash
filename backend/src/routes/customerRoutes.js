const router = require('express').Router();
const c = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'accountant'));

/**
 * @swagger
 * tags:
 *   name: Customers
 * /customers:
 *   get:
 *     tags: [Customers]
 *     summary: Get all customers
 *     responses:
 *       200:
 *         description: List of customers
 */
router.get('/stats', c.getStats);
router.get('/', c.getCustomers);
router.get('/:id', c.getCustomer);
router.patch('/:id', c.updateCustomer);

module.exports = router;
