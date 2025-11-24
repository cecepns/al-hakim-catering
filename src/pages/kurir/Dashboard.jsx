import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const KurirDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    readyToShip: 0,
    inDelivery: 0,
    delivered: 0,
  });
  const [loading, setLoading] = useState(true);

  const checkEventWarning = (order) => {
    if (!order.guest_event_date || !order.guest_event_time) return null;
    
    const eventDate = new Date(`${order.guest_event_date}T${order.guest_event_time}`);
    const now = new Date();
    const diffMs = eventDate - now;
    const diffMinutes = diffMs / (1000 * 60);
    
    // Warning 30 minutes before event
    if (diffMinutes > 0 && diffMinutes <= 30) {
      return true;
    }
    return false;
  };

  const formatEventDateTime = (order) => {
    if (!order.guest_event_date || !order.guest_event_time) return null;
    
    const eventDate = new Date(`${order.guest_event_date}T${order.guest_event_time}`);
    return {
      date: eventDate.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: eventDate.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      fullDateTime: eventDate.toLocaleString('id-ID')
    };
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getAll({ 
        status: 'siap-kirim,dikirim',
        role: 'kurir' 
      });
      setOrders(response.data);

      const statusCount = response.data.reduce((acc, order) => {
        if (order.status === 'siap-kirim') acc.readyToShip++;
        if (order.status === 'dikirim') acc.inDelivery++;
        return acc;
      }, { readyToShip: 0, inDelivery: 0, delivered: 0 });

      setStats(statusCount);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'dibuat': 'bg-blue-100 text-blue-800',
      'diproses': 'bg-yellow-100 text-yellow-800',
      'siap-kirim': 'bg-orange-100 text-orange-800',
      'dikirim': 'bg-purple-100 text-purple-800',
      'selesai': 'bg-green-100 text-green-800',
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
    return labels[method] || method;
  };

  if (loading) {
    return (
      <DashboardLayout role="kurir">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="kurir">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Kurir</h1>
          <p className="text-gray-600 mt-1">Kelola pengiriman pesanan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Siap Kirim</p>
                <p className="text-3xl font-bold mt-2">{stats.readyToShip}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Dalam Pengiriman</p>
                <p className="text-3xl font-bold mt-2">{stats.inDelivery}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Pesanan</p>
                <p className="text-3xl font-bold mt-2">{orders.length}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Alur Pengiriman</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border-2 border-yellow-200 rounded-lg bg-yellow-50">
              <div className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="font-bold">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Ambil Pesanan</h3>
              <p className="text-sm text-gray-600">Pesanan siap kirim dari dapur</p>
            </div>

            <div className="text-center p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
              <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="font-bold">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Kirim Pesanan</h3>
              <p className="text-sm text-gray-600">Update status dan upload bukti pengiriman</p>
            </div>

            <div className="text-center p-4 border-2 border-green-200 rounded-lg bg-green-50">
              <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="font-bold">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Selesai</h3>
              <p className="text-sm text-gray-600">Pesanan diterima pelanggan</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Daftar Pengiriman</h2>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              <p className="text-gray-600">Belum ada pesanan yang perlu dikirim</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0 md:rounded-lg">
              <table className="w-full min-w-max md:min-w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      ID Pesanan
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Pelanggan
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap hidden md:table-cell">
                      Alamat
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap hidden lg:table-cell">
                      Link Sharelok
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap hidden lg:table-cell">
                      Metode Pembayaran
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap hidden lg:table-cell">
                      Sisa Pembayaran
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Detail Pesanan
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => {
                    const eventInfo = formatEventDateTime(order);
                    const hasWarning = checkEventWarning(order);
                    const remainingPayment = calculateRemainingPayment(order);
                    // Items might not be available in getAll response, so we'll show a placeholder
                    const orderItemsCount = order.items?.length || 0;
                    const totalItems = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                    
                    return (
                      <tr key={order.id} className={`hover:bg-gray-50 ${hasWarning ? 'bg-yellow-50' : ''}`}>
                        <td className="px-3 md:px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          <div>#{order.id}</div>
                          {eventInfo && (
                            <div className="text-xs text-gray-600 mt-1">
                              <div className="font-medium">Acara:</div>
                              <div>{eventInfo.date}</div>
                              <div>{eventInfo.time}</div>
                              {hasWarning && (
                                <div className="mt-1 text-yellow-700 font-semibold flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  Pesanan harus segera tiba
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-sm whitespace-nowrap">
                          <div className="font-medium text-gray-900">{order.customer_name}</div>
                          <div className="text-xs text-gray-600">{order.customer_phone}</div>
                        </td>
                        <td className="px-3 md:px-6 py-4 text-sm text-gray-600 hidden md:table-cell max-w-xs truncate">
                          {order.delivery_address}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-sm hidden lg:table-cell">
                          {order.guest_sharelok_link ? (
                            <a
                              href={order.guest_sharelok_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 underline flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Buka Lokasi
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-sm text-gray-700 hidden lg:table-cell whitespace-nowrap">
                          <span className="font-medium">{getPaymentMethodLabel(order.payment_method)}</span>
                          {order.payment_status && (
                            <div className="text-xs text-gray-500 mt-1">
                              {order.payment_status === 'paid' ? 'Lunas' : 
                               order.payment_status === 'partial' ? 'Sebagian' : 
                               'Belum Bayar'}
                            </div>
                          )}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-sm hidden lg:table-cell whitespace-nowrap">
                          {remainingPayment > 0 ? (
                            <div>
                              <div className="font-semibold text-orange-600">
                                Rp {formatRupiah(remainingPayment)}
                              </div>
                              {order.payment_amount && (
                                <div className="text-xs text-gray-500">
                                  Terbayar: Rp {formatRupiah(order.payment_amount)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-green-600 font-semibold text-xs">Lunas</div>
                          )}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-sm">
                          <div className="text-gray-900">
                            {orderItemsCount > 0 ? (
                              <>
                                <div className="font-medium">{orderItemsCount} item</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Total: {totalItems} pcs
                                </div>
                              </>
                            ) : (
                              <div className="text-xs text-gray-500 italic">Lihat detail</div>
                            )}
                            <div className="text-xs text-gray-700 mt-1 font-semibold">
                              Rp {formatRupiah(order.final_amount)}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 md:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-4 text-sm whitespace-nowrap">
                          <Link
                            to={`/kurir/orders/${order.id}`}
                            className="text-primary-600 hover:text-primary-700 font-semibold"
                          >
                            {order.status === 'siap-kirim' ? 'Kirim' : 'Lihat'}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-purple-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Panduan untuk Kurir
              </h3>
              <ul className="text-gray-700 space-y-1 text-sm">
                <li>• Periksa kelengkapan pesanan sebelum berangkat</li>
                <li>• Upload foto bukti pengiriman (resi/foto saat pengiriman)</li>
                <li>• Pastikan nomor telepon pelanggan dapat dihubungi</li>
                <li>• Konfirmasi penerimaan dengan pelanggan dan minta tanda tangan jika perlu</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default KurirDashboard;

