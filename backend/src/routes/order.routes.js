const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const orderController = require('../controllers/order.controller');

const router = express.Router();

router.post(
  '/',
  authenticate,
  [body('items').isArray({ min: 1 }), body('items.*.productId').notEmpty(), body('items.*.quantity').isInt({ min: 1 })],
  validate,
  orderController.create
);

router.get('/:id', authenticate, orderController.getOne);

module.exports = router;
