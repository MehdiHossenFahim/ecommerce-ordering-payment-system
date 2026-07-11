const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const productController = require('../controllers/product.controller');

const router = express.Router();

router.get('/', productController.list);
router.get('/:id', productController.getOne);
router.get('/:id/related', productController.related);

const productValidation = [
  body('name').notEmpty(),
  body('sku').notEmpty(),
  body('price').isFloat({ gt: 0 }),
  body('stock').isInt({ min: 0 }),
];

router.post('/', authenticate, requireAdmin, productValidation, validate, productController.create);
router.put('/:id', authenticate, requireAdmin, productController.update);
router.delete('/:id', authenticate, requireAdmin, productController.remove);

module.exports = router;
