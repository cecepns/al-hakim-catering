import { useEffect, useState } from 'react';
import { orderAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';

const KurirDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    readyToShip: 0,
    inDelivery: 0,
    delivered: 0,
  });
  const [loading, setLoading] = useState(true);

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

