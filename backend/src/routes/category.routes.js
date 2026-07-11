const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

router.get('/', categoryController.tree);
router.post('/', authenticate, requireAdmin, [body('name').notEmpty()], validate, categoryController.create);

module.exports = router;
