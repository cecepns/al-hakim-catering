import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { purchaseAPI, inventoryAPI, purchaseRequestAPI } from '../../utils/api';
import { formatRupiah, formatDate } from '../../utils/formatHelper';
import { getImageUrl } from '../../utils/imageHelper';
import ImageViewer from '../../components/ImageViewer';

const Purchases = () => {
  const location = useLocation();

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');

  // Create Purchase Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    request_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    supplier: '',
    category: '',
    item_name: '',
    inventory_item_id: null,
    specification: '',
    qty: '',
    unit: 'Pcs',
    total_price: '',
    payment_method: 'Tunai',
    dp_amount: '',
    due_date: '',
    status: 'Dipesan',
    notes: ''
  });
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Status & Return Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status: '',
    notes: '',
    return_amount: '',
    return_qty: '',
    return_notes: ''
  });
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Pay Remaining DP Modal
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [submittingSettle, setSubmittingSettle] = useState(false);

  // Image Viewer
  const [viewingImage, setViewingImage] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  // Load masters & approved requests
  useEffect(() => {
    const loadData = async () => {
      try {
        const [catRes, itemRes, reqRes] = await Promise.all([
          inventoryAPI.getCategories(),
          inventoryAPI.getItems(),
          purchaseRequestAPI.getAll({ approval_status: 'Disetujui' })
        ]);
        setCategories(catRes.data || []);
        setInventoryItems(itemRes.data || []);
        setApprovedRequests(reqRes.data?.requests || reqRes.data || []);
      } catch (err) {
        console.error('Error loading masters for purchases:', err);
      }
    };
    loadData();
  }, []);

  // Handle URL params when coming from Purchase Request "Order" button
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reqId = params.get('from_request_id');
    const reqNo = params.get('request_no');
    const cat = params.get('category');
    const item = params.get('item_name');
    const qty = params.get('qty');
    const unit = params.get('unit');
    const spec = params.get('spec');

    if (reqId || item) {
      setForm((prev) => ({
        ...prev,
        request_id: reqId || '',
        category: cat || '',
        item_name: item || '',
        qty: qty || '',
        unit: unit || 'Pcs',
        specification: spec || '',
        notes: reqNo ? `Dibuat dari Pengajuan ${reqNo}` : ''
      }));
      setCreateModalOpen(true);
    }
  }, [location.search]);

  // Fetch Purchases
  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterPaymentMethod) params.payment_method = filterPaymentMethod;
      if (filterPaymentStatus) params.payment_status = filterPaymentStatus;

      const res = await purchaseAPI.getAll(params);
      setPurchases(res.data?.purchases || res.data || []);
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterPaymentMethod, filterPaymentStatus]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // Handle File change for Invoice Photo
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInvoiceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoicePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Live Unit Price Calculation: Total / Qty
  const computedUnitPrice = (parseFloat(form.total_price) || 0) > 0 && (parseFloat(form.qty) || 0) > 0
    ? (parseFloat(form.total_price) / parseFloat(form.qty))
    : 0;

  // Live DP Remaining Calculation
  const computedRemaining = form.payment_method === 'DP'
    ? Math.max(0, (parseFloat(form.total_price) || 0) - (parseFloat(form.dp_amount) || 0))
    : 0;

  // Handle Create Purchase Submit
  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    if (!form.supplier || !form.category || !form.item_name || !form.qty || !form.total_price) {
      alert('Supplier, kategori, nama barang, jumlah, dan total harga wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('request_id', form.request_id || '');
      formData.append('purchase_date', form.purchase_date);
      formData.append('supplier', form.supplier);
      formData.append('category', form.category);
      formData.append('item_name', form.item_name);
      formData.append('inventory_item_id', form.inventory_item_id || '');
      formData.append('specification', form.specification || '');
      formData.append('qty', form.qty);
      formData.append('unit', form.unit);
      formData.append('total_price', form.total_price);
      formData.append('payment_method', form.payment_method);
      formData.append('dp_amount', form.payment_method === 'DP' ? (form.dp_amount || '0') : '0');
      formData.append('due_date', form.due_date || '');
      formData.append('status', form.status);
      formData.append('notes', form.notes || '');

      if (invoiceFile) {
        formData.append('invoice', invoiceFile);
      }

      await purchaseAPI.create(formData);
      alert('Pembelian berhasil dicatat dan terintegrasi otomatis ke Neraca & Arus Kas');
      setCreateModalOpen(false);
      setInvoiceFile(null);
      setInvoicePreview(null);
      setForm({
        request_id: '',
        purchase_date: new Date().toISOString().split('T')[0],
        supplier: '',
        category: '',
        item_name: '',
        inventory_item_id: null,
        specification: '',
        qty: '',
        unit: 'Pcs',
        total_price: '',
        payment_method: 'Tunai',
        dp_amount: '',
        due_date: '',
        status: 'Dipesan',
        notes: ''
      });
      fetchPurchases();
    } catch (err) {
      console.error('Error creating purchase:', err);
      alert(err.response?.data?.message || 'Gagal menyimpan transaksi pembelian');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Update Status & Return Submit
  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedPurchase) return;

    try {
      setSubmittingStatus(true);
      await purchaseAPI.update(selectedPurchase.id, {
        status: statusForm.status,
        notes: statusForm.notes,
        return_amount: statusForm.return_amount,
        return_qty: statusForm.return_qty,
        return_notes: statusForm.return_notes
      });
      alert('Status pembelian berhasil diperbarui');
      setStatusModalOpen(false);
      setSelectedPurchase(null);
      fetchPurchases();
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.response?.data?.message || 'Gagal memperbarui status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Handle Pay Remaining DP
  const handlePayRemaining = async () => {
    if (!selectedPurchase) return;
    try {
      setSubmittingSettle(true);
      await purchaseAPI.payRemaining(selectedPurchase.id);
      alert('Pelunasan berhasil dicatat. Jurnal Neraca (Utang Usaha -> Kas) dan Arus Kas berhasil diperbarui.');
      setSettleModalOpen(false);
      setSelectedPurchase(null);
      fetchPurchases();
    } catch (err) {
      console.error('Error settling DP:', err);
      alert(err.response?.data?.message || 'Gagal memproses pelunasan DP');
    } finally {
      setSubmittingSettle(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <span>🛒</span>
              <span>Transaksi Pembelian Bahan & Barang (Purchasing)</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Catat pembelian, nota belanja, pelunasan DP, dan return (Otomatis masuk Neraca & Arus Kas)
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 shadow-sm transition"
          >
            <span>➕</span>
            <span>Catat Pembelian Baru</span>
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
                placeholder="Cari PO / barang / supplier..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <span className="absolute left-3 top-2 text-gray-400 text-xs">🔍</span>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Semua Status Order</option>
              <option value="Dipesan">Dipesan</option>
              <option value="Belanja">Belanja</option>
              <option value="Diterima">Diterima</option>
              <option value="Direturn">Direturn</option>
              <option value="Dibatalkan">Dibatalkan</option>
              <option value="Selesai">Selesai</option>
            </select>

            {/* Payment Method Filter */}
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Semua Metode Bayar</option>
              <option value="Tunai">Tunai</option>
              <option value="Transfer">Transfer</option>
              <option value="DP">DP (Uang Muka)</option>
            </select>

            {/* Payment Status Filter */}
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Semua Status Bayar</option>
              <option value="paid">Lunas</option>
              <option value="partial">Sebagian (DP)</option>
              <option value="unpaid">Belum Lunas</option>
            </select>
          </div>

          <div className="text-xs text-gray-500">
            Total: <strong>{purchases.length}</strong> transaksi
          </div>
        </div>

        {/* Table Sesuai PDF Page 5 & 6 */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">No. Pembelian</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Barang & Kategori</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Harga Satuan</th>
                  <th className="px-4 py-3 text-right">Total Harga</th>
                  <th className="px-4 py-3 text-center">Pembayaran</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Foto Nota</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-8 text-gray-500">
                      Memuat daftar pembelian...
                    </td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-8 text-gray-400">
                      Belum ada transaksi pembelian.
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => {
                    const isDP = p.payment_method === 'DP';
                    const hasRemaining = parseFloat(p.remaining_payment) > 0;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-900">
                          {p.purchase_no}
                          <div className="text-[10px] font-normal text-gray-500">{formatDate(p.purchase_date)}</div>
                          {p.request_no && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-blue-50 text-blue-700 border border-blue-200 mt-0.5">
                              {p.request_no}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {p.supplier}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{p.item_name}</div>
                          <span className="text-xs text-gray-500">{p.category}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">
                          {parseFloat(p.qty)} {p.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-600">
                          Rp {formatRupiah(p.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-gray-900">
                          Rp {formatRupiah(p.total_price)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-800 uppercase">
                            {p.payment_method}
                          </span>
                          {isDP && (
                            <div className="text-[10px] text-gray-600 mt-1">
                              <span>DP: Rp {formatRupiah(p.dp_amount)}</span>
                              {hasRemaining ? (
                                <span className="block text-amber-700 font-semibold">
                                  Sisa: Rp {formatRupiah(p.remaining_payment)}
                                </span>
                              ) : (
                                <span className="block text-green-700 font-semibold">✓ Lunas</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                            p.status === 'Selesai' || p.status === 'Diterima'
                              ? 'bg-green-100 text-green-800'
                              : p.status === 'Direturn'
                              ? 'bg-red-100 text-red-800'
                              : p.status === 'Belanja'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.invoice_proof_url ? (
                            <button
                              type="button"
                              onClick={() => {
                                setViewingImage(getImageUrl(p.invoice_proof_url));
                                setImageViewerOpen(true);
                              }}
                              className="text-xs font-semibold text-primary-600 hover:text-primary-800 underline"
                            >
                              Lihat Nota
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {/* Tombol Pelunasan DP */}
                            {isDP && hasRemaining && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPurchase(p);
                                  setSettleModalOpen(true);
                                }}
                                className="px-2 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm"
                                title="Lunasi Sisa Pembayaran DP"
                              >
                                Lunasi
                              </button>
                            )}

                            {/* Tombol Update Status & Return */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPurchase(p);
                                setStatusForm({
                                  status: p.status,
                                  notes: p.notes || '',
                                  return_amount: p.return_amount || '',
                                  return_qty: p.return_qty || '',
                                  return_notes: p.return_notes || ''
                                });
                                setStatusModalOpen(true);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded border"
                            >
                              Status
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

      {/* MODAL 1: FORM PEMBELIAN (Sesuai PDF Page 5 & 6) */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center space-x-2">
              <span>🛒</span>
              <span>Catat Transaksi Pembelian Baru</span>
            </h3>

            <form onSubmit={handleCreatePurchase} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    No. Pengajuan (Opsional)
                  </label>
                  <select
                    value={form.request_id}
                    onChange={(e) => {
                      const req = approvedRequests.find((r) => r.id === parseInt(e.target.value));
                      if (req) {
                        setForm({
                          ...form,
                          request_id: req.id,
                          category: req.category,
                          item_name: req.item_name,
                          specification: req.specification || '',
                          qty: req.qty,
                          unit: req.unit,
                          inventory_item_id: req.inventory_item_id || null
                        });
                      } else {
                        setForm({ ...form, request_id: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">-- Pembelian Langsung (Tanpa Pengajuan) --</option>
                    {approvedRequests.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.request_no} - {r.item_name} ({r.qty} {r.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tgl Pembelian <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.purchase_date}
                    onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Supplier / Toko <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Toko Beras Jaya / Pasar Induk"
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Kategori Barang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="purchase-categories"
                    placeholder="Pilih atau ketik kategori..."
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <datalist id="purchase-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nama Barang <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="purchase-items"
                  placeholder="Pilih dari persediaan atau ketik barang baru..."
                  value={form.item_name}
                  onChange={(e) => {
                    const matched = inventoryItems.find((i) => i.name.toLowerCase() === e.target.value.toLowerCase());
                    setForm({
                      ...form,
                      item_name: e.target.value,
                      category: matched ? matched.category : form.category,
                      unit: matched ? matched.unit : form.unit,
                      inventory_item_id: matched ? matched.id : null
                    });
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <datalist id="purchase-items">
                  {inventoryItems.map((it) => (
                    <option key={it.id} value={it.name}>
                      {it.name} ({it.category})
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    placeholder="0"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
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
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Total Harga (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0"
                    value={form.total_price}
                    onChange={(e) => setForm({ ...form, total_price: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-bold"
                  />
                </div>
              </div>

              {/* Harga Satuan (*Total harga : QTY) live */}
              <div className="bg-gray-50 p-2.5 rounded-lg text-xs text-gray-600 flex justify-between items-center border border-gray-200">
                <span>Harga Satuan (*Total harga : QTY):</span>
                <span className="font-bold text-gray-900 text-sm">
                  Rp {formatRupiah(computedUnitPrice)} / {form.unit}
                </span>
              </div>

              {/* Metode Pembayaran: Tunai, Transfer, DP (Halaman 5 PDF) */}
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-3">
                <label className="block text-xs font-bold text-gray-800">
                  Metode Pembayaran <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4 text-xs font-medium">
                  {['Tunai', 'Transfer', 'DP'].map((m) => (
                    <label key={m} className="inline-flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="payment_method"
                        value={m}
                        checked={form.payment_method === m}
                        onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span>{m === 'DP' ? 'DP (Uang Muka)' : m}</span>
                    </label>
                  ))}
                </div>

                {/* Khusus DP (Halaman 5 PDF: klo DP Tampilkan Total pembayaran, DP dibayar, Sisa pembayaran, Jatuh Tempo) */}
                {form.payment_method === 'DP' && (
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          DP Dibayar (Rp) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          placeholder="Nominal DP..."
                          value={form.dp_amount}
                          onChange={(e) => setForm({ ...form, dp_amount: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Jatuh Tempo Pelunasan
                        </label>
                        <input
                          type="date"
                          value={form.due_date}
                          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="bg-amber-50 p-2 rounded text-xs text-amber-900 flex justify-between border border-amber-200">
                      <span>Sisa Pembayaran (Utang Usaha):</span>
                      <strong className="text-amber-800">Rp {formatRupiah(computedRemaining)}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Foto Nota */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Foto Nota Belanja (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700"
                />
                {invoicePreview && (
                  <div className="mt-2 flex items-center space-x-3">
                    <img src={invoicePreview} alt="Preview" className="w-16 h-16 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceFile(null);
                        setInvoicePreview(null);
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Hapus Foto
                    </button>
                  </div>
                )}
              </div>

              {/* Status Pembelian */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Status Pesanan
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="Dipesan">Dipesan</option>
                    <option value="Belanja">Belanja</option>
                    <option value="Diterima">Diterima</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Catatan
                  </label>
                  <input
                    type="text"
                    placeholder="Catatan tambahan..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="bg-primary-50 p-2.5 rounded-lg border border-primary-200 text-xs text-primary-900 leading-tight">
                ✨ <em>Otomatis Neraca: Debit Persediaan, Kredit Kas / Utang Usaha. Otomatis Arus Kas keluar Operasi Pembelian Persediaan.</em>
              </div>

              <div className="flex space-x-3 pt-2">
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
                  {submitting ? 'Menyimpan...' : 'Simpan Pembelian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPDATE STATUS & RETURN PEMBELIAN (PDF Page 11) */}
      {statusModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Update Status Pembelian</h3>
            <p className="text-xs text-gray-500 mb-4 font-mono">{selectedPurchase.purchase_no} - {selectedPurchase.item_name}</p>

            <form onSubmit={handleSaveStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status Baru <span className="text-red-500">*</span>
                </label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="Dipesan">Dipesan</option>
                  <option value="Belanja">Belanja</option>
                  <option value="Diterima">Diterima</option>
                  <option value="Direturn">Direturn (Retur Barang)</option>
                  <option value="Dibatalkan">Dibatalkan</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              {/* Seksi Return Pembelian (Halaman 11 PDF) */}
              {statusForm.status === 'Direturn' && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-red-900">Rincian Return Pembelian:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-red-800 mb-1">
                        Jumlah Direturn ({selectedPurchase.unit})
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        placeholder="Qty..."
                        value={statusForm.return_qty}
                        onChange={(e) => setStatusForm({ ...statusForm, return_qty: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-red-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-red-800 mb-1">
                        Uang Kembali (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Rp kembali..."
                        value={statusForm.return_amount}
                        onChange={(e) => setStatusForm({ ...statusForm, return_amount: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-red-300 rounded bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-red-800 mb-1">
                      Alasan Retur
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Barang rusak / tidak sesuai spesifikasi"
                      value={statusForm.return_notes}
                      onChange={(e) => setStatusForm({ ...statusForm, return_notes: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-red-300 rounded bg-white"
                    />
                  </div>
                  <p className="text-[10px] text-red-700 leading-tight">
                    *Jika uang dikembalikan: Neraca Debit Kas, Kredit Persediaan. Arus Kas masuk Operasi Pembelian Persediaan. Stok persediaan dan kartu stok berkurang otomatis.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Catatan
                </label>
                <textarea
                  rows="2"
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  placeholder="Catatan update..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingStatus}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:bg-gray-400"
                >
                  {submittingStatus ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PELUNASAN DP (Halaman 6 PDF) */}
      {settleModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
            <span className="text-4xl block mb-2">💸</span>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi Pelunasan DP</h3>
            <p className="text-xs text-gray-500 font-mono mb-4">{selectedPurchase.purchase_no} - {selectedPurchase.item_name}</p>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-left mb-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Harga:</span>
                <span className="font-bold">Rp {formatRupiah(selectedPurchase.total_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">DP yang Sudah Dibayar:</span>
                <span className="text-green-700 font-medium">Rp {formatRupiah(selectedPurchase.dp_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-amber-300 pt-1 text-amber-900 font-extrabold text-sm">
                <span>Sisa Pembayaran:</span>
                <span>Rp {formatRupiah(selectedPurchase.remaining_payment)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-6">
              Sistem otomatis mencatat pelunasan di Neraca (<strong>Debit: Utang Usaha, Kredit: Kas</strong>) dan Arus Kas keluar Operasi Pembelian Persediaan.
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePayRemaining}
                disabled={submittingSettle}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:bg-gray-400"
              >
                {submittingSettle ? 'Memproses...' : 'Bayar Lunas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      <ImageViewer
        imageUrl={viewingImage}
        isOpen={imageViewerOpen}
        onClose={() => {
          setImageViewerOpen(false);
          setViewingImage(null);
        }}
        title="Bukti Nota Pembelian"
      />
    </DashboardLayout>
  );
};

export default Purchases;
