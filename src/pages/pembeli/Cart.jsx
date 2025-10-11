import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCart } from '../../context/CartContext';
import { getImageUrl } from '../../utils/imageHelper';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, fetchCart, updateCart, removeFromCart, getCartTotal, loading } = useCart();

  useEffect(() => {
    fetchCart();
  }, []);

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await updateCart(itemId, { quantity: newQuantity });
      toast.success('Jumlah produk berhasil diupdate');
    } catch (error) {
      toast.error('Gagal update keranjang');
    }
  };

  const handleRemove = async (itemId) => {
    if (window.confirm('Hapus item dari keranjang?')) {
      try {
        await removeFromCart(itemId);
        toast.success('Item berhasil dihapus dari keranjang');
      } catch (error) {
        toast.error('Gagal menghapus item');
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="pembeli">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="pembeli">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Keranjang Belanja</h1>

        {cart.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-600 mb-4">Keranjang Anda masih kosong</p>
            <Link to="/products" className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center space-x-4">
                    <img src={getImageUrl(item.image_url)} alt={item.name} className="w-24 h-24 object-cover rounded-lg" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {item.variant_name && (
                        <p className="text-sm text-gray-600">Varian: {item.variant_name}</p>
                      )}
                      <p className="text-lg font-bold text-primary-600 mt-2">
                        Rp {formatRupiah((item.discounted_price || item.price) * item.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button onClick={() => handleQuantityChange(item.id, item.quantity - 1)} className="w-8 h-8 border rounded-lg hover:bg-gray-50">-</button>
                      <span className="w-12 text-center font-semibold">{item.quantity}</span>
                      <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)} className="w-8 h-8 border rounded-lg hover:bg-gray-50">+</button>
                    </div>
                    <button onClick={() => handleRemove(item.id)} className="text-red-600 hover:text-red-900">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 h-fit sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Belanja</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Item:</span>
                  <span className="font-semibold">{cart.length}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t">
                  <span>Total:</span>
                  <span className="text-primary-600">Rp {formatRupiah(getCartTotal())}</span>
                </div>
              </div>
              <button onClick={() => navigate('/pembeli/checkout')} className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold">
                Lanjut ke Checkout
              </button>
              <Link to="/products" className="block text-center text-primary-600 hover:text-primary-700 mt-4">
                Lanjut Belanja
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Cart;
