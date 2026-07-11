const prisma = require('../config/prisma');
const OrderModel = require('../models/Order');
const { AppError } = require('../middleware/errorHandler');
const productService = require('./productService');

/**
 * Create an order in `pending` status. Stock is only decremented later,
 * after a successful payment (see markOrderPaid) - this avoids reserving
 * stock for abandoned/failed checkouts.
 */
async function createOrder(userId, items) {
  if (!items || items.length === 0) {
    throw new AppError('Order must contain at least one item', 400);
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  const priceById = new Map(products.map((p) => [p.id, Number(p.price)]));

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new AppError(`Product ${item.productId} not found`, 404);
    if (product.status !== 'active') throw new AppError(`Product "${product.name}" is not available`, 409);
    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for "${product.name}"`, 409);
    }
  }

  const orderModel = new OrderModel({
    userId,
    items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: priceById.get(i.productId) })),
  });
  const { lineItems, totalAmount } = orderModel.calculateTotals();

  const order = await prisma.order.create({
    data: {
      userId,
      totalAmount,
      status: 'pending',
      items: {
        create: lineItems.map((li) => ({
          productId: li.productId,
          quantity: li.quantity,
          price: li.price,
          subtotal: li.subtotal,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  return order;
}

async function getOrderById(orderId, userId = null) {
  const where = userId ? { id: orderId, userId } : { id: orderId };
  const order = await prisma.order.findFirst({
    where,
    include: { items: { include: { product: true } }, payments: true },
  });
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

/**
 * Transactionally mark an order as paid and reduce stock for each line item.
 * Wrapped in a DB transaction so a partial failure never leaves stock
 * decremented without the order being marked paid, or vice versa.
 */
async function markOrderPaid(orderId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new AppError('Order not found', 404);
    if (order.status === 'paid') return order; // idempotent

    for (const item of order.items) {
      await productService.reduceStock(item.productId, item.quantity, tx);
    }

    return tx.order.update({ where: { id: orderId }, data: { status: 'paid' } });
  });
}

async function markOrderCanceled(orderId) {
  return prisma.order.update({ where: { id: orderId }, data: { status: 'canceled' } });
}

module.exports = { createOrder, getOrderById, markOrderPaid, markOrderCanceled };
