import { useEffect, useState } from 'react';
import { cashbackAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';

const Cashback = () => {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [balanceRes, historyRes] = await Promise.all([
        cashbackAPI.getBalance(),
        cashbackAPI.getHistory(),
      ]);
      setBalance(balanceRes.data.balance || 0);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Error fetching cashback:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (amount) => {
    const num = parseFloat(amount) || 0;
    return num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,').replace('.', ',');
  };

  if (loading) {
    return (
      <DashboardLayout role="pembeli">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="pembeli">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Cashback Saya</h1>

        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl shadow-lg p-8 text-white mb-6">
          <p className="text-primary-100 text-sm mb-2">Saldo Cashback</p>
          <p className="text-4xl font-bold">Rp {formatRupiah(balance)}</p>
          <p className="text-primary-100 text-sm mt-4">
            Dapatkan 1% cashback dari setiap pembelian!
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Cashback</h2>
          {history.length === 0 ? (
            <p className="text-center text-gray-600 py-8">Belum ada riwayat cashback</p>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-4 border-b">
                  <div>
                    <p className="font-medium text-gray-900">{item.description}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(item.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <span className={`text-lg font-semibold ${item.type === 'earned' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.type === 'earned' ? '+' : '-'} Rp {formatRupiah(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Cashback;
