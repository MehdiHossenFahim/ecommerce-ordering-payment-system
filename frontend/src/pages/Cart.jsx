import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function Cart() {
  const { items, removeItem, updateQuantity, total } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container">
        <h2>Your cart is empty</h2>
        <button className="primary" onClick={() => navigate('/')}>Browse products</button>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Your Cart</h2>
      {items.map((item) => (
        <div className="card" key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{item.name}</strong>
            <p className="price">${item.price.toFixed(2)} each</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              min={1}
              value={item.quantity}
              style={{ width: 70, margin: 0 }}
              onChange={(e) => updateQuantity(item.productId, Math.max(1, Number(e.target.value)))}
            />
            <button onClick={() => removeItem(item.productId)}>Remove</button>
          </div>
        </div>
      ))}
      <div className="card">
        <h3>Total: ${total.toFixed(2)}</h3>
        <button className="primary" onClick={() => navigate('/checkout')}>Proceed to checkout</button>
      </div>
    </div>
  );
}
