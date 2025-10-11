import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Logo from '../assets/logo.png';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const { getCartCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';

    switch (user.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'marketing':
        return '/marketing/dashboard';
      case 'operasional':
        return '/operasional/dashboard';
      case 'dapur':
        return '/dapur/dashboard';
      case 'kurir':
        return '/kurir/dashboard';
      case 'pembeli':
        return '/pembeli/dashboard';
      default:
        return '/pembeli/dashboard';
    }
  };

  return (
    <nav className="bg-white shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between py-4">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img src={Logo} alt="logo" className="w-20 h-auto"/>                
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary-600 transition">Beranda</Link>
            <Link to="/products" className="text-gray-700 hover:text-primary-600 transition">Produk</Link>
            <Link to="/about" className="text-gray-700 hover:text-primary-600 transition">Tentang</Link>

            {isAuthenticated ? (
              <>
                {user.role === 'pembeli' && (
                  <Link to="/pembeli/cart" className="relative">
                    <svg className="w-6 h-6 text-gray-700 hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {getCartCount() > 0 && (
                      <span className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {getCartCount()}
                      </span>
                    )}
                  </Link>
                )}
                <Link to={getDashboardLink()} className="text-gray-700 hover:text-primary-600 transition">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
                >
                  Keluar
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-primary-600 transition">
                  Masuk
                </Link>
                <Link to="/register" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                  Daftar
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/" className="block px-3 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded">
              Beranda
            </Link>
            <Link to="/products" className="block px-3 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded">
              Produk
            </Link>
            <Link to="/about" className="block px-3 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded">
              Tentang
            </Link>

            {isAuthenticated ? (
              <>
                {user.role === 'pembeli' && (
                  <Link to="/pembeli/cart" className="block px-3 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded">
                    Keranjang ({getCartCount()})
                  </Link>
                )}
                <Link to={getDashboardLink()} className="block px-3 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded"
                >
                  Keluar
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block px-3 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded">
                  Masuk
                </Link>
                <Link to="/register" className="block px-3 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded">
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
