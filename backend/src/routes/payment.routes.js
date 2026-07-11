const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

router.post(
  '/checkout',
  authenticate,
  [body('orderId').notEmpty(), body('provider').isIn(['stripe', 'bkash'])],
  validate,
  paymentController.checkout
);

router.post('/:transactionId/confirm', authenticate, paymentController.confirm);
router.get('/:transactionId', authenticate, paymentController.query);

// Note: Stripe webhook is registered directly in app.js (needs raw body for signature
// verification, before express.json() runs) - not duplicated here.
// Webhook/callback below are unauthenticated (verified via provider signature / callback params instead)
router.get('/bkash/callback', paymentController.bkashCallback);
router.post('/bkash/callback', paymentController.bkashCallback);

module.exports = router;
