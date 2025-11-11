import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI, cashbackAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const PembeliDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [cashback, setCashback] = useState({ balance: 0, history: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, cashbackRes] = await Promise.all([
        orderAPI.getAll({ limit: 5 }),
        cashbackAPI.getBalance(),
      ]);
      setOrders(ordersRes.data);
      setCashback(cashbackRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'dibuat': 'bg-blue-100 text-blue-800',
      'diproses': 'bg-yellow-100 text-yellow-800',
      'dikirim': 'bg-purple-100 text-purple-800',
      'selesai': 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout role="pembeli">
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
    <DashboardLayout role="pembeli">
      <div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm">Saldo Cashback</p>
                <p className="text-3xl font-bold mt-2">
                  Rp {formatRupiah(cashback.balance)}
                </p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <Link to="/pembeli/cashback" className="mt-4 text-sm text-primary-100 hover:text-white flex items-center">
              Lihat detail
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <Link to="/pembeli/orders" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Pesanan</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{orders.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </Link>

          <Link to="/products" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Belanja Sekarang</p>
                <p className="text-lg font-semibold text-gray-900 mt-2">Lihat Produk</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Pesanan Terbaru</h2>
            <Link to="/pembeli/orders" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">
              Lihat Semua
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-gray-600 mb-4">Belum ada pesanan</p>
              <Link to="/products" className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition">
                Mulai Belanja
              </Link>
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
                      Tanggal
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Total
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
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        #{order.id}
                      </td>
                      <td className="px-3 md:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-3 md:px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        Rp {formatRupiah(order.total_amount)}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 md:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-sm whitespace-nowrap">
                        <Link to={`/pembeli/orders/${order.id}`} className="text-primary-600 hover:text-primary-700 font-semibold">
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

export default PembeliDashboard;
