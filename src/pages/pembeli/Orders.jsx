import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { orderAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const PembeliOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const debounceTimer = useRef(null);
  const ITEMS_PER_PAGE = 10;

  // Debounce search query
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 1000);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      
      if (filter === 'review') {
        // Fetch all completed orders (with pagination and search)
        const params = {
          status: 'selesai',
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        };
        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }
        const response = await orderAPI.getAll(params);
        const completedOrders = response.data?.data || [];
        
        // Check which orders have reviews
        const reviewedOrderIds = new Set();
        await Promise.all(
          completedOrders.map(async (order) => {
            try {
              await orderAPI.getReview(order.id);
              reviewedOrderIds.add(order.id);
            } catch {
              // Order doesn't have review yet
            }
          })
        );
        
        // Show only orders that can be reviewed (selesai and no review)
        const ordersData = completedOrders.filter(order => !reviewedOrderIds.has(order.id));
        setOrders(ordersData);
        // Use total from response but adjust for filtered orders
        const total = response.data?.pagination?.total || 0;
        setPagination({
          total: total - reviewedOrderIds.size, // Approximate, actual would require fetching all
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          totalPages: Math.ceil(ordersData.length / ITEMS_PER_PAGE) || 1,
        });
      } else {
        const params = {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        };
        if (filter !== 'all') {
          params.status = filter;
        }
        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }
        const response = await orderAPI.getAll(params);
        setOrders(response.data.data || []);
        setPagination(response.data.pagination || {
          total: 0,
          page: 1,
          limit: ITEMS_PER_PAGE,
          totalPages: 1,
        });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, currentPage, debouncedSearch]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusColor = (status) => {
    const colors = {
      dibuat: 'bg-blue-100 text-blue-800',
      diproses: 'bg-yellow-100 text-yellow-800',
      dikirim: 'bg-purple-100 text-purple-800',
      selesai: 'bg-green-100 text-green-800',
      dibatalkan: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const statuses = [
    { value: 'all', label: 'Semua' },
    { value: 'dibuat', label: 'Dibuat' },
    { value: 'diproses', label: 'Diproses' },
    { value: 'dikirim', label: 'Dikirim' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'review', label: 'Review' },
  ];

  return (
    <DashboardLayout role="pembeli">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pesanan Saya</h1>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex space-x-2 overflow-x-auto">
              {statuses.map((status) => (
                <button
                  key={status.value}
                  onClick={() => {
                    setFilter(status.value);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    filter === status.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Cari pesanan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-gray-600 mb-4">Belum ada pesanan</p>
              <Link to="/products" className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">Mulai Belanja</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-xl p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Pesanan #{order.id}</p>
                      <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('id-ID')}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(order.status)}`}>{order.status}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Pembayaran</p>
                      <p className="text-xl font-bold text-primary-600">Rp {formatRupiah(order.final_amount)}</p>
                      <p className="text-xs text-gray-500 mt-1 capitalize">{order.payment_method}</p>
                    </div>
                    <Link to={`/pembeli/orders/${order.id}`} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">Detail</Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Menampilkan {((pagination.page - 1) * pagination.limit) + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} pesanan
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Halaman {pagination.page} dari {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PembeliOrders;
