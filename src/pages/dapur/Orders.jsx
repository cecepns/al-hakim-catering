import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Pin, PinOff } from 'lucide-react';
import { orderAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const DapurOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pinningOrderId, setPinningOrderId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = { role: 'dapur' };
      if (filter !== 'all') {
        params.status = filter;
      }
      const response = await orderAPI.getAll(params);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

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

  const getDaysUntilEvent = (eventDate) => {
    if (!eventDate) return null;
    const today = new Date();
    const event = new Date(eventDate);
    const diffTime = event - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isEventUrgent = (eventDate) => {
    const daysUntil = getDaysUntilEvent(eventDate);
    return daysUntil !== null && daysUntil <= 7 && daysUntil > 0;
  };

  const hasUrgentOrders = orders.some((order) => isEventUrgent(order.guest_event_date));

  const formatEventDateTime = (date, time) => {
    if (!date) return '-';
    const dateStr = new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return time ? `${dateStr} ${time}` : dateStr;
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
    { value: 'dikirim', label: 'Selesai' },
  ];

  return (
    <DashboardLayout role="dapur">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Daftar Pesanan Dapur</h1>
          <p className="text-gray-600 mt-1">Kelola semua pesanan yang perlu diproses</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex space-x-2 mb-6 overflow-x-auto">
            {statuses.map((status) => (
              <button
                key={status.value}
                onClick={() => setFilter(status.value)}
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
                      Tanggal/Waktu Acara
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
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
                          {order.is_pinned && (
                            <Pin size={16} className="text-yellow-600" fill="currentColor" />
                          )}
                          <span>#{order.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatEventDateTime(order.guest_event_date, order.guest_event_time)}
                        {isEventUrgent(order.guest_event_date) && (
                          <div className="text-orange-600 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle size={14} />
                            {getDaysUntilEvent(order.guest_event_date)} hari lagi
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Rp {formatRupiah(order.total_amount)}
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
                        <Link
                          to={`/dapur/orders/${order.id}`}
                          className="text-primary-600 hover:text-primary-700 font-semibold"
                        >
                          {order.status === 'dibuat' ? 'Proses' : 'Lihat'}
                        </Link>
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

