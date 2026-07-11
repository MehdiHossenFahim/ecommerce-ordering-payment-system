const categoryService = require('../services/categoryService');

async function tree(req, res, next) {
  try {
    const categories = await categoryService.listTree();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

module.exports = { tree, create };
