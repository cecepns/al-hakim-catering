import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Pin, PinOff, AlertCircle } from 'lucide-react';
import { orderAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const KurirOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pinningOrderId, setPinningOrderId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = { role: 'kurir' };
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
      'siap-kirim': 'bg-orange-100 text-orange-800',
      dikirim: 'bg-purple-100 text-purple-800',
      selesai: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const calculateRemainingPayment = (order) => {
    if (!order.payment_amount) return order.final_amount;
    const remaining = order.final_amount - parseFloat(order.payment_amount);
    return Math.max(0, remaining);
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      'transfer': 'Transfer',
      'dp': 'DP (Down Payment)',
      'cod': 'COD (Bayar di Tempat)',
      'tunai': 'Tunai',
    };
    return labels[method] || method || '-';
  };

  const formatTime = (time) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  // Hitung sisa hari & jam menuju acara (dipakai di kolom tanggal, bukan kolom terpisah)
  const getTimeUntilEvent = (order) => {
    if (!order.guest_event_date) return null;

    const now = new Date();
    const eventDate = new Date(order.guest_event_date);

    if (order.guest_event_time) {
      const [hours, minutes] = order.guest_event_time.split(':');
      eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }

    const diffMs = eventDate.getTime() - now.getTime();
    if (diffMs <= 0) return null;

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    return { days, hours };
  };

  const isEventUrgent = (order) => {
    const timeUntil = getTimeUntilEvent(order);
    if (!timeUntil) return false;
    // Peringatan jika kurang dari 48 jam sebelum acara
    const totalHours = timeUntil.days * 24 + timeUntil.hours;
    return totalHours < 48 && totalHours > 0;
  };

  const handlePinOrder = async (orderId, currentPinnedStatus) => {
    try {
      setPinningOrderId(orderId);
      await orderAPI.pinOrder(orderId, !currentPinnedStatus);
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
    { value: 'siap-kirim', label: 'Siap Kirim' },
    { value: 'dikirim', label: 'Dalam Pengiriman' },
    { value: 'selesai', label: 'Selesai' },
  ];

  return (
    <DashboardLayout role="kurir">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Daftar Pengiriman</h1>
          <p className="text-gray-600 mt-1">Kelola semua pengiriman pesanan</p>
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
                  d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                />
              </svg>
              <p className="text-gray-600">Tidak ada pesanan yang perlu dikirim</p>
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
                      Alamat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Link Sharelok
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Metode Pembayaran
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sisa Pembayaran
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
                  {orders.map((order) => {
                    const remainingPayment = calculateRemainingPayment(order);
                    const timeUntil = getTimeUntilEvent(order);
                    const urgent = isEventUrgent(order);
                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          order.is_pinned ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer_name}
                          </div>
                          <div className="text-sm text-gray-600">{order.customer_phone}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {order.delivery_address}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {order.guest_sharelok_link ? (
                            <a
                              href={order.guest_sharelok_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 underline truncate block max-w-xs"
                            >
                              Buka Lokasi
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getPaymentMethodLabel(order.payment_method)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {remainingPayment > 0 ? (
                            <span className="text-orange-600 font-medium">
                              Rp {formatRupiah(remainingPayment)}
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">Lunas</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {order.guest_event_date ? (
                            <div>
                              {new Date(order.guest_event_date).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                              {urgent && timeUntil && (
                                <div className="text-orange-600 text-xs mt-1 flex items-center gap-1">
                                  <AlertCircle size={14} />
                                  <span>
                                    Peringatan: Kurang dari 48 jam (
                                    {timeUntil.days > 0 ? `${timeUntil.days} hari ` : ''}
                                    {timeUntil.hours} jam) sebelum acara
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatTime(order.guest_event_time)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                          <div className="truncate" title={order.items_summary || `${order.items_count || 0} item`}>
                            {order.items_summary || `${order.items_count || 0} item`}
                          </div>
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
                            to={`/kurir/orders/${order.id}`}
                            className="text-primary-600 hover:text-primary-700 font-semibold"
                          >
                            {order.status === 'siap-kirim' ? 'Kirim' : 'Lihat'}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default KurirOrders;

