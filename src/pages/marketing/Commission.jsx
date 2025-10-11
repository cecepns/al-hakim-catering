import { useEffect, useState } from 'react';
import { commissionAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const MarketingCommission = () => {
  const [commission, setCommission] = useState({
    balance: 0,
    thisMonth: 0,
    totalEarned: 0,
    history: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommission();
  }, []);

  const fetchCommission = async () => {
    try {
      setLoading(true);
      const response = await commissionAPI.getBalance();
      setCommission(response.data);
    } catch (error) {
      console.error('Error fetching commission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (commission.balance < 50000) {
      alert('Minimal penarikan adalah Rp 50.000');
      return;
    }

    if (!window.confirm(`Tarik komisi sebesar Rp ${formatRupiah(commission.balance)}?`)) {
      return;
    }

    try {
      await commissionAPI.withdraw();
      alert('Permintaan penarikan berhasil diajukan');
      fetchCommission();
    } catch (error) {
      console.error('Error withdrawing:', error);
      alert(error.response?.data?.message || 'Gagal mengajukan penarikan');
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="marketing">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="marketing">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Komisi Saya</h1>
          <p className="text-gray-600 mt-1">Detail komisi dan riwayat penarikan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl shadow-lg p-6 text-white">
            <p className="text-primary-100 text-sm">Saldo Tersedia</p>
            <p className="text-4xl font-bold mt-2">Rp {formatRupiah(commission.balance)}</p>
            <button
              onClick={handleWithdraw}
              disabled={commission.balance < 50000}
              className="mt-4 w-full bg-white text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 disabled:bg-gray-300 disabled:text-gray-500 font-semibold transition"
            >
              Tarik Komisi
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-600 text-sm">Komisi Bulan Ini</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              Rp {formatRupiah(commission.thisMonth)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-600 text-sm">Total Komisi</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              Rp {formatRupiah(commission.totalEarned)}
            </p>
            <p className="text-sm text-gray-500 mt-2">Sepanjang waktu</p>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Minimal penarikan adalah <strong>Rp 50.000</strong>. Komisi akan diproses dalam 1-3
                hari kerja setelah pengajuan penarikan.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Riwayat Komisi</h2>

          {commission.history && commission.history.length === 0 ? (
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
              <p className="text-gray-600">Belum ada riwayat komisi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Deskripsi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Jumlah
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {commission.history?.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(item.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.type === 'credit'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.type === 'credit' ? 'Masuk' : 'Keluar'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span
                          className={`font-semibold ${
                            item.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {item.type === 'credit' ? '+' : '-'} Rp {formatRupiah(item.amount)}
                        </span>
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

export default MarketingCommission;

