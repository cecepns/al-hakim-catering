import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { purchaseRequestAPI, inventoryAPI } from '../../utils/api';
import { formatDate } from '../../utils/formatHelper';

const PurchaseRequests = ({ role = 'admin' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterApproval, setFilterApproval] = useState('');
  const [filterReceipt, setFilterReceipt] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    category: '',
    category_mode: 'select', // 'select' | 'custom'
    item_name: '',
    item_mode: 'select', // 'select' | 'custom'
    inventory_item_id: null,
    specification: '',
    qty: '',
    unit: 'Pcs',
    needed_date: '',
    reason: '',
    priority: 'Normal'
  });
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Admin Approval Modal
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalForm, setApprovalForm] = useState({
    approval_status: 'Disetujui',
    approval_notes: ''
  });
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Receipt Modal (Update Penerimaan)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    receipt_status: 'Diterima',
    receipt_notes: ''
  });
  const [submittingReceipt, setSubmittingReceipt] = useState(false);

  // Load Categories & Items
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [catRes, itemRes] = await Promise.all([
          inventoryAPI.getCategories(),
          inventoryAPI.getItems()
        ]);
        setCategories(catRes.data || []);
        setInventoryItems(itemRes.data || []);
      } catch (err) {
        console.error('Error loading masters:', err);
      }
    };
    loadMasters();
  }, []);

  // Check query params if navigated with auto item
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const autoCat = params.get('category');
    const autoItem = params.get('item_name');
    const autoUnit = params.get('unit');
    const autoItemId = params.get('auto_item_id');

    if (autoItem) {
      setForm((prev) => ({
        ...prev,
        category: autoCat || '',
        category_mode: 'select',
        item_name: autoItem,
        item_mode: 'select',
        inventory_item_id: autoItemId || null,
        unit: autoUnit || 'Pcs'
      }));
      setCreateModalOpen(true);
    }
  }, [location.search]);

  // Fetch Requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterApproval) params.approval_status = filterApproval;
      if (filterReceipt) params.receipt_status = filterReceipt;
      if (filterPriority) params.priority = filterPriority;

      const res = await purchaseRequestAPI.getAll(params);
      setRequests(res.data?.requests || res.data || []);
    } catch (err) {
      console.error('Error fetching purchase requests:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterApproval, filterReceipt, filterPriority]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Handle Create Request
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.category || !form.item_name || !form.qty) {
      alert('Kategori, nama barang, dan jumlah wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      await purchaseRequestAPI.create({
        category: form.category,
        item_name: form.item_name,
        inventory_item_id: form.inventory_item_id || null,
        specification: form.specification,
        qty: parseFloat(form.qty),
        unit: form.unit,
        needed_date: form.needed_date || null,
        reason: form.reason,
        priority: form.priority
      });

      alert('Pengajuan pembelian berhasil dibuat');
      setCreateModalOpen(false);
      setForm({
        category: '',
        category_mode: 'select',
        item_name: '',
        item_mode: 'select',
        inventory_item_id: null,
        specification: '',
        qty: '',
        unit: 'Pcs',
        needed_date: '',
        reason: '',
        priority: 'Normal'
      });
      fetchRequests();
    } catch (err) {
      console.error('Error creating purchase request:', err);
      alert(err.response?.data?.message || 'Gagal membuat pengajuan pembelian');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Admin Approval Submit
  const handleSaveApproval = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      setSubmittingApproval(true);
      await purchaseRequestAPI.updateApproval(selectedRequest.id, {
        approval_status: approvalForm.approval_status,
        approval_notes: approvalForm.approval_notes
      });
      alert('Status persetujuan pengajuan berhasil diperbarui');
      setApprovalModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      console.error('Error updating approval:', err);
      alert(err.response?.data?.message || 'Gagal mengupdate approval');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Handle Update Receipt
  const handleSaveReceipt = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      setSubmittingReceipt(true);
      await purchaseRequestAPI.updateReceipt(selectedRequest.id, {
        receipt_status: receiptForm.receipt_status,
        receipt_notes: receiptForm.receipt_notes
      });
      alert('Status penerimaan barang berhasil diperbarui');
      setReceiptModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      console.error('Error updating receipt:', err);
      alert(err.response?.data?.message || 'Gagal mengupdate penerimaan');
    } finally {
      setSubmittingReceipt(false);
    }
  };

  // Admin Click "Order" -> Navigates to Purchases with prefilled data
  const handleOrder = (req) => {
    navigate(`/admin/purchases?from_request_id=${req.id}&request_no=${encodeURIComponent(req.request_no)}&category=${encodeURIComponent(req.category)}&item_name=${encodeURIComponent(req.item_name)}&qty=${req.qty}&unit=${encodeURIComponent(req.unit)}&spec=${encodeURIComponent(req.specification || '')}`);
  };

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <span>📋</span>
              <span>Pengajuan Pembelian Barang & Bahan</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Pengajuan kebutuhan dapur/operasional, persetujuan admin, dan konfirmasi penerimaan barang
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 shadow-sm transition"
          >
            <span>➕</span>
            <span>Buat Pengajuan Baru</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari no pengajuan / barang..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <span className="absolute left-3 top-2 text-gray-400 text-xs">🔍</span>
            </div>

            {/* Approval Filter */}
            <select
              value={filterApproval}
              onChange={(e) => setFilterApproval(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Semua Approval</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Ditolak">Ditolak</option>
              <option value="Ditunda">Ditunda</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>

            {/* Receipt Filter */}
            <select
              value={filterReceipt}
              onChange={(e) => setFilterReceipt(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Semua Penerimaan</option>
              <option value="Belum Diterima">Belum Diterima</option>
              <option value="Diterima Sebagian">Diterima Sebagian</option>
              <option value="Diterima">Diterima</option>
              <option value="Ditolak">Ditolak</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Semua Prioritas</option>
              <option value="Normal">Normal</option>
              <option value="Penting">Penting</option>
              <option value="Mendesak">Mendesak</option>
            </select>
          </div>

          <div className="text-xs text-gray-500">
            Total: <strong>{requests.length}</strong> pengajuan
          </div>
        </div>

        {/* Table Sesuai PDF Page 5 */}
        {/* No. Pengajuan | Nama Barang | QTY & Satuan | Tanggal Kebutuhan | Prioritas | Status Pengajuan | Status Penerimaan | Tombol Detail */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">No. Pengajuan</th>
                  <th className="px-4 py-3">Nama Barang</th>
                  <th className="px-4 py-3 text-center">QTY & Satuan</th>
                  <th className="px-4 py-3 text-center">Tgl Kebutuhan</th>
                  <th className="px-4 py-3 text-center">Prioritas</th>
                  <th className="px-4 py-3 text-center">Status Pengajuan</th>
                  <th className="px-4 py-3 text-center">Status Penerimaan</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">
                      Memuat daftar pengajuan...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-400">
                      Belum ada pengajuan pembelian.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => {
                    const isApproved = req.approval_status === 'Disetujui';
                    return (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-900">
                          {req.request_no}
                          <div className="text-[10px] font-normal text-gray-500">{formatDate(req.request_date)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{req.item_name}</div>
                          <span className="text-[11px] text-gray-500">Kategori: {req.category}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">
                          {parseFloat(req.qty)} {req.unit}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-700">
                          {req.needed_date ? formatDate(req.needed_date) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.priority === 'Mendesak'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : req.priority === 'Penting'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {req.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                            req.approval_status === 'Disetujui'
                              ? 'bg-green-100 text-green-800'
                              : req.approval_status === 'Ditolak'
                              ? 'bg-red-100 text-red-800'
                              : req.approval_status === 'Ditunda'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {req.approval_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            req.receipt_status === 'Diterima'
                              ? 'bg-emerald-100 text-emerald-800 font-bold'
                              : req.receipt_status === 'Diterima Sebagian'
                              ? 'bg-amber-100 text-amber-800 font-medium'
                              : req.receipt_status === 'Ditolak'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {req.receipt_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Tombol Detail (Semua informasi muncul) */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRequest(req);
                                setDetailModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded shadow-sm"
                            >
                              Detail
                            </button>

                            {/* Tombol Approval & Order (Admin Only) */}
                            {role === 'admin' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setApprovalForm({
                                      approval_status: req.approval_status === 'Menunggu' ? 'Disetujui' : req.approval_status,
                                      approval_notes: req.approval_notes || ''
                                    });
                                    setApprovalModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm"
                                  title="Ubah Status Approval"
                                >
                                  Approval
                                </button>

                                {isApproved && (
                                  <button
                                    type="button"
                                    onClick={() => handleOrder(req)}
                                    className="px-2.5 py-1 text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white rounded shadow-sm flex items-center space-x-1"
                                    title="Lanjut ke fitur Pembelian"
                                  >
                                    <span>🛒</span>
                                    <span>Order</span>
                                  </button>
                                )}
                              </>
                            )}

                            {/* Tombol Update Penerimaan */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRequest(req);
                                setReceiptForm({
                                  receipt_status: req.receipt_status === 'Belum Diterima' ? 'Diterima' : req.receipt_status,
                                  receipt_notes: req.receipt_notes || ''
                                });
                                setReceiptModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-300 rounded"
                              title="Update Penerimaan Barang"
                            >
                              Terima
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: BUAT PENGAJUAN PEMBELIAN */}
      {/* Sesuai spesifikasi PDF Page 4: */}
      {/* Kategori: ^ (pilihan daftar / esai) */}
      {/* Nama barang: ^ (pilihan daftar / esai) */}
      {/* Satuan: Pcs/Kilo/Liter/Dus */}
      {/* Prioritas: Normal/Penting/Mendesak */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <span>📝</span>
              <span>Formulir Pengajuan Pembelian Barang</span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Kategori Barang (^ bisa pilih / esai) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">
                    Kategori Barang <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      category_mode: form.category_mode === 'select' ? 'custom' : 'select',
                      category: ''
                    })}
                    className="text-[11px] text-primary-600 hover:underline"
                  >
                    {form.category_mode === 'select' ? '+ Ketik Kategori Baru (Esai)' : '← Pilih dari Daftar'}
                  </button>
                </div>
                {form.category_mode === 'select' ? (
                  <select
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Ketik kategori baru..."
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                )}
              </div>

              {/* Nama Barang (^ bisa pilih / esai) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">
                    Nama Barang <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      item_mode: form.item_mode === 'select' ? 'custom' : 'select',
                      item_name: '',
                      inventory_item_id: null
                    })}
                    className="text-[11px] text-primary-600 hover:underline"
                  >
                    {form.item_mode === 'select' ? '+ Ketik Barang Baru (Esai)' : '← Pilih dari Persediaan'}
                  </button>
                </div>
                {form.item_mode === 'select' ? (
                  <select
                    required
                    value={form.item_name}
                    onChange={(e) => {
                      const selected = inventoryItems.find((i) => i.name === e.target.value);
                      setForm({
                        ...form,
                        item_name: e.target.value,
                        category: selected ? selected.category : form.category,
                        unit: selected ? selected.unit : form.unit,
                        inventory_item_id: selected ? selected.id : null
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">-- Pilih Barang dari Master --</option>
                    {inventoryItems.map((it) => (
                      <option key={it.id} value={it.name}>
                        {it.name} ({it.category}) - Stok saat ini: {it.stock} {it.unit}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Ketik nama barang baru..."
                    value={form.item_name}
                    onChange={(e) => setForm({ ...form, item_name: e.target.value, inventory_item_id: null })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                )}
              </div>

              {/* Spesifikasi */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Spesifikasi Barang
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Merek SunCo, Kemasan 2L, Daging bagian paha"
                  value={form.specification}
                  onChange={(e) => setForm({ ...form, specification: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* QTY & Satuan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    QTY (Jumlah) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    placeholder="0"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Kilo">Kilo</option>
                    <option value="Liter">Liter</option>
                    <option value="Dus">Dus</option>
                    <option value="Pack">Pack</option>
                    <option value="Lembar">Lembar</option>
                    <option value="Gram">Gram</option>
                  </select>
                </div>
              </div>

              {/* Tgl Kebutuhan & Prioritas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tgl. Kebutuhan
                  </label>
                  <input
                    type="date"
                    value={form.needed_date}
                    onChange={(e) => setForm({ ...form, needed_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Prioritas <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Penting">Penting</option>
                    <option value="Mendesak">Mendesak</option>
                  </select>
                </div>
              </div>

              {/* Alasan */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Alasan Kebutuhan
                </label>
                <textarea
                  rows="2"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Contoh: Stok beras dapur sudah di bawah stok minimum untuk pesanan besok..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:bg-gray-400"
                >
                  {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAIL PENGAJUAN (Semua Informasi Muncul sesuai PDF Page 5) */}
      {detailModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-gray-200 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Detail Pengajuan Pembelian</h3>
                <p className="text-xs text-primary-700 font-mono font-bold mt-0.5">{selectedRequest.request_no}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg">
                <div>
                  <span className="text-xs text-gray-500 block">Tgl Pengajuan</span>
                  <span className="font-semibold text-gray-900">{formatDate(selectedRequest.request_date)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Tgl Kebutuhan</span>
                  <span className="font-semibold text-gray-900">{selectedRequest.needed_date ? formatDate(selectedRequest.needed_date) : '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Pemohon</span>
                  <span className="font-medium text-gray-900">{selectedRequest.created_by_name || '-'} ({selectedRequest.created_role || 'dapur'})</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Prioritas</span>
                  <span className="font-bold text-gray-900">{selectedRequest.priority}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Informasi Barang</h4>
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama Barang:</span>
                    <span className="font-bold text-gray-900">{selectedRequest.item_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kategori:</span>
                    <span className="font-medium text-gray-800">{selectedRequest.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">QTY & Satuan:</span>
                    <span className="font-bold text-primary-700">{parseFloat(selectedRequest.qty)} {selectedRequest.unit}</span>
                  </div>
                  {selectedRequest.specification && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Spesifikasi:</span>
                      <span className="text-gray-900">{selectedRequest.specification}</span>
                    </div>
                  )}
                  {selectedRequest.reason && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-gray-600 block text-xs">Alasan:</span>
                      <p className="text-gray-800 italic mt-0.5">{selectedRequest.reason}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Status & Persetujuan</h4>
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status Pengajuan:</span>
                    <span className="font-bold text-primary-800">{selectedRequest.approval_status}</span>
                  </div>
                  {selectedRequest.approved_by_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Diproses Oleh:</span>
                      <span className="text-gray-900">{selectedRequest.approved_by_name}</span>
                    </div>
                  )}
                  {selectedRequest.approval_notes && (
                    <div>
                      <span className="text-gray-600 text-xs block">Catatan Approval:</span>
                      <p className="text-gray-800 bg-amber-50 p-2 rounded text-xs mt-1 border border-amber-200">
                        {selectedRequest.approval_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Penerimaan Barang</h4>
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status Penerimaan:</span>
                    <span className="font-bold text-emerald-700">{selectedRequest.receipt_status}</span>
                  </div>
                  {selectedRequest.receipt_notes && (
                    <div>
                      <span className="text-gray-600 text-xs block">Catatan Penerimaan:</span>
                      <p className="text-gray-800 bg-emerald-50 p-2 rounded text-xs mt-1 border border-emerald-200">
                        {selectedRequest.receipt_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: APPROVAL (Admin) */}
      {approvalModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Persetujuan Pengajuan Pembelian</h3>
            <p className="text-xs text-gray-500 mb-4 font-mono">{selectedRequest.request_no} - {selectedRequest.item_name}</p>

            <form onSubmit={handleSaveApproval} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status Pengajuan <span className="text-red-500">*</span>
                </label>
                <select
                  value={approvalForm.approval_status}
                  onChange={(e) => setApprovalForm({ ...approvalForm, approval_status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="Disetujui">Disetujui</option>
                  <option value="Ditolak">Ditolak</option>
                  <option value="Ditunda">Ditunda</option>
                  <option value="Menunggu">Menunggu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Catatan Approval
                </label>
                <textarea
                  rows="3"
                  value={approvalForm.approval_notes}
                  onChange={(e) => setApprovalForm({ ...approvalForm, approval_notes: e.target.value })}
                  placeholder="Masukkan catatan alasan persetujuan / penolakan..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovalModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingApproval}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:bg-gray-400"
                >
                  {submittingApproval ? 'Menyimpan...' : 'Simpan Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PENERIMAAN BARANG */}
      {receiptModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Update Penerimaan Barang</h3>
            <p className="text-xs text-gray-500 mb-4 font-mono">{selectedRequest.request_no} - {selectedRequest.item_name}</p>

            <form onSubmit={handleSaveReceipt} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status Penerimaan <span className="text-red-500">*</span>
                </label>
                <select
                  value={receiptForm.receipt_status}
                  onChange={(e) => setReceiptForm({ ...receiptForm, receipt_status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="Diterima">Diterima (Semua)</option>
                  <option value="Diterima Sebagian">Diterima Sebagian</option>
                  <option value="Ditolak">Ditolak / Barang Rusak</option>
                  <option value="Belum Diterima">Belum Diterima</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Catatan Penerimaan
                </label>
                <textarea
                  rows="3"
                  value={receiptForm.receipt_notes}
                  onChange={(e) => setReceiptForm({ ...receiptForm, receipt_notes: e.target.value })}
                  placeholder="Contoh: Barang diterima lengkap dengan kualitas baik..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-900">
                💡 <em>Catatan Sesuai PDF: Apabila status diubah menjadi <strong>Diterima</strong>, stok barang di sistem akan otomatis bertambah pada master persediaan dan kartu stok.</em>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReceiptModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReceipt}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:bg-gray-400"
                >
                  {submittingReceipt ? 'Memproses...' : 'Simpan Penerimaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PurchaseRequests;
