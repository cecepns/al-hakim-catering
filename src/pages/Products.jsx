import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { productAPI } from '../utils/api';
import { getImageUrl } from '../utils/imageHelper';
import { formatRupiah } from '../utils/formatHelper';
import { useAuth } from '../context/AuthContext';

const Products = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get('category') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState(0);
  const debounceTimer = useRef(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'all') {
        params.category = filter;
      }
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      const response = await productAPI.getAll(params);
      
      // Fetch images for each product and use first image if available
      const productsWithImages = await Promise.all(
        response.data.map(async (product) => {
          try {
            const imagesRes = await productAPI.getImages(product.id);
            const images = imagesRes.data || [];
            // Use first image if available, otherwise use product.image_url
            const displayImage = images.length > 0 ? images[0].media_url : product.image_url;
            return { ...product, image_url: displayImage };
          } catch {
            // If images fetch fails, keep the original image_url
            return product;
          }
        })
      );
      
      setProducts(productsWithImages);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    fetchProducts();
    if (user?.role === 'marketing' && user?.commission_percentage) {
      setCommissionPercentage(parseFloat(user.commission_percentage) || 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedSearch, user]);

  const handleBuyNow = (product) => {
    // Navigate directly to checkout with product data - no login required
    if (product.stock === 0) {
      toast.error('Stok produk habis');
      return;
    }
    navigate(`/checkout?product_id=${product.id}&quantity=1`);
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

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block max-w-fit w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-600 focus:border-primary-600 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
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
            <p className="text-gray-600">
              {debouncedSearch.trim()
                ? `Tidak ada produk ditemukan untuk "${debouncedSearch}"`
                : 'Tidak ada produk tersedia'}
            </p>
            {debouncedSearch.trim() && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedSearch('');
                }}
                className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Hapus pencarian
              </button>
            )}
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
                      <p className="text-xs text-gray-500 mb-1">Harga Mulai</p>
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
                      {user?.role === 'marketing' && commissionPercentage > 0 && (
                        <div className="mt-1">
                          <p className="text-xs text-gray-500">Komisi Anda</p>
                          <span className="text-green-600 font-semibold text-sm">
                            Rp {formatRupiah(((product.discounted_price || product.price) * commissionPercentage) / 100)}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">
                            ({commissionPercentage}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      to={`/products/${product.id}`}
                      className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-center text-sm font-medium"
                    >
                      Lihat Detail Produk
                    </Link>
                    {/* <button
                      onClick={() => handleBuyNow(product)}
                      disabled={product.stock === 0}
                      className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium disabled:bg-gray-400"
                    >
                      {product.stock === 0 ? 'Stok Habis' : 'Beli'}
                    </button> */}
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
