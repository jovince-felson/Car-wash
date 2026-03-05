const router = require('express').Router();
const c = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Inventory
 * /inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: Get all inventory items
 *     responses:
 *       200:
 *         description: List of inventory items
 */
router.get('/', c.getInventory);
router.post('/', authorize('admin'), c.createItem);
router.patch('/:id', authorize('admin'), c.updateItem);
router.post('/:id/restock', authorize('admin', 'staff'), c.restock);
router.delete('/:id', authorize('admin'), c.deleteItem);

module.exports = router;
