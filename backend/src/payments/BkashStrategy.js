const axios = require('axios');
const PaymentStrategy = require('./PaymentStrategy');
const redis = require('../config/redis');

const BKASH_TOKEN_CACHE_KEY = 'bkash:id_token';

class BkashStrategy extends PaymentStrategy {
  constructor() {
    super();
    this.client = axios.create({
      baseURL: process.env.BKASH_BASE_URL,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  get providerName() {
    return 'bkash';
  }

  // bKash tokenized checkout requires a grant token before any API call.
  // Cache it in Redis (bKash tokens are valid ~1hr) to avoid re-auth on every request.
  async _getToken() {
    const cached = await redis.get(BKASH_TOKEN_CACHE_KEY);
    if (cached) return cached;

    const { data } = await this.client.post('/tokenized/checkout/token/grant', {
      app_key: process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
    }, {
      headers: {
        username: process.env.BKASH_USERNAME,
        password: process.env.BKASH_PASSWORD,
      },
    });

    const token = data.id_token;
    await redis.set(BKASH_TOKEN_CACHE_KEY, token, 'EX', 3300); // expire slightly under 1hr
    return token;
  }

  async _authHeaders() {
    const token = await this._getToken();
    return {
      Authorization: token,
      'X-APP-Key': process.env.BKASH_APP_KEY,
    };
  }

  async initiate({ order }) {
    const headers = await this._authHeaders();

    const { data } = await this.client.post(
      '/tokenized/checkout/create',
      {
        mode: '0011',
        payerReference: order.userId,
        callbackURL: process.env.BKASH_CALLBACK_URL,
        amount: Number(order.totalAmount).toFixed(2),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: order.id,
      },
      { headers }
    );

    return {
      transactionId: data.paymentID,
      redirectUrl: data.bkashURL,
      raw: data,
    };
  }

  async confirm({ transactionId }) {
    const headers = await this._authHeaders();
    const { data } = await this.client.post('/tokenized/checkout/execute', { paymentID: transactionId }, { headers });

    return { status: this._mapStatus(data.transactionStatus || data.statusCode), raw: data };
  }

  async query({ transactionId }) {
    const headers = await this._authHeaders();
    const { data } = await this.client.post('/tokenized/checkout/payment/status', { paymentID: transactionId }, { headers });

    return { status: this._mapStatus(data.transactionStatus || data.statusCode), raw: data };
  }

  _mapStatus(rawStatus) {
    if (!rawStatus) return 'pending';
    const s = String(rawStatus).toLowerCase();
    if (s === 'completed' || s === '0000') return 'success';
    if (s === 'failed' || s === 'cancelled') return 'failed';
    return 'pending';
  }
}

module.exports = BkashStrategy;
