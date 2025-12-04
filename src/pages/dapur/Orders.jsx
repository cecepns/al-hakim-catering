import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Pin, PinOff, Search } from 'lucide-react';
import { orderAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';

const DapurOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pinningOrderId, setPinningOrderId] = useState(null);
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
      const params = {
        role: 'dapur',
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
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTimeUntilEvent = (eventDate, eventTime) => {
    if (!eventDate) return null;
    const today = new Date();
    const event = new Date(eventDate);

    if (eventTime) {
      const [hours, minutes] = eventTime.split(':');
      event.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }

    const diffTime = event.getTime() - today.getTime();
    if (diffTime <= 0) return null;

    const totalHours = Math.floor(diffTime / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    return { days, hours };
  };

  const isEventUrgent = (eventDate, eventTime) => {
    const timeUntil = getTimeUntilEvent(eventDate, eventTime);
    return (
      timeUntil !== null &&
      timeUntil.days <= 7 &&
      (timeUntil.days > 0 || timeUntil.hours > 0)
    );
  };

  const hasUrgentOrders = orders.some((order) =>
    isEventUrgent(order.guest_event_date, order.guest_event_time)
  );

  const formatEventDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
  });
  };

  const formatEventTime = (time) => {
    if (!time) return '-';
    return time;
  };

  const formatCategory = (categories) => {
    if (!categories) return '-';
    // Capitalize first letter of each category
    return categories.split(', ').map(cat => {
      return cat.charAt(0).toUpperCase() + cat.slice(1);
    }).join(', ');
  };

  const handlePinOrder = async (orderId, currentPinnedStatus) => {
    try {
      setPinningOrderId(orderId);
      // Toggle: if currently pinned, unpin it; if not pinned, pin it
      await orderAPI.pinOrder(orderId, !currentPinnedStatus);
      // Refresh orders
      await fetchOrders();
    } catch (error) {
      console.error('Error pinning/unpinning order:', error);
      alert(error.response?.data?.message || 'Gagal mengubah status sematkan');
    } finally {
      setPinningOrderId(null);
    }
  };

  const statuses = [
    { value: 'all', label: 'Semua' },
    { value: 'dibuat', label: 'Baru' },
    { value: 'diproses', label: 'Sedang Diproses' },
    { value: 'dikirim', label: 'Dikirim' },
    { value: 'selesai', label: 'Selesai' },
  ];

  return (
    <DashboardLayout role="dapur">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Daftar Pesanan Dapur</h1>
          <p className="text-gray-600 mt-1">Kelola semua pesanan yang perlu diproses</p>
        </div>

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
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-gray-600">Tidak ada pesanan yang perlu diproses</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID Pesanan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Pelanggan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Jam
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Detail Pesanan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sematkan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        order.is_pinned 
                          ? 'bg-yellow-50 border-l-4 border-yellow-400' 
                          : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {!!order.is_pinned && (
                            <Pin size={16} className="text-yellow-600" fill="currentColor" />
                          )}
                          <span>#{order.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.customer_name || order.guest_customer_name || 'Guest'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCategory(order.categories)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div>
                          {formatEventDate(order.guest_event_date)}
                          {isEventUrgent(order.guest_event_date, order.guest_event_time) && (
                            <div className="text-orange-600 text-xs mt-1 flex items-center gap-1">
                              <AlertCircle size={14} />
                              {(() => {
                                const timeUntil = getTimeUntilEvent(
                                  order.guest_event_date,
                                  order.guest_event_time
                                );
                                if (!timeUntil) return null;
                                return (
                                  <>
                                    {timeUntil.days > 0 ? `${timeUntil.days} hari ` : ''}
                                    {timeUntil.hours} jam lagi
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatEventTime(order.guest_event_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          to={`/dapur/orders/${order.id}`}
                          className="text-primary-600 hover:text-primary-700 font-semibold"
                        >
                          Lihat Detail
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {order.status === 'dibuat' && (
                          <Link
                            to={`/dapur/orders/${order.id}`}
                            className="text-primary-600 hover:text-primary-700 font-semibold"
                          >
                            Proses
                          </Link>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handlePinOrder(order.id, order.is_pinned)}
                          disabled={pinningOrderId === order.id}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            order.is_pinned
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={order.is_pinned ? 'Batalkan Sematkan' : 'Sematkan Pesanan'}
                        >
                          {pinningOrderId === order.id ? (
                            <span className="animate-spin">⏳</span>
                          ) : order.is_pinned ? (
                            <>
                              <PinOff size={14} />
                              Batal Sematkan
                            </>
                          ) : (
                            <>
                              <Pin size={14} />
                              Sematkan
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

          {hasUrgentOrders && (
            <div className="mt-6 bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-orange-600 mt-0.5" size={20} />
                <div>
                  <p className="text-orange-800 font-semibold">⚠️ Pesanan harus segera diproses</p>
                  <p className="text-orange-700 text-sm mt-1">
                    Ada pesanan dengan acara dalam 7 hari ke depan yang memerlukan perhatian segera.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DapurOrders;

