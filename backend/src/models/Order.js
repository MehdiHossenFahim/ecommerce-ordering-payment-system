/**
 * Order domain class - deterministic algorithm for computing subtotals and totals.
 * Given the same items (product price + quantity), calculateTotals always
 * produces the same result - no randomness, no external state.
 */
class Order {
  constructor({ userId, items }) {
    this.userId = userId;
    // items: [{ productId, price, quantity }]
    this.items = items;
  }

  /**
   * Deterministically compute subtotal per line item and the order total.
   * @returns {{ lineItems: Array, totalAmount: number }}
   */
  calculateTotals() {
    const lineItems = this.items.map((item) => {
      const subtotal = Number((item.price * item.quantity).toFixed(2));
      return { ...item, subtotal };
    });

    const totalAmount = Number(lineItems.reduce((sum, li) => sum + li.subtotal, 0).toFixed(2));

    return { lineItems, totalAmount };
  }
}

module.exports = Order;
