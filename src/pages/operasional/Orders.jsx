import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';

const OperasionalOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
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


  const statuses = [
    { value: 'all', label: 'Semua' },
    { value: 'dibuat', label: 'Baru' },
    { value: 'diproses', label: 'Sedang Diproses' },
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
              <table className="w-full min-w-max">
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
                      Tanggal Acara
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
                      Detail Pesanan
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-3 md:px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        #{order.id}
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
                        <span className={`px-2 md:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {order.guest_event_date ? new Date(order.guest_event_date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }) : '-'}
                      </td>
                      <td className="px-3 md:px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {order.tanggal_proses ? new Date(order.tanggal_proses).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }) : '-'}
                      </td>
                      <td className="px-3 md:px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {order.tanggal_pengiriman ? new Date(order.tanggal_pengiriman).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }) : '-'}
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
                      <td className="px-3 md:px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {order.items_summary ? (
                          <div className="max-w-xs truncate" title={order.items_summary}>
                            {order.items_summary.substring(0, 50)}
                            {order.items_summary.length > 50 ? '...' : ''}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 md:px-4 py-4 text-sm whitespace-nowrap">
                        <Link
                          to={`/operasional/orders/${order.id}`}
                          className="text-primary-600 hover:text-primary-700 font-semibold"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
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


