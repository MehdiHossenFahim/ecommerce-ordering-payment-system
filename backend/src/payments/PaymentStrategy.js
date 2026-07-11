/**
 * Abstract base class for payment provider strategies.
 * Every concrete provider (Stripe, bKash, and any future provider) must
 * implement these three methods. PaymentContext depends only on this
 * interface, never on a concrete provider - so adding a new provider
 * never requires touching order/checkout logic.
 */
class PaymentStrategy {
  /**
   * Initiate a payment for the given order.
   * @param {{ order: object }} params
   * @returns {Promise<{ transactionId: string, redirectUrl?: string, clientSecret?: string, raw: object }>}
   */
  async initiate(/* { order } */) {
    throw new Error('initiate() must be implemented by subclass');
  }

  /**
   * Confirm/execute a previously initiated payment.
   * @param {{ transactionId: string, payload: object }} params
   * @returns {Promise<{ status: 'pending'|'success'|'failed', raw: object }>}
   */
  async confirm(/* { transactionId, payload } */) {
    throw new Error('confirm() must be implemented by subclass');
  }

  /**
   * Query the current status of a payment from the provider.
   * @param {{ transactionId: string }} params
   * @returns {Promise<{ status: 'pending'|'success'|'failed', raw: object }>}
   */
  async query(/* { transactionId } */) {
    throw new Error('query() must be implemented by subclass');
  }

  get providerName() {
    throw new Error('providerName getter must be implemented by subclass');
  }
}

module.exports = PaymentStrategy;
