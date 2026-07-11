const paymentService = require('../services/paymentService');
const orderService = require('../services/orderService');
const StripeStrategy = require('../payments/StripeStrategy');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/** POST /api/payments/checkout - user picks a provider and initiates payment for their order */
async function checkout(req, res, next) {
  try {
    const { orderId, provider } = req.body;
    const order = await orderService.getOrderById(orderId, req.user.id);

    if (order.status !== 'pending') {
      throw new AppError(`Order is already ${order.status}`, 409);
    }

    const result = await paymentService.initiatePayment(order, provider);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/** POST /api/payments/:transactionId/confirm - explicit confirm/execute step (used by bKash flow, or manual Stripe confirm) */
async function confirm(req, res, next) {
  try {
    const { transactionId } = req.params;
    const result = await paymentService.confirmPayment(transactionId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** GET /api/payments/:transactionId - query live status from provider */
async function query(req, res, next) {
  try {
    const { transactionId } = req.params;
    const result = await paymentService.queryPayment(transactionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** POST /api/payments/stripe/webhook - Stripe server-to-server payment update */
async function stripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = StripeStrategy.constructWebhookEvent(req.body, signature);
  } catch (err) {
    logger.error(`Stripe webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      await paymentService.queryPayment(intent.id); // re-fetches authoritative status and applies it
    }
    res.json({ received: true });
  } catch (err) {
    logger.error(`Stripe webhook handling error: ${err.message}`);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
}

/** GET/POST /api/payments/bkash/callback - bKash redirects here after user completes/cancels checkout */
async function bkashCallback(req, res) {
  try {
    const { paymentID, status } = req.query;

    if (status === 'success' && paymentID) {
      await paymentService.confirmPayment(paymentID, {});
    } else if (paymentID) {
      await paymentService.queryPayment(paymentID);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/orders?payment=${status}`);
  } catch (err) {
    logger.error(`bKash callback handling error: ${err.message}`);
    res.status(500).json({ error: 'Callback handling failed' });
  }
}

module.exports = { checkout, confirm, query, stripeWebhook, bkashCallback };
