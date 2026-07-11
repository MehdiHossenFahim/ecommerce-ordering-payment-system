const orderService = require('../services/orderService');

async function create(req, res, next) {
  try {
    const { items } = req.body; // [{ productId, quantity }]
    const order = await orderService.createOrder(req.user.id, items);
    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    // Admins can view any order; regular users only their own
    const userId = req.user.role === 'ADMIN' ? null : req.user.id;
    const order = await orderService.getOrderById(req.params.id, userId);
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getOne };
