import { useEffect, useState } from 'react';
import { cashFlowAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';
import ImageViewer from '../../components/ImageViewer';

const CashFlow = () => {
  const [summary, setSummary] = useState({
    balance: 0,
    operasi: { totalIncome: 0, totalExpenses: 0, totalCash: 0 },
    investasi: { totalIncome: 0, totalExpenses: 0, totalCash: 0 },
    pendanaan: { totalIncome: 0, totalExpenses: 0, totalCash: 0 }
  });
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    activity_category: 'operasi',
    type: 'income',
    amount: '',
    description: '',
    proof: null
  });
  const [proofPreview, setProofPreview] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 10,
        offset: (currentPage - 1) * 10
      };
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      if (filter !== 'all') {
        params.type = filter;
      }
      if (activityFilter !== 'all') {
        params.activity_category = activityFilter;
      }

      const [summaryRes, transactionsRes] = await Promise.all([
        cashFlowAPI.getSummary(params),
        cashFlowAPI.getTransactions(params)
      ]);

      setSummary(summaryRes.data);
      setTransactions(transactionsRes.data.transactions || []);
      setPagination(transactionsRes.data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      alert('Gagal memuat data arus kas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, activityFilter, startDate, endDate, currentPage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('activity_category', formData.activity_category);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('description', formData.description);
      if (formData.proof) {
        formDataToSend.append('proof', formData.proof);
      }

      if (editingTransaction) {
        await cashFlowAPI.updateTransaction(editingTransaction.id, formDataToSend);
        alert('Transaksi berhasil diupdate');
      } else {
        await cashFlowAPI.createTransaction(formDataToSend);
        alert('Transaksi berhasil ditambahkan');
      }

      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Gagal menyimpan transaksi');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;

    try {
      await cashFlowAPI.deleteTransaction(id);
      alert('Transaksi berhasil dihapus');
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Gagal menghapus transaksi');
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      activity_category: transaction.activity_category || 'operasi',
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description || '',
      proof: null
    });
    setProofPreview(transaction.proof_image_url ? `https://api-inventory.isavralabel.com/al-hakim${transaction.proof_image_url}` : null);
    setModalOpen(true);
  };

  const handleViewHistory = async (transactionId) => {
    try {
      const res = await cashFlowAPI.getEditHistory(transactionId);
      setEditHistory(res.data);
      setSelectedTransactionId(transactionId);
      setHistoryModalOpen(true);
    } catch (error) {
      console.error('Error fetching edit history:', error);
      alert('Gagal memuat riwayat edit');
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = {};
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      if (filter !== 'all') {
        params.type = filter;
      }
      if (activityFilter !== 'all') {
        params.activity_category = activityFilter;
      }

      const response = await cashFlowAPI.exportExcel(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `laporan-arus-kas-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Gagal mengekspor laporan');
    }
  };

  const resetForm = () => {
    setFormData({
      activity_category: 'operasi',
      type: 'income',
      amount: '',
      description: '',
      proof: null
    });
    setProofPreview(null);
    setEditingTransaction(null);
  };

  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, proof: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const activityCategoryMap = {
    'operasi': 'Aktivitas Operasi',
    'investasi': 'Aktivitas Investasi',
    'pendanaan': 'Aktivitas Pendanaan'
  };

  const changeTypeMap = {
    'created': 'Dibuat',
    'updated': 'Diupdate',
    'deleted': 'Dihapus'
  };

  return (
    <DashboardLayout role="admin">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Arus Kas</h1>
          <p className="text-gray-600 mt-1">Pantau saldo, pemasukan, dan pengeluaran</p>
        </div>

        {/* Summary Cards */}
        <div className="mb-6">
          {/* Overall Balance */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">SALDO</h2>
            <div className="flex items-center justify-between">
              <p className={`text-3xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rp {formatRupiah(summary.balance)}
              </p>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Activity Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Aktivitas Operasi */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">AKTIVITAS OPERASI</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Total Pemasukan</p>
                  <p className="text-xl font-bold text-green-600">
                    Rp {formatRupiah(summary.operasi?.totalIncome || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total Pengeluaran</p>
                  <p className="text-xl font-bold text-red-600">
                    Rp {formatRupiah(summary.operasi?.totalExpenses || 0)}
                  </p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-gray-600 text-sm">Total Kas</p>
                  <p className={`text-xl font-bold ${(summary.operasi?.totalCash || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Rp {formatRupiah(summary.operasi?.totalCash || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Aktivitas Investasi */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">AKTIVITAS INVESTASI</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Total Pemasukan</p>
                  <p className="text-xl font-bold text-green-600">
                    Rp {formatRupiah(summary.investasi?.totalIncome || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total Pengeluaran</p>
                  <p className="text-xl font-bold text-red-600">
                    Rp {formatRupiah(summary.investasi?.totalExpenses || 0)}
                  </p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-gray-600 text-sm">Total Kas</p>
                  <p className={`text-xl font-bold ${(summary.investasi?.totalCash || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Rp {formatRupiah(summary.investasi?.totalCash || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Aktivitas Pendanaan */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">AKTIVITAS PENDANAAN</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Total Pemasukan</p>
                  <p className="text-xl font-bold text-green-600">
                    Rp {formatRupiah(summary.pendanaan?.totalIncome || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total Pengeluaran</p>
                  <p className="text-xl font-bold text-red-600">
                    Rp {formatRupiah(summary.pendanaan?.totalExpenses || 0)}
                  </p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-gray-600 text-sm">Total Kas</p>
                  <p className={`text-xl font-bold ${(summary.pendanaan?.totalCash || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Rp {formatRupiah(summary.pendanaan?.totalCash || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Tipe:</label>
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Semua</option>
                  <option value="income">Pemasukan</option>
                  <option value="expense">Pengeluaran</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Kategori:</label>
                <select
                  value={activityFilter}
                  onChange={(e) => {
                    setActivityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Semua</option>
                  <option value="operasi">Aktivitas Operasi</option>
                  <option value="investasi">Aktivitas Investasi</option>
                  <option value="pendanaan">Aktivitas Pendanaan</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Dari:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sampai:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Export Excel
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setModalOpen(true);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                + Tambah Transaksi
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Belum ada transaksi</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dibuat Oleh</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bukti</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(transaction.created_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {activityCategoryMap[transaction.activity_category] || transaction.activity_category}
                          {transaction.order_id_ref && (
                            <span className="ml-2 text-xs text-gray-500 block">(Pesanan #{transaction.order_id_ref})</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              transaction.type === 'income'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {transaction.description || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'} Rp {formatRupiah(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {transaction.created_by_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {transaction.proof_image_url ? (
                            <button
                              onClick={() => {
                                setViewingImage(`https://api-inventory.isavralabel.com/al-hakim${transaction.proof_image_url}`);
                                setImageViewerOpen(true);
                              }}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              Lihat
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewHistory(transaction.id)}
                              className="text-purple-600 hover:text-purple-900 text-xs"
                            >
                              History
                            </button>
                            <button
                              onClick={() => handleEdit(transaction)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            {/* <button
                              onClick={() => handleDelete(transaction.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Hapus
                            </button> */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Menampilkan {((currentPage - 1) * pagination.limit) + 1} - {Math.min(currentPage * pagination.limit, pagination.total)} dari {pagination.total} transaksi
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sebelumnya
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                      Halaman {currentPage} dari {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Add/Edit Transaction Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori Aktivitas</label>
                  <select
                    value={formData.activity_category}
                    onChange={(e) => setFormData({ ...formData, activity_category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="operasi">Aktivitas Operasi</option>
                    <option value="investasi">Aktivitas Investasi</option>
                    <option value="pendanaan">Aktivitas Pendanaan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    rows="3"
                    placeholder="Masukkan keterangan transaksi..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bukti Foto</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  {proofPreview && (
                    <div className="mt-2">
                      <img
                        src={proofPreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, proof: null });
                          setProofPreview(null);
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-800"
                      >
                        Hapus Preview
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    {editingTransaction ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit History Modal */}
        {historyModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Riwayat Edit Transaksi #{selectedTransactionId}</h3>
                <button
                  onClick={() => {
                    setHistoryModalOpen(false);
                    setEditHistory([]);
                    setSelectedTransactionId(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {editHistory.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Belum ada riwayat edit</p>
              ) : (
                <div className="space-y-4">
                  {editHistory.map((history) => (
                    <div key={history.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {changeTypeMap[history.change_type] || history.change_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(history.created_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        Oleh: {history.changed_by_name || 'System'}
                      </p>
                      <div className="space-y-1 text-sm">
                        {history.old_type !== history.new_type && (
                          <p>
                            <span className="text-gray-600">Tipe:</span>{' '}
                            <span className="line-through">{history.old_type}</span> →{' '}
                            <span className="font-medium">{history.new_type}</span>
                          </p>
                        )}
                        {history.old_amount !== history.new_amount && (
                          <p>
                            <span className="text-gray-600">Jumlah:</span>{' '}
                            <span className="line-through">Rp {formatRupiah(history.old_amount)}</span> →{' '}
                            <span className="font-medium">Rp {formatRupiah(history.new_amount)}</span>
                          </p>
                        )}
                        {history.old_activity_category !== history.new_activity_category && (
                          <p>
                            <span className="text-gray-600">Kategori:</span>{' '}
                            <span className="line-through">{activityCategoryMap[history.old_activity_category] || history.old_activity_category}</span> →{' '}
                            <span className="font-medium">{activityCategoryMap[history.new_activity_category] || history.new_activity_category}</span>
                          </p>
                        )}
                        {history.old_description !== history.new_description && (
                          <p>
                            <span className="text-gray-600">Keterangan:</span>{' '}
                            <span className="line-through">{history.old_description || '-'}</span> →{' '}
                            <span className="font-medium">{history.new_description || '-'}</span>
                          </p>
                        )}
                        {history.change_type === 'created' && (
                          <p className="text-green-600">Transaksi baru dibuat</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Image Viewer */}
        <ImageViewer
          imageUrl={viewingImage}
          isOpen={imageViewerOpen}
          onClose={() => {
            setImageViewerOpen(false);
            setViewingImage(null);
          }}
          title="Bukti Transaksi"
        />
      </div>
    </DashboardLayout>
  );
};

export default CashFlow;
