const prisma = require('../config/prisma');
const redis = require('../config/redis');
const logger = require('./logger');

const CACHE_KEY = 'category:tree';
const CACHE_TTL_SECONDS = 600; // 10 minutes

/**
 * Build a nested category tree (adjacency list -> tree) from flat rows.
 */
function buildTree(categories) {
  const byId = new Map(categories.map((c) => [c.id, { ...c, children: [] }]));
  const roots = [];

  for (const cat of byId.values()) {
    if (cat.parentId && byId.has(cat.parentId)) {
      byId.get(cat.parentId).children.push(cat);
    } else {
      roots.push(cat);
    }
  }
  return roots;
}

/**
 * Fetch the full category tree, using Redis as a cache in front of Postgres.
 * Cached because the tree is read far more often than it changes.
 */
async function getCategoryTree() {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.error(`Redis read failed, falling back to DB: ${err.message}`);
  }

  const categories = await prisma.category.findMany();
  const tree = buildTree(categories);

  try {
    await redis.set(CACHE_KEY, JSON.stringify(tree), 'EX', CACHE_TTL_SECONDS);
  } catch (err) {
    logger.error(`Redis write failed: ${err.message}`);
  }

  return tree;
}

/** Invalidate the cached tree - call after any category create/update/delete. */
async function invalidateCategoryTreeCache() {
  await redis.del(CACHE_KEY);
}

/**
 * DFS traversal starting at `categoryId`, collecting every category id in
 * the subtree (the category itself + all descendants). Used to fetch
 * "related products" across an entire category branch efficiently.
 */
function dfsCollectIds(tree, categoryId) {
  // Find the starting node anywhere in the tree first
  function findNode(nodes, id) {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNode(node.children, id);
      if (found) return found;
    }
    return null;
  }

  const startNode = findNode(tree, categoryId);
  if (!startNode) return [];

  const collected = [];
  const stack = [startNode];

  // Classic iterative DFS (stack-based, avoids recursion depth issues on deep trees)
  while (stack.length > 0) {
    const node = stack.pop();
    collected.push(node.id);
    for (const child of node.children) {
      stack.push(child);
    }
  }

  return collected;
}

/**
 * Get recommended/related products for a given category: DFS through the
 * cached category subtree, then query products in any of those categories.
 */
async function getRelatedProducts(categoryId, { excludeProductId, limit = 10 } = {}) {
  const tree = await getCategoryTree();
  const categoryIds = dfsCollectIds(tree, categoryId);

  if (categoryIds.length === 0) return [];

  const where = {
    categoryId: { in: categoryIds },
    status: 'active',
    ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
  };

  return prisma.product.findMany({ where, take: limit });
}

module.exports = { getCategoryTree, invalidateCategoryTreeCache, dfsCollectIds, getRelatedProducts, buildTree };
