import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { labaRugiAPI } from '../../utils/api';
import { formatRupiah, formatDate } from '../../utils/formatHelper';
import { getImageUrl } from '../../utils/imageHelper';
import ImageViewer from '../../components/ImageViewer';

const LabaRugi = () => {
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [breakdownData, setBreakdownData] = useState(null);

  // Filters
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [filterType, setFilterType] = useState('month'); // 'month' | 'range' | 'year' | 'all'
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active breakdown tab
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'directCosts' | 'materials' | 'operational'

  // Image viewer
  const [viewingImage, setViewingImage] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  const fetchLabaRugi = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (filterType === 'month') {
        params.month = selectedMonth;
        params.year = selectedYear;
      } else if (filterType === 'year') {
        params.year = selectedYear;
      } else if (filterType === 'range') {
        if (startDate && endDate) {
          params.start_date = startDate;
          params.end_date = endDate;
        }
      }

      const res = await labaRugiAPI.getSummary(params);
      setSummaryData(res.data.summary);
      setBreakdownData(res.data.breakdown);
    } catch (error) {
      console.error('Error fetching laba rugi:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType, selectedMonth, selectedYear, startDate, endDate]);

  useEffect(() => {
    fetchLabaRugi();
  }, [fetchLabaRugi]);

  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const handlePrint = () => {
    window.print();
  };

  const s = summaryData || {
    netSales: 0,
    grossSales: 0,
    totalRefunds: 0,
    orderCount: 0,
    cancelledCount: 0,
    totalDirectCosts: 0,
    directCostCount: 0,
    totalInventoryUsed: 0,
    materialCount: 0,
    totalHPP: 0,
    grossProfit: 0,
    grossMargin: 0,
    totalOperationalExpense: 0,
    opExpenseCount: 0,
    totalBeban: 0,
    labaBersih: 0,
    isProfit: true,
    profitMargin: 0
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <span>📈</span>
              <span>Laporan Laba Rugi (Income Statement)</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Rumus: <strong>Laba = Pendapatan Penjualan - Total Beban (HPP + Biaya Operasional)</strong>
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition"
            >
              <span>🖨️</span>
              <span>Cetak Laporan</span>
            </button>
            <button
              onClick={fetchLabaRugi}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 shadow-sm transition"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setFilterType('month')}
                className={`px-3 py-2 font-medium ${
                  filterType === 'month' ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setFilterType('year')}
                className={`px-3 py-2 font-medium ${
                  filterType === 'year' ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Tahunan
              </button>
              <button
                type="button"
                onClick={() => setFilterType('range')}
                className={`px-3 py-2 font-medium ${
                  filterType === 'range' ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Kustom Rentang
              </button>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-2 font-medium ${
                  filterType === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Semua
              </button>
            </div>

            {filterType === 'month' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filterType === 'year' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            )}

            {filterType === 'range' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-gray-500">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pendapatan Bersih */}
          <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-emerald-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-gray-600 text-xs font-semibold uppercase tracking-wider">
                <span>Pendapatan Penjualan</span>
                <span className="text-emerald-600 text-lg">💰</span>
              </div>
              <div className="text-2xl font-extrabold text-gray-900 mt-2">
                Rp {formatRupiah(s.netSales)}
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500 flex justify-between border-t border-gray-100 pt-2">
              <span>{s.orderCount} pesanan selesai</span>
              {s.totalRefunds > 0 && (
                <span className="text-red-500 font-medium">Refund: -Rp {formatRupiah(s.totalRefunds)}</span>
              )}
            </div>
          </div>

          {/* Card 2: Total HPP */}
          <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-amber-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-gray-600 text-xs font-semibold uppercase tracking-wider">
                <span>Total HPP (Beban Pokok)</span>
                <span className="text-amber-600 text-lg">📦</span>
              </div>
              <div className="text-2xl font-extrabold text-gray-900 mt-2">
                Rp {formatRupiah(s.totalHPP)}
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500 flex justify-between border-t border-gray-100 pt-2">
              <span>Modal: Rp {formatRupiah(s.totalDirectCosts)}</span>
              <span>Bahan: Rp {formatRupiah(s.totalInventoryUsed)}</span>
            </div>
          </div>

          {/* Card 3: Biaya Operasional */}
          <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-gray-600 text-xs font-semibold uppercase tracking-wider">
                <span>Biaya Operasional</span>
                <span className="text-blue-600 text-lg">⚙️</span>
              </div>
              <div className="text-2xl font-extrabold text-gray-900 mt-2">
                Rp {formatRupiah(s.totalOperationalExpense)}
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500 flex justify-between border-t border-gray-100 pt-2">
              <span>{s.opExpenseCount} transaksi arus kas</span>
              <span>Arus Kas Operasi</span>
            </div>
          </div>

          {/* Card 4: Laba Bersih */}
          <div className={`rounded-xl shadow-md p-5 border-l-4 flex flex-col justify-between ${
            s.isProfit ? 'bg-gradient-to-br from-white to-emerald-50 border-emerald-600' : 'bg-gradient-to-br from-white to-red-50 border-red-600'
          }`}>
            <div>
              <div className="flex items-center justify-between text-gray-700 text-xs font-semibold uppercase tracking-wider">
                <span>Laba / (Rugi) Bersih</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  s.isProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {s.isProfit ? 'PROFIT / UNTUNG' : 'DEFISIT / RUGI'}
                </span>
              </div>
              <div className={`text-2xl font-black mt-2 ${s.isProfit ? 'text-emerald-700' : 'text-red-700'}`}>
                {s.labaBersih < 0 ? `-Rp ${formatRupiah(Math.abs(s.labaBersih))}` : `Rp ${formatRupiah(s.labaBersih)}`}
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600 flex justify-between border-t border-gray-200/60 pt-2 font-medium">
              <span>Margin Laba: {s.profitMargin.toFixed(1)}%</span>
              <span>Laba Kotor: Rp {formatRupiah(s.grossProfit)}</span>
            </div>
          </div>
        </div>

        {/* Laba Rugi Statement Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 text-white flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-wide">RINGKASAN LAPORAN LABA RUGI</h2>
              <p className="text-xs text-gray-300">
                Al Hakim Catering • Periode: {filterType === 'month' ? `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}` : filterType === 'year' ? `Tahun ${selectedYear}` : filterType === 'range' ? `${startDate || '-'} s/d ${endDate || '-'}` : 'Semua Periode'}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                s.isProfit ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {s.isProfit ? 'Status: Untung' : 'Status: Rugi'}
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* I. PENDAPATAN */}
              <div className="border rounded-xl p-4 bg-gray-50/70">
                <div className="flex justify-between items-center pb-2 border-b border-gray-300 text-sm font-bold text-gray-900">
                  <span className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">1</span>
                    <span>PENDAPATAN USAHA (PENJUALAN)</span>
                  </span>
                  <span className="text-emerald-700">Rp {formatRupiah(s.netSales)}</span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-gray-700 pl-8">
                  <div className="flex justify-between">
                    <span>Penjualan Pesanan Kotor ({s.orderCount} pesanan)</span>
                    <span className="font-medium text-gray-900">Rp {formatRupiah(s.grossSales)}</span>
                  </div>
                  {s.totalRefunds > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Dikurangi: Pengembalian Dana / Pembatalan ({s.cancelledCount} pesanan)</span>
                      <span className="font-medium">(Rp {formatRupiah(s.totalRefunds)})</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>= Pendapatan Penjualan Bersih</span>
                    <span className="text-emerald-700">Rp {formatRupiah(s.netSales)}</span>
                  </div>
                </div>
              </div>

              {/* II. BEBAN POKOK PENJUALAN (HPP) */}
              <div className="border rounded-xl p-4 bg-gray-50/70">
                <div className="flex justify-between items-center pb-2 border-b border-gray-300 text-sm font-bold text-gray-900">
                  <span className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs">2</span>
                    <span>BEBAN POKOK PENJUALAN (HPP)</span>
                  </span>
                  <span className="text-amber-700">(Rp {formatRupiah(s.totalHPP)})</span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-gray-700 pl-8">
                  <div className="flex justify-between">
                    <span>HPP Modal Langsung Pesanan (Belanja modal khusus, {s.directCostCount} transaksi)</span>
                    <span className="font-medium text-gray-900">Rp {formatRupiah(s.totalDirectCosts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bahan Persediaan Terpakai (Bahan baku dapur, {s.materialCount} item)</span>
                    <span className="font-medium text-gray-900">Rp {formatRupiah(s.totalInventoryUsed)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>= Total Harga Pokok Penjualan (HPP)</span>
                    <span className="text-amber-700">(Rp {formatRupiah(s.totalHPP)})</span>
                  </div>
                </div>
              </div>

              {/* LABA KOTOR */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex justify-between items-center text-base font-bold text-amber-950">
                <div className="flex items-center space-x-2">
                  <span>✨</span>
                  <span>LABA KOTOR (GROSS PROFIT = PENDAPATAN - HPP)</span>
                </div>
                <div className="text-right">
                  <span className="text-lg text-amber-900 block">Rp {formatRupiah(s.grossProfit)}</span>
                  <span className="text-xs font-normal text-amber-700">Margin Kotor: {s.grossMargin.toFixed(1)}%</span>
                </div>
              </div>

              {/* III. BIAYA OPERASIONAL */}
              <div className="border rounded-xl p-4 bg-gray-50/70">
                <div className="flex justify-between items-center pb-2 border-b border-gray-300 text-sm font-bold text-gray-900">
                  <span className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs">3</span>
                    <span>BIAYA OPERASIONAL (ARUS KAS: OPERASI)</span>
                  </span>
                  <span className="text-blue-700">(Rp {formatRupiah(s.totalOperationalExpense)})</span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-gray-700 pl-8">
                  <div className="flex justify-between">
                    <span>Pengeluaran Operasional Usaha ({s.opExpenseCount} transaksi arus kas)</span>
                    <span className="font-medium text-gray-900">Rp {formatRupiah(s.totalOperationalExpense)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>= Total Biaya Operasional</span>
                    <span className="text-blue-700">(Rp {formatRupiah(s.totalOperationalExpense)})</span>
                  </div>
                </div>
              </div>

              {/* IV. TOTAL BEBAN */}
              <div className="border-t border-b border-gray-300 py-3 flex justify-between items-center text-sm font-bold text-gray-900">
                <span>TOTAL SELURUH BEBAN (HPP + BIAYA OPERASIONAL):</span>
                <span className="text-red-600 font-extrabold text-base">Rp {formatRupiah(s.totalBeban)}</span>
              </div>

              {/* FINAL: LABA BERSIH */}
              <div className={`rounded-xl p-5 border-2 flex justify-between items-center ${
                s.isProfit ? 'bg-emerald-50 border-emerald-500 text-emerald-950' : 'bg-red-50 border-red-500 text-red-950'
              }`}>
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-wider block opacity-80">
                    HASIL AKHIR PERHITUNGAN
                  </span>
                  <h3 className="text-xl font-black">
                    {s.isProfit ? 'LABA BERSIH (NET PROFIT)' : 'RUGI BERSIH (NET LOSS)'}
                  </h3>
                  <p className="text-xs mt-1">
                    Margin Laba Bersih: <strong>{s.profitMargin.toFixed(1)}%</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-3xl font-black tracking-tight ${
                    s.isProfit ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {s.labaBersih < 0 ? `-Rp ${formatRupiah(Math.abs(s.labaBersih))}` : `Rp ${formatRupiah(s.labaBersih)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drilldown Details Tabs */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === 'orders' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              📋 Rincian Pesanan Penjualan ({breakdownData?.orders?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('directCosts')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === 'directCosts' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              💵 Modal Langsung (HPP Bahan) ({breakdownData?.directCosts?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === 'materials' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              🥬 Bahan Baku Persediaan Terpakai ({breakdownData?.materialsUsed?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('operational')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === 'operational' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              ⚙️ Biaya Operasional Arus Kas ({breakdownData?.operationalExpenses?.length || 0})
            </button>
          </div>

          <div className="p-4 overflow-x-auto">
            {/* Orders Breakdown */}
            {activeTab === 'orders' && (
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase font-bold">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Pelanggan / Acara</th>
                    <th className="p-3">Metode Bayar</th>
                    <th className="p-3">Status Bayar</th>
                    <th className="p-3">Status Pesanan</th>
                    <th className="p-3 text-right">Nilai Pesanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(!breakdownData?.orders || breakdownData.orders.length === 0) ? (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-gray-400">
                        Tidak ada transaksi pesanan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    breakdownData.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono font-bold text-gray-900">#{o.id}</td>
                        <td className="p-3 text-gray-600">{formatDate(o.created_at)}</td>
                        <td className="p-3">
                          <div className="font-semibold text-gray-900">{o.customer_name}</div>
                          {o.event_name && <div className="text-gray-500 text-[11px]">{o.event_name}</div>}
                        </td>
                        <td className="p-3 uppercase font-medium text-gray-700">{o.payment_method}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            o.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {o.payment_status}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800">
                            {o.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-gray-900">
                          Rp {formatRupiah(o.final_amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Direct Costs Breakdown */}
            {activeTab === 'directCosts' && (
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase font-bold">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Pesanan</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Keterangan Biaya</th>
                    <th className="p-3 text-center">Bukti Foto Nota</th>
                    <th className="p-3">Dicatat Oleh</th>
                    <th className="p-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(!breakdownData?.directCosts || breakdownData.directCosts.length === 0) ? (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-gray-400">
                        Tidak ada biaya modal langsung pesanan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    breakdownData.directCosts.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-gray-500">#{c.id}</td>
                        <td className="p-3 font-bold text-primary-700">Pesanan #{c.order_id}</td>
                        <td className="p-3 text-gray-600">{formatDate(c.created_at)}</td>
                        <td className="p-3 font-medium text-gray-900">{c.description}</td>
                        <td className="p-3 text-center">
                          {c.proof_image_url ? (
                            <button
                              type="button"
                              onClick={() => {
                                setViewingImage(getImageUrl(c.proof_image_url));
                                setImageViewerOpen(true);
                              }}
                              className="text-primary-600 hover:text-primary-800 font-semibold underline"
                            >
                              Lihat Nota
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-500">{c.created_by_name || 'Admin'}</td>
                        <td className="p-3 text-right font-bold text-gray-900">
                          Rp {formatRupiah(c.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Materials Breakdown */}
            {activeTab === 'materials' && (
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase font-bold">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Pesanan</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Bahan Baku</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3 text-center">Jumlah</th>
                    <th className="p-3 text-right">Harga Satuan</th>
                    <th className="p-3 text-right">Subtotal HPP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(!breakdownData?.materialsUsed || breakdownData.materialsUsed.length === 0) ? (
                    <tr>
                      <td colSpan="8" className="text-center py-6 text-gray-400">
                        Tidak ada bahan baku persediaan terpakai pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    breakdownData.materialsUsed.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-gray-500">#{m.id}</td>
                        <td className="p-3 font-bold text-primary-700">Pesanan #{m.order_id}</td>
                        <td className="p-3 text-gray-600">{formatDate(m.created_at)}</td>
                        <td className="p-3 font-semibold text-gray-900">{m.item_name}</td>
                        <td className="p-3 text-gray-600">{m.category || '-'}</td>
                        <td className="p-3 text-center font-medium">
                          {m.quantity} {m.unit}
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          Rp {formatRupiah(m.unit_price)}
                        </td>
                        <td className="p-3 text-right font-bold text-gray-900">
                          Rp {formatRupiah(m.subtotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Operational Expenses Breakdown */}
            {activeTab === 'operational' && (
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase font-bold">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Keterangan Biaya</th>
                    <th className="p-3">Kategori / Akun</th>
                    <th className="p-3">Dicatat Oleh</th>
                    <th className="p-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(!breakdownData?.operationalExpenses || breakdownData.operationalExpenses.length === 0) ? (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-gray-400">
                        Tidak ada beban operasional arus kas pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    breakdownData.operationalExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-gray-500">#{exp.id}</td>
                        <td className="p-3 text-gray-600">{formatDate(exp.created_at)}</td>
                        <td className="p-3 font-medium text-gray-900">{exp.description}</td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {exp.sub_category || 'Biaya operasional'}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500">{exp.created_by_name || 'Admin'}</td>
                        <td className="p-3 text-right font-bold text-red-600">
                          Rp {formatRupiah(exp.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      <ImageViewer
        imageUrl={viewingImage}
        isOpen={imageViewerOpen}
        onClose={() => {
          setImageViewerOpen(false);
          setViewingImage(null);
        }}
        title="Bukti Nota Pengeluaran"
      />
    </DashboardLayout>
  );
};

export default LabaRugi;
