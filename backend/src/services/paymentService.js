const prisma = require('../config/prisma');
const PaymentContext = require('../payments/PaymentContext');
const { AppError } = require('../middleware/errorHandler');
const orderService = require('./orderService');

/** Initiate a payment for an order using the chosen provider (Stripe or bKash). */
async function initiatePayment(order, providerName) {
  const context = new PaymentContext(providerName);
  const result = await context.initiate({ order });

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: providerName,
      transactionId: result.transactionId,
      status: 'pending',
      rawResponse: result.raw,
    },
  });

  return { payment, ...result };
}

/** Confirm/execute a previously initiated payment and update order status accordingly. */
async function confirmPayment(transactionId, payload = {}) {
  const payment = await prisma.payment.findUnique({ where: { transactionId } });
  if (!payment) throw new AppError('Payment not found', 404);

  const context = new PaymentContext(payment.provider);
  const result = await context.confirm({ transactionId, payload });

  await applyPaymentResult(payment, result);
  return { payment, result };
}

/** Query a payment's live status from the provider (used for polling/reconciliation). */
async function queryPayment(transactionId) {
  const payment = await prisma.payment.findUnique({ where: { transactionId } });
  if (!payment) throw new AppError('Payment not found', 404);

  const context = new PaymentContext(payment.provider);
  const result = await context.query({ transactionId });

  await applyPaymentResult(payment, result);
  return { payment, result };
}

/** Shared logic: persist provider status, and cascade to order status/stock on success. */
async function applyPaymentResult(payment, result) {
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: result.status, rawResponse: result.raw },
  });

  if (result.status === 'success') {
    await orderService.markOrderPaid(payment.orderId);
  } else if (result.status === 'failed') {
    await orderService.markOrderCanceled(payment.orderId);
  }
}

module.exports = { initiatePayment, confirmPayment, queryPayment, applyPaymentResult };
