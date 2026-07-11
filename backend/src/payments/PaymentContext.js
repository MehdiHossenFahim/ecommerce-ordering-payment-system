const StripeStrategy = require('./StripeStrategy');
const BkashStrategy = require('./BkashStrategy');
const { AppError } = require('../middleware/errorHandler');

/**
 * PaymentContext - the "Context" in the Strategy pattern.
 * Order/checkout code depends only on this class, never on Stripe or bKash
 * directly. Adding a new provider = writing a new *Strategy class and
 * registering it here; no other code changes.
 */
const STRATEGIES = {
  stripe: () => new StripeStrategy(),
  bkash: () => new BkashStrategy(),
};

class PaymentContext {
  constructor(providerName) {
    const factory = STRATEGIES[providerName];
    if (!factory) {
      throw new AppError(`Unsupported payment provider: ${providerName}`, 400);
    }
    this.strategy = factory();
  }

  static supportedProviders() {
    return Object.keys(STRATEGIES);
  }

  initiate(params) {
    return this.strategy.initiate(params);
  }

  confirm(params) {
    return this.strategy.confirm(params);
  }

  query(params) {
    return this.strategy.query(params);
  }
}

module.exports = PaymentContext;
