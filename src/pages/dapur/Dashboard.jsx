import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const DapurDashboard = () => {
  useAuth();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    needProcessing: 0,
    inProgress: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getAll({ 
        status: 'dibuat,diproses',
        role: 'dapur' 
      });
      setOrders(response.data);

      const statusCount = response.data.reduce((acc, order) => {
        if (order.status === 'dibuat') acc.needProcessing++;
        if (order.status === 'diproses') acc.inProgress++;
        return acc;
      }, { needProcessing: 0, inProgress: 0, completed: 0 });

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
      'dikirim': 'bg-purple-100 text-purple-800',
      'selesai': 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout role="dapur">
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
    <DashboardLayout role="dapur">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Dapur</h1>
          <p className="text-gray-600 mt-1">Kelola pesanan yang perlu diproses</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Perlu Diproses</p>
                <p className="text-3xl font-bold mt-2">{stats.needProcessing}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Sedang Dikerjakan</p>
                <p className="text-3xl font-bold mt-2">{stats.inProgress}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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
          <h2 className="text-lg font-bold text-gray-900 mb-4">Alur Kerja Dapur</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="font-bold">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Terima Pesanan</h3>
              <p className="text-sm text-gray-600">Pesanan masuk dengan status &quot;Dibuat&quot;</p>
            </div>

            <div className="text-center p-4 border-2 border-yellow-200 rounded-lg bg-yellow-50">
              <div className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="font-bold">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Proses Pesanan</h3>
              <p className="text-sm text-gray-600">Kerjakan dan upload bukti foto/video</p>
            </div>

            <div className="text-center p-4 border-2 border-green-200 rounded-lg bg-green-50">
              <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="font-bold">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Selesai</h3>
              <p className="text-sm text-gray-600">Pesanan siap untuk dikirim</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Daftar Pesanan</h2>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600">Belum ada pesanan yang perlu diproses</p>
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
                      <td className="px-3 md:px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {order.customer_name}
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
                        <Link
                          to={`/dapur/orders/${order.id}`}
                          className="text-primary-600 hover:text-primary-700 font-semibold"
                        >
                          {order.status === 'dibuat' ? 'Proses' : 'Lihat'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 bg-orange-50 border-l-4 border-orange-500 p-6 rounded-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Panduan untuk Dapur
              </h3>
              <ul className="text-gray-700 space-y-1 text-sm">
                <li>• Pastikan semua bahan tersedia sebelum memulai proses</li>
                <li>• Upload foto/video proses sebagai bukti dokumentasi</li>
                <li>• Periksa kualitas makanan sebelum menyelesaikan pesanan</li>
                <li>• Koordinasi dengan tim operasional untuk pengiriman</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DapurDashboard;

