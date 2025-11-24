import { useEffect, useState } from 'react';
import { orderAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
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

