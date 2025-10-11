import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { productAPI } from '../utils/api';
import { getImageUrl } from '../utils/imageHelper';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/formatHelper';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productAPI.getById(id);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleAddToCart = async () => {
    // Cek apakah user sudah login dan rolenya pembeli
    if (!user) {
      toast.warning('Silakan login terlebih dahulu untuk menambahkan produk ke keranjang', {
        position: 'top-center',
        autoClose: 2000,
      });
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }

    if (user.role !== 'pembeli') {
      toast.error('Hanya pembeli yang dapat menambahkan produk ke keranjang');
      return;
    }

    try {
      await addToCart({ product_id: product.id, quantity });
      toast.success('Produk berhasil ditambahkan ke keranjang!');
      setTimeout(() => {
        navigate('/pembeli/cart');
      }, 1000);
    } catch (err) {
      console.error('Error adding to cart:', err);
      toast.error('Gagal menambahkan produk ke keranjang');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Produk tidak ditemukan</p>
          <button
            onClick={() => navigate('/products')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Kembali ke Produk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/products')}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center"
        >
          ← Kembali
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            <div>
              <img
                src={getImageUrl(product.image_url)}
                alt={product.name}
                className="w-full rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-primary-600 uppercase">
                  {product.category}
                </span>
                {product.is_promo && product.discount_percentage > 0 && (
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    Diskon {product.discount_percentage}%
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

              <div className="mb-6">
                {product.discount_percentage > 0 ? (
                  <>
                    <span className="text-gray-400 line-through text-lg block mb-2">
                      Rp {formatRupiah(product.price)}
                    </span>
                    <span className="text-primary-600 font-bold text-4xl">
                      Rp {formatRupiah(product.discounted_price)}
                    </span>
                  </>
                ) : (
                  <span className="text-primary-600 font-bold text-4xl">
                    Rp {formatRupiah(product.price)}
                  </span>
                )}
              </div>

              <div className="mb-6 pb-6 border-b">
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Stok: {product.stock}</p>
                <p className="text-sm text-gray-600">Terjual: {product.sold_count || 0} unit</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max={product.stock}
                    className="w-20 text-center border border-gray-300 rounded-lg px-4 py-2"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition font-semibold disabled:bg-gray-400"
              >
                {product.stock === 0 ? 'Stok Habis' : 'Tambah ke Keranjang'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
