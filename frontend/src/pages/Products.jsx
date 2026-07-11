import { useEffect, useState } from 'react';
import api from '../api';
import ProductCard from '../components/ProductCard.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addItem } = useCart();

  useEffect(() => {
    api
      .get('/products')
      .then((res) => setProducts(res.data.items))
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container">Loading products...</div>;

  return (
    <div className="container">
      <h2>Products</h2>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onAddToCart={addItem} />
        ))}
      </div>
      {products.length === 0 && !error && <p>No products available yet. Run the seed script.</p>}
    </div>
  );
}
