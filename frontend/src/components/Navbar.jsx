import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div>
        <Link to="/" className="brand">ShopEasy</Link>
      </div>
      <div>
        <Link to="/">Products</Link>
        {user && <Link to="/cart">Cart ({items.length})</Link>}
        {user && <Link to="/orders">My Orders</Link>}
        {user ? (
          <>
            <span style={{ marginRight: 12 }}>Hi, {user.name}</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
