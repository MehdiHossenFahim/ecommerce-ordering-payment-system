const { AppError } = require('../middleware/errorHandler');

/**
 * Product domain class - encapsulates stock and availability rules
 * so this logic lives in one testable place instead of scattered across routes.
 */
class Product {
  constructor(prismaProduct) {
    this.id = prismaProduct.id;
    this.name = prismaProduct.name;
    this.sku = prismaProduct.sku;
    this.description = prismaProduct.description;
    this.price = Number(prismaProduct.price);
    this.stock = prismaProduct.stock;
    this.status = prismaProduct.status;
    this.categoryId = prismaProduct.categoryId;
  }

  isAvailable(quantity = 1) {
    return this.status === 'active' && this.stock >= quantity;
  }

  assertCanFulfill(quantity) {
    if (!this.isAvailable(quantity)) {
      throw new AppError(`Product "${this.name}" does not have enough stock (requested ${quantity}, available ${this.stock})`, 409);
    }
  }

  lineTotal(quantity) {
    return Number((this.price * quantity).toFixed(2));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      sku: this.sku,
      description: this.description,
      price: this.price,
      stock: this.stock,
      status: this.status,
      categoryId: this.categoryId,
    };
  }
}

module.exports = Product;
