const Stripe = require('stripe');
const PaymentStrategy = require('./PaymentStrategy');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

class StripeStrategy extends PaymentStrategy {
  get providerName() {
    return 'stripe';
  }

  async initiate({ order }) {
    // Stripe expects the smallest currency unit (cents)
    const amountInCents = Math.round(Number(order.totalAmount) * 100);

    const intent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: { orderId: order.id },
      automatic_payment_methods: { enabled: true },
    });

    return {
      transactionId: intent.id,
      clientSecret: intent.client_secret,
      raw: intent,
    };
  }

  async confirm({ transactionId, payload }) {
    // In practice confirmation happens client-side with Stripe.js using the client secret.
    // This method re-fetches the intent server-side to authoritatively check status,
    // optionally confirming with a provided payment_method for server-driven flows.
    let intent;
    if (payload?.payment_method) {
      intent = await stripe.paymentIntents.confirm(transactionId, {
        payment_method: payload.payment_method,
      });
    } else {
      intent = await stripe.paymentIntents.retrieve(transactionId);
    }

    return { status: this._mapStatus(intent.status), raw: intent };
  }

  async query({ transactionId }) {
    const intent = await stripe.paymentIntents.retrieve(transactionId);
    return { status: this._mapStatus(intent.status), raw: intent };
  }

  // Verifies and parses an incoming Stripe webhook event
  static constructWebhookEvent(rawBody, signature) {
    return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  }

  _mapStatus(stripeStatus) {
    if (stripeStatus === 'succeeded') return 'success';
    if (['canceled', 'requires_payment_method'].includes(stripeStatus) === false && stripeStatus.startsWith('requires_')) {
      return 'pending';
    }
    if (stripeStatus === 'canceled') return 'failed';
    return 'pending';
  }
}

module.exports = StripeStrategy;
