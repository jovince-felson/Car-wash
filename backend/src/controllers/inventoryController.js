const Inventory = require('../models/Inventory');

// GET /api/inventory
exports.getInventory = async (req, res, next) => {
  try {
    const items = await Inventory.find().sort({ name: 1 });
    res.json({ success: true, items });
  } catch (err) { next(err); }
};

// POST /api/inventory
exports.createItem = async (req, res, next) => {
  try {
    const item = await Inventory.create(req.body);
    res.status(201).json({ success: true, item });
  } catch (err) { next(err); }
};

// PATCH /api/inventory/:id
exports.updateItem = async (req, res, next) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item });
  } catch (err) { next(err); }
};

// POST /api/inventory/:id/restock
exports.restock = async (req, res, next) => {
  try {
    const { qty } = req.body;
    if (!qty || qty <= 0) return res.status(400).json({ success: false, message: 'Invalid quantity' });
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    item.quantity += Number(qty);
    await item.save();

    const io = req.app.get('io');
    if (io) io.emit('inventory:restocked', { item: item.name, quantity: item.quantity });

    res.json({ success: true, item });
  } catch (err) { next(err); }
};

// DELETE /api/inventory/:id
exports.deleteItem = async (req, res, next) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) { next(err); }
};
