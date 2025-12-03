import { useEffect, useState } from 'react';
import { productAPI } from '../../utils/api';
import { getImageUrl } from '../../utils/imageHelper';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const MarketingPricing = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { category: filter } : {};
      const response = await productAPI.getAll(params);

      // Fetch images & variations untuk setiap produk.
      // Variasi dipakai untuk hitung estimasi komisi "hingga Rp X"
      // berdasarkan harga varian tertinggi.
      const productsWithExtras = await Promise.all(
        response.data.map(async (product) => {
          // Ambil gambar & variasi secara terpisah supaya kalau salah satu error,
          // data lainnya tetap bisa dipakai (khususnya variasi untuk komisi).
          let images = [];
          let variations = [];

          try {
            const imagesRes = await productAPI.getImages(product.id);
            images = imagesRes.data || [];
          } catch {
            images = [];
          }

          try {
            const variationsRes = await productAPI.getVariations(product.id);
            variations = variationsRes.data || [];
          } catch {
            variations = [];
          }

          // Gambar: pakai gambar pertama jika ada
          const displayImage =
            images.length > 0 ? images[0].media_url : product.image_url;

          // Hitung harga varian tertinggi.
          // Di produk detail, price_adjustment dipakai sebagai HARGA PENUH varian,
          // jadi di sini kita ambil MAX(price_adjustment) sebagai harga varian tertinggi.
          const parsedVariantPrices =
            variations.length > 0
              ? variations
                  .map((v) => parseFloat(v.price_adjustment))
                  .filter((v) => Number.isFinite(v) && v > 0)
              : [];

          const discountPercent =
            product.discount_percentage != null
              ? parseFloat(product.discount_percentage)
              : 0;

          let highestBasePrice;
          if (parsedVariantPrices.length > 0) {
            highestBasePrice = Math.max(...parsedVariantPrices);
          } else {
            // Tidak ada variasi: pakai harga produk (discounted_price kalau ada)
            highestBasePrice = product.discounted_price || product.price || 0;
          }

          const highestPriceNumber = Number(highestBasePrice) || 0;
          const effectiveHighestPrice =
            discountPercent > 0
              ? highestPriceNumber * (1 - discountPercent / 100)
              : highestPriceNumber;

          const commissionPercentage =
            product.commission_percentage != null
              ? parseFloat(product.commission_percentage)
              : 0;

          const maxCommissionAmount =
            effectiveHighestPrice > 0 && commissionPercentage > 0
              ? (effectiveHighestPrice * commissionPercentage) / 100
              : 0;

          return {
            ...product,
            image_url: displayImage,
            _max_commission_amount: maxCommissionAmount,
          };
        })
      );

      setProducts(productsWithExtras);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
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
    <DashboardLayout role="marketing">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Katalog Produk</h1>
          <p className="text-gray-600 mt-1">
            Lihat harga dasar produk dan atur margin pada total pesanan saat checkout
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
              <h3 className="text-sm font-medium text-primary-800">Cara Kerja Komisi Baru:</h3>
              <p className="mt-1 text-sm text-primary-700">
                <strong>Komisi Anda terdiri dari 2 bagian:</strong>
              </p>
              <ul className="mt-2 text-sm text-primary-700 list-disc list-inside space-y-1">
                <li><strong>Komisi dari Admin:</strong> Otomatis dihitung berdasarkan persentase yang ditetapkan admin dari harga dasar pesanan</li>
                <li><strong>Margin Tambahan:</strong> Anda dapat menambahkan margin pada total pesanan saat checkout (misalnya: total 100.000 ditagih 125.000, margin = 25.000)</li>
              </ul>
              <p className="mt-2 text-sm text-primary-700">
                <strong>Total Komisi = Komisi Admin + Margin Tambahan</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-4 flex-wrap">
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
                      Stok
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Komisi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => {
                    const productPrice = product.discounted_price || product.price;
                    const productCommissionPercentage =
                      product.commission_percentage != null
                        ? parseFloat(product.commission_percentage)
                        : 0;

                    // Estimasi komisi maksimal per 1 pcs:
                    // komisi% * harga varian tertinggi (kalau tidak ada variasi, pakai harga produk).
                    const baseCommissionAmount =
                      (productPrice * productCommissionPercentage) / 100;
                    const maxCommissionAmount =
                      product._max_commission_amount != null
                        ? product._max_commission_amount
                        : baseCommissionAmount;

                    return (
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
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            <span className="text-xs text-gray-500 pr-1">Mulai</span> Rp {formatRupiah(productPrice)}
                          </div>
                          {product.discount_percentage > 0 && (
                            <div className="text-xs text-gray-400 line-through">
                              Rp {formatRupiah(product.price)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {product.stock}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{product.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {productCommissionPercentage > 0 ? (
                            <>
                              <div className="text-sm font-semibold text-green-600">
                                {productCommissionPercentage}% hingga Rp{' '}
                                {formatRupiah(maxCommissionAmount)}
                              </div>
                              <div className="text-xs text-gray-500">
                                Estimasi per 1 pcs
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-400">-</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
              <h3 className="text-sm font-medium text-green-800">Cara Mengatur Margin:</h3>
              <ul className="mt-1 text-sm text-green-700 list-disc list-inside space-y-1">
                <li>Pilih produk yang ingin dijual dan tambahkan ke keranjang</li>
                <li>Saat checkout, Anda dapat menambahkan margin pada total pesanan</li>
                <li>Margin akan ditambahkan ke harga total yang ditagih ke customer</li>
                <li>Komisi Anda = Komisi dari Admin (otomatis) + Margin yang Anda tambahkan</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MarketingPricing;

