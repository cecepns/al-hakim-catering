import { useEffect, useState } from 'react';
import { productAPI } from '../../utils/api';
import { getImageUrl } from '../../utils/imageHelper';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const MarketingPricing = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [margins, setMargins] = useState({});

  useEffect(() => {
    fetchProducts();
    loadMargins();
  }, [filter]);

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

  const loadMargins = () => {
    const saved = localStorage.getItem('marketing_margins');
    if (saved) {
      setMargins(JSON.parse(saved));
    }
  };

  const handleMarginChange = (productId, value) => {
    const newMargins = { ...margins, [productId]: value };
    setMargins(newMargins);
    localStorage.setItem('marketing_margins', JSON.stringify(newMargins));
  };

  const calculateSellingPrice = (product) => {
    const basePrice = product.discounted_price || product.price;
    const margin = parseInt(margins[product.id] || 0);
    return basePrice + margin;
  };

  const calculateCommission = (product) => {
    return parseInt(margins[product.id] || 0);
  };

  const categories = [
    { value: 'all', label: 'Semua' },
    { value: 'catering', label: 'Catering' },
    { value: 'aqiqah', label: 'Aqiqah' },
    { value: 'event', label: 'Event' },
    { value: 'store', label: 'Store' },
  ];

  return (
    <DashboardLayout role="marketing">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Atur Harga Jual</h1>
          <p className="text-gray-600 mt-1">
            Tentukan margin keuntungan Anda untuk setiap produk
          </p>
        </div>

        <div className="bg-primary-50 border-l-4 border-primary-500 p-4 rounded-lg mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-primary-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-primary-800">Cara Kerja:</h3>
              <p className="mt-1 text-sm text-primary-700">
                Tambahkan margin keuntungan di atas harga dasar produk. Margin yang Anda tambahkan akan menjadi komisi Anda saat produk terjual.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setFilter(cat.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === cat.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Tidak ada produk tersedia</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Produk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Harga Dasar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Margin Anda
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Harga Jual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Komisi Anda
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={getImageUrl(product.image_url)}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500">{product.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          Rp {formatRupiah(product.discounted_price || product.price)}
                        </div>
                        {product.discount_percentage > 0 && (
                          <div className="text-xs text-gray-400 line-through">
                            Rp {formatRupiah(product.price)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={margins[product.id] || ''}
                          onChange={(e) => handleMarginChange(product.id, e.target.value)}
                          placeholder="0"
                          min="0"
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-primary-600">
                          Rp {formatRupiah(calculateSellingPrice(product))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-600">
                          Rp {formatRupiah(calculateCommission(product))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Tips Sukses:</h3>
              <ul className="mt-1 text-sm text-green-700 list-disc list-inside space-y-1">
                <li>Sesuaikan margin dengan kondisi pasar lokal Anda</li>
                <li>Margin terlalu tinggi bisa mengurangi daya saing</li>
                <li>Cek harga kompetitor sebelum menentukan margin</li>
                <li>Margin ini akan otomatis menjadi komisi Anda saat produk terjual</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MarketingPricing;

