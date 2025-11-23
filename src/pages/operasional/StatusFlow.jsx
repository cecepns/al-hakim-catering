import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';
import { formatRupiah } from '../../utils/formatHelper';

const OperasionalStatusFlow = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [selectedStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
      const response = await orderAPI.getAll(params);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      dibuat: 'bg-blue-100 text-blue-800 border-blue-300',
      diproses: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      dikirim: 'bg-purple-100 text-purple-800 border-purple-300',
      selesai: 'bg-green-100 text-green-800 border-green-300',
      dibatalkan: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status) => {
    const icons = {
      dibuat: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      diproses: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
      dikirim: 'M13 10V3L4 14h7v7l9-11h-7z',
      selesai: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    };
    return icons[status] || 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';
  };

  const statusGroups = {
    dibuat: orders.filter((o) => o.status === 'dibuat'),
    diproses: orders.filter((o) => o.status === 'diproses'),
    dikirim: orders.filter((o) => o.status === 'dikirim'),
    selesai: orders.filter((o) => o.status === 'selesai'),
  };

  const statusConfig = [
    { key: 'dibuat', label: 'Dibuat', description: 'Pesanan dibuat & diverifikasi' },
    { key: 'diproses', label: 'Diproses', description: 'Dapur mengerjakan pesanan' },
    { key: 'dikirim', label: 'Dikirim', description: 'Kurir mengirim pesanan' },
    { key: 'selesai', label: 'Selesai', description: 'Pesanan diterima pelanggan' },
  ];

  return (
    <DashboardLayout role="operasional">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alur Status Pesanan</h1>
            <p className="text-gray-600 mt-1">Pantau status pesanan secara real-time</p>
          </div>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {statusConfig.map((status) => (
            <div
              key={status.key}
              className={`p-4 rounded-lg border-2 ${getStatusColor(status.key)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{status.label}</h3>
                <span className="text-2xl font-bold">{statusGroups[status.key]?.length || 0}</span>
              </div>
              <p className="text-sm opacity-80">{status.description}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {statusConfig.map((status) => (
              <div key={status.key} className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(status.key).split(' ')[0]}`}>
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={getStatusIcon(status.key)}
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{status.label}</h3>
                      <p className="text-xs text-gray-600">{statusGroups[status.key]?.length || 0} pesanan</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {statusGroups[status.key]?.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-sm">Tidak ada pesanan</p>
                    </div>
                  ) : (
                    statusGroups[status.key].map((order) => (
                      <Link
                        key={order.id}
                        to={`/operasional/orders/${order.id}`}
                        className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-900">#{order.id}</span>
                          <span className="text-xs text-gray-600">
                            {new Date(order.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1 truncate">
                          {order.customer_name || order.guest_customer_name || 'Guest'}
                        </p>
                        <p className="text-xs font-semibold text-primary-600">
                          Rp {formatRupiah(order.final_amount)}
                        </p>
                        {order.payment_status !== 'paid' && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                            {order.payment_status}
                          </span>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Info Alur Status</h3>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Halaman ini akan auto-refresh setiap 30 detik</li>
                <li>• Klik pada pesanan untuk melihat detail lengkap</li>
                <li>• Pastikan sinkronisasi data antar dashboard (Admin, Dapur, Kurir)</li>
                <li>• Jika ada delay, gunakan tombol Refresh manual</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OperasionalStatusFlow;


