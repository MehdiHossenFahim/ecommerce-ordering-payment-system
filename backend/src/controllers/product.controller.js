const productService = require('../services/productService');
const categoryService = require('../services/categoryService');

async function list(req, res, next) {
  try {
    const { page, pageSize, categoryId, status } = req.query;
    const result = await productService.listProducts({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      categoryId,
      status,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({ product: product.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function related(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product.categoryId) return res.json({ products: [] });
    const products = await categoryService.relatedProducts(product.categoryId, product.id);
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, related, create, update, remove };
