import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Pin, PinOff, AlertCircle } from 'lucide-react';
import { orderAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';

const OperasionalOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pinningOrderId, setPinningOrderId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = { role: 'operasional' };
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
      dibatalkan: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (time) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  const getTimeUntilEvent = (eventDate, eventTime) => {
    if (!eventDate) return null;
    const now = new Date();
    const event = new Date(eventDate);

    if (eventTime) {
      const [hours, minutes] = eventTime.split(':');
      event.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }

    const diffMs = event.getTime() - now.getTime();
    if (diffMs <= 0) return null;

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
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

  // Cek peringatan untuk proses (kurang dari 7 hari sejak pesanan dibuat)
  const isProcessUrgent = (order) => {
    // Hanya untuk status yang belum selesai dan belum diproses
    if (!order.created_at || order.status === 'selesai' || order.tanggal_proses) return false;
    const now = new Date();
    const createdAt = new Date(order.created_at);
    const diffMs = now.getTime() - createdAt.getTime();
    const daysSinceCreated = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    // Peringatan jika sudah >= 6 hari (mendekati 7 hari)
    return daysSinceCreated >= 6;
  };

  // Cek peringatan untuk pengiriman (kurang dari 48 jam sebelum acara)
  const isShippingUrgent = (order) => {
    // Hanya untuk status yang belum dikirim dan belum selesai
    if (!order.guest_event_date || order.status === 'selesai' || order.status === 'dikirim' || order.tanggal_pengiriman) return false;
    const timeUntil = getTimeUntilEvent(order.guest_event_date, order.guest_event_time);
    if (!timeUntil) return false;
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
    { value: 'dibuat', label: 'Baru' },
    { value: 'diproses', label: 'Sedang Diproses' },
    { value: 'siap-kirim', label: 'Siap Kirim' },
    { value: 'dikirim', label: 'Dalam Pengiriman' },
    { value: 'selesai', label: 'Selesai' },
  ];

  return (
    <DashboardLayout role="operasional">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pesanan</h1>
          <p className="text-gray-600 mt-1">Pantau dan kelola semua pesanan</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-2 overflow-x-auto">
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
              <p className="text-gray-600">Belum ada pesanan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      ID Pesanan
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Pelanggan & Email
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      WA
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Tanggal
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Jam
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Tanggal Proses
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Tanggal Pengiriman
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Tanggal Selesai
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Penilaian
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Aksi
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Sematkan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => {
                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          order.is_pinned ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
                        }`}
                      >
                        <td className="px-3 md:px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {!!order.is_pinned && (
                              <Pin size={16} className="text-yellow-600" fill="currentColor" />
                            )}
                            <span>#{order.id}</span>
                          </div>
                        </td>
                      <td className="px-3 md:px-4 py-4 text-sm whitespace-nowrap">
                        <div className="font-medium text-gray-900">{order.customer_name}</div>
                        <div className="text-xs text-gray-500">{order.customer_email || '-'}</div>
                      </td>
                      <td className="px-3 md:px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {order.guest_wa_number_1 || order.customer_phone || '-'}
                        {order.guest_wa_number_2 && (
                          <div className="text-xs text-gray-500">{order.guest_wa_number_2}</div>
                        )}
                      </td>
                        <td className="px-3 md:px-4 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 md:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
                      <td className="px-3 md:px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {order.guest_event_date ? (
                          <div>
                            {new Date(order.guest_event_date).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {isProcessUrgent(order) && (
                              <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle size={14} />
                                <span>Peringatan: Proses mendekati 7 hari</span>
                              </div>
                            )}
                            {isShippingUrgent(order) && (
                              <div className="text-orange-600 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle size={14} />
                                {(() => {
                                  const timeUntil = getTimeUntilEvent(
                                    order.guest_event_date,
                                    order.guest_event_time
                                  );
                                  if (!timeUntil) return null;
                                  const totalHours = timeUntil.days * 24 + timeUntil.hours;
                                  return (
                                    <span>Peringatan: Kurang dari 48 jam ({totalHours} jam) untuk pengiriman</span>
                                  );
                                })()}
                              </div>
                            )}
                            {isEventUrgent(order.guest_event_date, order.guest_event_time) && !isProcessUrgent(order) && !isShippingUrgent(order) && (
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
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 md:px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatTime(order.guest_event_time)}
                      </td>
                      <td className="px-3 md:px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {order.tanggal_proses ? (
                          <>
                            <div>{new Date(order.tanggal_proses).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}</div>
                            {order.handler_email_proses && (
                              <div className="text-xs text-gray-500 mt-1">{order.handler_email_proses}</div>
                            )}
                          </>
                        ) : '-'}
                      </td>
                      <td className="px-3 md:px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {order.tanggal_pengiriman ? (
                          <>
                            <div>{new Date(order.tanggal_pengiriman).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}</div>
                            {order.handler_email_pengiriman && (
                              <div className="text-xs text-gray-500 mt-1">{order.handler_email_pengiriman}</div>
                            )}
                          </>
                        ) : '-'}
                      </td>
                      <td className="px-3 md:px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {order.tanggal_selesai ? new Date(order.tanggal_selesai).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }) : '-'}
                      </td>
                      <td className="px-3 md:px-4 py-4 whitespace-nowrap">
                        {order.rating ? (
                          <div className="flex items-center">
                            <span className="text-yellow-400 mr-1">★</span>
                            <span className="text-sm text-gray-900">{order.rating}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                        <td className="px-3 md:px-4 py-4 text-sm whitespace-nowrap">
                          <Link
                            to={`/operasional/orders/${order.id}`}
                            className="text-primary-600 hover:text-primary-700 font-semibold"
                          >
                            Detail
                          </Link>
                        </td>
                        <td className="px-3 md:px-4 py-4 text-sm whitespace-nowrap">
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

export default OperasionalOrders;


