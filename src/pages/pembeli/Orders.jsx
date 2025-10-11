import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const PembeliOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
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
  };

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
  ];

  return (
    <DashboardLayout role="pembeli">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pesanan Saya</h1>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex space-x-2 mb-6 overflow-x-auto">
            {statuses.map((status) => (
              <button key={status.value} onClick={() => setFilter(status.value)} className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${filter === status.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PembeliOrders;
