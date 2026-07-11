const prisma = require('../config/prisma');
const { getCategoryTree, invalidateCategoryTreeCache, getRelatedProducts } = require('../utils/dfs');

async function listTree() {
  return getCategoryTree();
}

async function createCategory({ name, parentId }) {
  const created = await prisma.category.create({ data: { name, parentId: parentId || null } });
  await invalidateCategoryTreeCache();
  return created;
}

async function relatedProducts(categoryId, productId) {
  return getRelatedProducts(categoryId, { excludeProductId: productId, limit: 10 });
}

module.exports = { listTree, createCategory, relatedProducts };
