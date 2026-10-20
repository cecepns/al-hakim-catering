import { useEffect, useState } from 'react';
import { neracaAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const Neraca = () => {
  const [activeTab, setActiveTab] = useState('neraca'); // 'neraca' | 'jurnal'
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    debitList: [],
    creditList: [],
    totalDebit: 0,
    totalCredit: 0,
    isBalanced: true,
    difference: 0
  });

  const [journalEntries, setJournalEntries] = useState([]);
  const [journalPagination, setJournalPagination] = useState({ total: 0, limit: 15, totalPages: 1 });
  const [journalPage, setJournalPage] = useState(1);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterRefType, setFilterRefType] = useState('all');

  // Manual Journal Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    debit_account: '',
    credit_account: '',
    amount: ''
  });
  const [accounts, setAccounts] = useState({ debitAccounts: [], creditAccounts: [] });

  const fetchAccounts = async () => {
    try {
      const res = await neracaAPI.getAccounts();
      setAccounts(res.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await neracaAPI.getSummary(params);
      setSummary(res.data);
    } catch (error) {
      console.error('Error fetching neraca summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJournal = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 15,
        offset: (journalPage - 1) * 15
      };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (filterRefType !== 'all') params.reference_type = filterRefType;

      const res = await neracaAPI.getJournal(params);
      setJournalEntries(res.data.entries || []);
      setJournalPagination(res.data.pagination || { total: 0, limit: 15, totalPages: 1 });
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === 'neraca') {
      fetchSummary();
    } else {
      fetchJournal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, startDate, endDate, filterRefType, journalPage]);

  const handleCreateManual = async (e) => {
    e.preventDefault();
    try {
      await neracaAPI.createJournal(manualForm);
      alert('Jurnal manual berhasil ditambahkan');
      setModalOpen(false);
      setManualForm({
        entry_date: new Date().toISOString().split('T')[0],
        description: '',
        debit_account: '',
        credit_account: '',
        amount: ''
      });
      if (activeTab === 'neraca') {
        fetchSummary();
      } else {
        fetchJournal();
      }
    } catch (error) {
      console.error('Error creating journal:', error);
      alert(error.response?.data?.message || 'Gagal menyimpan jurnal');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan Neraca Keuangan</h1>
            <p className="text-sm text-gray-500 mt-1">
              Persamaan Akuntansi: <span className="font-semibold text-gray-700">Aset = Utang + Modal</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Input Jurnal Penyesuaian
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Cetak Neraca
            </button>
          </div>
        </div>

        {/* Tab Selector & Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-lg w-full md:w-auto">
              <button
                onClick={() => setActiveTab('neraca')}
                className={`flex-1 md:flex-initial px-5 py-2 text-sm font-medium rounded-md transition ${
                  activeTab === 'neraca'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tabel Neraca (Saldo Total)
              </button>
              <button
                onClick={() => setActiveTab('jurnal')}
                className={`flex-1 md:flex-initial px-5 py-2 text-sm font-medium rounded-md transition ${
                  activeTab === 'jurnal'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Buku Jurnal Transaksi
              </button>
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Dari:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-xs text-red-600 hover:text-red-800 font-medium underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Balance Status Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Debet</span>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              Rp {formatRupiah(summary.totalDebit || 0)}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Kredit</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              Rp {formatRupiah(summary.totalCredit || 0)}
            </p>
          </div>
          <div className={`p-5 rounded-xl border shadow-sm ${
            summary.isBalanced ? 'bg-green-50 border-green-200 text-green-900' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <span className="text-xs font-semibold uppercase tracking-wider">Status Neraca</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-3 h-3 rounded-full ${summary.isBalanced ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="text-xl font-bold">
                {summary.isBalanced ? 'SEIMBANG (BALANCED)' : `SELISIH: Rp ${formatRupiah(Math.abs(summary.difference || 0))}`}
              </p>
            </div>
          </div>
        </div>

        {/* TAB 1: Neraca Summary Table */}
        {activeTab === 'neraca' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Title Header like in example */}
            <div className="text-center py-6 px-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-bold tracking-wide text-gray-900 uppercase">NERACA</h2>
              <p className="text-sm font-semibold text-gray-700 mt-1">AL HAKIM CATERING</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {endDate ? `Per ${new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : `Per ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-3">Memuat data neraca...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-6 text-left border-r border-gray-300 w-1/2">PERKIRAAN / AKUN</th>
                      <th className="py-3 px-6 text-right border-r border-gray-300 w-1/4">DEBET (Rp)</th>
                      <th className="py-3 px-6 text-right w-1/4">KREDIT (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {/* Header Group: DEBIT ACCOUNTS (ASET & BEBAN) */}
                    <tr className="bg-blue-50 font-semibold text-blue-900">
                      <td colSpan={3} className="py-2 px-6 text-xs uppercase tracking-wider">
                        Akun-Akun Debet (Aset, Beban, Pengurang)
                      </td>
                    </tr>
                    {summary.debitList && summary.debitList.map((item, idx) => (
                      <tr key={`debit-${idx}`} className="hover:bg-gray-50">
                        <td className="py-3 px-6 text-gray-800 border-r border-gray-200 font-medium">
                          {item.account}
                        </td>
                        <td className="py-3 px-6 text-right border-r border-gray-200 font-mono text-gray-900">
                          {item.amount > 0 ? formatRupiah(item.amount) : '-'}
                        </td>
                        <td className="py-3 px-6 text-right font-mono text-gray-400">
                          -
                        </td>
                      </tr>
                    ))}

                    {/* Header Group: CREDIT ACCOUNTS (UTANG, MODAL, PENDAPATAN) */}
                    <tr className="bg-emerald-50 font-semibold text-emerald-900 border-t-2 border-gray-300">
                      <td colSpan={3} className="py-2 px-6 text-xs uppercase tracking-wider">
                        Akun-Akun Kredit (Utang, Modal, Pendapatan)
                      </td>
                    </tr>
                    {summary.creditList && summary.creditList.map((item, idx) => (
                      <tr key={`credit-${idx}`} className="hover:bg-gray-50">
                        <td className="py-3 px-6 text-gray-800 border-r border-gray-200 font-medium">
                          {item.account}
                        </td>
                        <td className="py-3 px-6 text-right border-r border-gray-200 font-mono text-gray-400">
                          -
                        </td>
                        <td className="py-3 px-6 text-right font-mono text-gray-900">
                          {item.amount > 0 ? formatRupiah(item.amount) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold text-gray-900 border-t-2 border-b-2 border-gray-400 text-sm">
                      <td className="py-4 px-6 uppercase tracking-wider border-r border-gray-300">
                        JUMLAH
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-blue-700 border-r border-gray-300 text-base">
                        Rp {formatRupiah(summary.totalDebit || 0)}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-emerald-700 text-base">
                        Rp {formatRupiah(summary.totalCredit || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Journal Entries */}
        {activeTab === 'jurnal' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Buku Jurnal Akuntansi</h3>
                <p className="text-xs text-gray-500">Catatan kronologis semua mutasi debit dan kredit</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Sumber:</span>
                <select
                  value={filterRefType}
                  onChange={(e) => setFilterRefType(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Semua Sumber</option>
                  <option value="cash_flow">Arus Kas</option>
                  <option value="order">Penjualan Pesanan</option>
                  <option value="purchase">Pembelian</option>
                  <option value="order_cost">Modal HPP Pesanan</option>
                  <option value="manual">Manual / Penyesuaian</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-3">Memuat jurnal...</p>
              </div>
            ) : journalEntries.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-sm">Belum ada transaksi jurnal pada periode ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Keterangan</th>
                      <th className="py-3 px-4">Akun Debet</th>
                      <th className="py-3 px-4">Akun Kredit</th>
                      <th className="py-3 px-4 text-right">Nominal</th>
                      <th className="py-3 px-4">Sumber</th>
                      <th className="py-3 px-4">Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {journalEntries.map((j) => (
                      <tr key={j.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-xs text-gray-600 whitespace-nowrap">
                          {new Date(j.entry_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4 text-gray-900 font-medium max-w-xs truncate">
                          {j.description}
                        </td>
                        <td className="py-3 px-4 text-blue-700 font-medium">
                          {j.debit_account}
                        </td>
                        <td className="py-3 px-4 text-emerald-700 font-medium">
                          {j.credit_account}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900 whitespace-nowrap">
                          Rp {formatRupiah(j.amount)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                            {j.reference_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                          {j.created_by_name || 'System'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {journalPagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Halaman {journalPage} dari {journalPagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setJournalPage((prev) => Math.max(1, prev - 1))}
                    disabled={journalPage === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => setJournalPage((prev) => Math.min(journalPagination.totalPages, prev + 1))}
                    disabled={journalPage === journalPagination.totalPages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Manual Journal Entry */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Input Jurnal Penyesuaian Manual</h3>
              <form onSubmit={handleCreateManual} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={manualForm.entry_date}
                    onChange={(e) => setManualForm({ ...manualForm, entry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                  <input
                    type="text"
                    value={manualForm.description}
                    onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                    placeholder="Contoh: Penyesuaian modal awal / setoran kas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Akun Debet</label>
                  <select
                    value={manualForm.debit_account}
                    onChange={(e) => setManualForm({ ...manualForm, debit_account: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Pilih Akun Debet</option>
                    {accounts.debitAccounts.map((acc) => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Akun Kredit</label>
                  <select
                    value={manualForm.credit_account}
                    onChange={(e) => setManualForm({ ...manualForm, credit_account: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Pilih Akun Kredit</option>
                    {accounts.creditAccounts.map((acc) => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualForm.amount}
                    onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
                  >
                    Simpan Jurnal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Neraca;
