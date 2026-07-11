const prisma = require('../config/prisma');
const ProductModel = require('../models/Product');
const { AppError } = require('../middleware/errorHandler');
const { invalidateCategoryTreeCache } = require('../utils/dfs');

async function listProducts({ page = 1, pageSize = 20, categoryId, status = 'active' } = {}) {
  const skip = (page - 1) * pageSize;
  const where = { ...(status ? { status } : {}), ...(categoryId ? { categoryId } : {}) };

  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
    prisma.product.count({ where }),
  ]);

  return { items: items.map((p) => new ProductModel(p).toJSON()), total, page, pageSize };
}

async function getProductById(id) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404);
  return new ProductModel(product);
}

async function createProduct(data) {
  const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existing) throw new AppError('SKU already exists', 409);

  const created = await prisma.product.create({ data });
  if (data.categoryId) await invalidateCategoryTreeCache();
  return new ProductModel(created).toJSON();
}

async function updateProduct(id, data) {
  await getProductById(id); // 404 if missing
  const updated = await prisma.product.update({ where: { id }, data });
  if (data.categoryId) await invalidateCategoryTreeCache();
  return new ProductModel(updated).toJSON();
}

async function deleteProduct(id) {
  await getProductById(id);
  await prisma.product.delete({ where: { id } });
  return { success: true };
}

/**
 * Deterministic, race-safe stock reduction executed after successful payment.
 * Uses a conditional update (stock >= quantity) so concurrent requests can
 * never oversell - the update simply affects 0 rows if stock is insufficient.
 */
async function reduceStock(productId, quantity, tx = prisma) {
  const result = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });

  if (result.count === 0) {
    throw new AppError(`Insufficient stock for product ${productId}`, 409);
  }
}

module.exports = { listProducts, getProductById, createProduct, updateProduct, deleteProduct, reduceStock };
