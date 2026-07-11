import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext.jsx';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const [provider, setProvider] = useState('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    setError('');
    setLoading(true);
    try {
      // 1. Create the order from cart items
      const orderRes = await api.post('/orders', {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      const order = orderRes.data.order;

      // 2. Initiate payment with the selected provider (Strategy pattern on the backend)
      const payRes = await api.post('/payments/checkout', { orderId: order.id, provider });
      setPaymentResult(payRes.data);

      if (provider === 'bkash' && payRes.data.redirectUrl) {
        clearCart();
        window.location.href = payRes.data.redirectUrl; // hand off to bKash hosted checkout
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !paymentResult) {
    return <div className="container"><p>Your cart is empty.</p></div>;
  }

  return (
    <div className="container" style={{ maxWidth: 500 }}>
      <h2>Checkout</h2>
      {!paymentResult && (
        <div className="card">
          <h3>Order total: ${total.toFixed(2)}</h3>
          <label>Payment provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="stripe">Stripe (card)</option>
            <option value="bkash">bKash</option>
          </select>
          {error && <p className="error">{error}</p>}
          <button className="primary" onClick={handleCheckout} disabled={loading}>
            {loading ? 'Processing...' : `Pay with ${provider}`}
          </button>
        </div>
      )}

      {paymentResult && provider === 'stripe' && (
        <div className="card">
          <h3>Stripe payment created</h3>
          <p>Transaction ID: {paymentResult.transactionId}</p>
          <p style={{ fontSize: '0.85rem', color: '#555' }}>
            In a full integration, this client secret is passed to Stripe.js/Elements on the
            frontend to collect card details and confirm the PaymentIntent. Once confirmed,
            Stripe's webhook (or the confirm endpoint) marks the order paid automatically.
          </p>
          <button className="primary" onClick={() => { clearCart(); navigate('/orders'); }}>
            Go to My Orders
          </button>
        </div>
      )}
    </div>
  );
}
