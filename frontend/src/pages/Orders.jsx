import { useEffect, useState } from 'react';
import api from '../api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/auth/orders')
      .then((res) => setOrders(res.data.orders))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container">Loading orders...</div>;

  return (
    <div className="container">
      <h2>My Orders</h2>
      {error && <p className="error">{error}</p>}
      {orders.length === 0 && <p>You have no orders yet.</p>}
      {orders.map((order) => (
        <div className="card" key={order.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>Order #{order.id.slice(0, 8)}</strong>
            <span className={`badge ${order.status}`}>{order.status}</span>
          </div>
          <p>Total: <span className="price">${Number(order.totalAmount).toFixed(2)}</span></p>
          <ul>
            {order.items.map((item) => (
              <li key={item.id}>
                {item.product?.name || item.productId} x{item.quantity} — ${Number(item.subtotal).toFixed(2)}
              </li>
            ))}
          </ul>
          {order.payments?.length > 0 && (
            <p style={{ fontSize: '0.8rem', color: '#555' }}>
              Payment: {order.payments[order.payments.length - 1].provider} —{' '}
              {order.payments[order.payments.length - 1].status}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
