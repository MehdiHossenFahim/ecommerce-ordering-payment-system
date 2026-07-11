export default function ProductCard({ product, onAddToCart }) {
  return (
    <div className="card">
      <h3>{product.name}</h3>
      <p style={{ fontSize: '0.85rem', color: '#555' }}>{product.description}</p>
      <p className="price">${Number(product.price).toFixed(2)}</p>
      <p style={{ fontSize: '0.8rem' }}>Stock: {product.stock}</p>
      <button className="primary" disabled={product.stock <= 0} onClick={() => onAddToCart(product)}>
        {product.stock <= 0 ? 'Out of stock' : 'Add to cart'}
      </button>
    </div>
  );
}
