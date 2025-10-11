import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { productAPI } from '../utils/api';
import { getImageUrl } from '../utils/imageHelper';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/formatHelper';

const Products = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get('category') || 'all');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { category: filter } : {};
      const response = await productAPI.getAll(params);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleAddToCart = async (product) => {
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
      await addToCart({ product_id: product.id, quantity: 1 });
      toast.success('Produk berhasil ditambahkan ke keranjang!', {
        position: 'top-right',
      });
    } catch {
      toast.error('Gagal menambahkan produk ke keranjang');
    }
  };

  const categories = [
    { value: 'all', label: 'Semua' },
    { value: 'catering', label: 'Catering' },
    { value: 'aqiqah', label: 'Aqiqah' },
    { value: 'event', label: 'Event' },
    { value: 'store', label: 'Store' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 mt-14">
          <h1 className="text-3xl font-bold text-gray-900">Produk Kami</h1>
          <p className="text-gray-600 mt-2">Pilih produk sesuai kebutuhan Anda</p>
        </div>

        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                filter === cat.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-600">Tidak ada produk tersedia</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition"
              >
                <div className="relative">
                  <img
                    src={getImageUrl(product.image_url)}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                  {product.is_promo && product.discount_percentage > 0 && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      -{product.discount_percentage}%
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary-600 uppercase">
                      {product.category}
                    </span>
                    <span className="text-xs text-gray-500">Stok: {product.stock}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      {product.discount_percentage > 0 ? (
                        <>
                          <span className="text-gray-400 line-through text-sm block">
                            Rp {formatRupiah(product.price)}
                          </span>
                          <span className="text-primary-600 font-bold text-xl">
                            Rp {formatRupiah(product.discounted_price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-primary-600 font-bold text-xl">
                          Rp {formatRupiah(product.price)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      to={`/products/${product.id}`}
                      className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-center text-sm font-medium"
                    >
                      Detail
                    </Link>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium disabled:bg-gray-400"
                    >
                      {product.stock === 0 ? 'Stok Habis' : 'Beli'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
