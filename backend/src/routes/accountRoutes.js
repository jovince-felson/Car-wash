const router = require('express').Router();
const c = require('../controllers/accountController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'accountant'));

/**
 * @swagger
 * tags:
 *   name: Accounts
 * /accounts/transactions:
 *   get:
 *     tags: [Accounts]
 *     summary: Get all transactions
 *     responses:
 *       200:
 *         description: List of transactions
 */
router.get('/transactions', c.getTransactions);
router.get('/expenses', c.getExpenses);
router.post('/expenses', c.createExpense);
router.delete('/expenses/:id', c.deleteExpense);

module.exports = router;
