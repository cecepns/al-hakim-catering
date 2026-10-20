import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { inventoryAPI } from '../../utils/api';
import { formatRupiah, formatDate } from '../../utils/formatHelper';

const InventoryManagement = ({ role = 'admin' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stok'); // 'stok' | 'tracking' | 'opname'

  // Items State
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Tracking (Stock Logs) State
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logItemId, setLogItemId] = useState('');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');

  // Opname State
  const [opnames, setOpnames] = useState([]);
  const [loadingOpnames, setLoadingOpnames] = useState(false);
  const [opnameItemId, setOpnameItemId] = useState('');

  // Modals
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    category: '',
    name: '',
    unit: 'Pcs',
    stock: '',
    min_stock: '10',
    notes: ''
  });
  const [submittingItem, setSubmittingItem] = useState(false);

  // Opname Modal
  const [opnameModalOpen, setOpnameModalOpen] = useState(false);
  const [opnameForm, setOpnameForm] = useState({
    inventory_item_id: '',
    date: new Date().toISOString().split('T')[0],
    physical_stock: '',
    notes: '',
    adjust_stock: true
  });
  const [submittingOpname, setSubmittingOpname] = useState(false);

  // 1. Fetch Categories & Items
  const fetchCategories = async () => {
    try {
      const res = await inventoryAPI.getCategories();
      setCategories(res.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItems = useCallback(async () => {
    try {
      setLoadingItems(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;
      if (onlyLowStock) params.low_stock = 'true';

      const res = await inventoryAPI.getItems(params);
      setItems(res.data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoadingItems(false);
    }
  }, [searchQuery, selectedCategory, onlyLowStock]);

  // 2. Fetch Stock Logs
  const fetchStockLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const params = { limit: 50 };
      if (logItemId) params.item_id = logItemId;
      if (logStartDate && logEndDate) {
        params.start_date = logStartDate;
        params.end_date = logEndDate;
      }

      const res = await inventoryAPI.getStockLogs(params);
      setLogs(res.data?.logs || []);
    } catch (error) {
      console.error('Error fetching stock logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  }, [logItemId, logStartDate, logEndDate]);

  // 3. Fetch Opnames
  const fetchOpnames = useCallback(async () => {
    try {
      setLoadingOpnames(true);
      const params = { limit: 50 };
      if (opnameItemId) params.item_id = opnameItemId;

      const res = await inventoryAPI.getOpname(params);
      setOpnames(res.data?.opnames || []);
    } catch (error) {
      console.error('Error fetching opnames:', error);
    } finally {
      setLoadingOpnames(false);
    }
  }, [opnameItemId]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'stok') {
      fetchItems();
    } else if (activeTab === 'tracking') {
      fetchStockLogs();
    } else if (activeTab === 'opname') {
      fetchOpnames();
    }
  }, [activeTab, fetchItems, fetchStockLogs, fetchOpnames]);

  // Handle Save Item (Add/Edit)
  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      setSubmittingItem(true);
      if (editingItem) {
        await inventoryAPI.updateItem(editingItem.id, itemForm);
        alert('Data barang persediaan berhasil diperbarui');
      } else {
        await inventoryAPI.createItem(itemForm);
        alert('Barang persediaan baru berhasil ditambahkan');
      }
      setItemModalOpen(false);
      setEditingItem(null);
      setItemForm({ category: '', name: '', unit: 'Pcs', stock: '', min_stock: '10', notes: '' });
      fetchItems();
      fetchCategories();
    } catch (error) {
      console.error('Error saving item:', error);
      alert(error.response?.data?.message || 'Gagal menyimpan barang persediaan');
    } finally {
      setSubmittingItem(false);
    }
  };

  // Handle Delete Item
  const handleDeleteItem = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus barang "${name}" dari persediaan?`)) return;
    try {
      await inventoryAPI.deleteItem(id);
      fetchItems();
      fetchCategories();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert(error.response?.data?.message || 'Gagal menghapus barang');
    }
  };

  // Handle Save Opname
  const handleSaveOpname = async (e) => {
    e.preventDefault();
    if (!opnameForm.inventory_item_id || opnameForm.physical_stock === '') {
      alert('Pilih barang dan masukkan stok fisik');
      return;
    }

    try {
      setSubmittingOpname(true);
      await inventoryAPI.createOpname({
        inventory_item_id: opnameForm.inventory_item_id,
        date: opnameForm.date,
        physical_stock: parseFloat(opnameForm.physical_stock),
        notes: opnameForm.notes,
        adjust_stock: opnameForm.adjust_stock
      });
      alert('Stok opname berhasil disimpan dan stok disesuaikan');
      setOpnameModalOpen(false);
      setOpnameForm({
        inventory_item_id: '',
        date: new Date().toISOString().split('T')[0],
        physical_stock: '',
        notes: '',
        adjust_stock: true
      });
      fetchOpnames();
      fetchItems();
    } catch (error) {
      console.error('Error saving opname:', error);
      alert(error.response?.data?.message || 'Gagal menyimpan stok opname');
    } finally {
      setSubmittingOpname(false);
    }
  };

  // Navigate to purchase request pre-filled
  const handleAjukanPembelian = (item) => {
    const targetPath = role === 'admin' 
      ? '/admin/purchase-requests' 
      : role === 'dapur' 
      ? '/dapur/purchase-requests' 
      : '/operasional/purchase-requests';

    navigate(`${targetPath}?auto_item_id=${item.id}&category=${encodeURIComponent(item.category)}&item_name=${encodeURIComponent(item.name)}&unit=${encodeURIComponent(item.unit)}`);
  };

  const selectedOpnameItem = items.find((i) => i.id === parseInt(opnameForm.inventory_item_id));
  const opnameDifference = selectedOpnameItem && opnameForm.physical_stock !== ''
    ? parseFloat(opnameForm.physical_stock) - parseFloat(selectedOpnameItem.stock)
    : 0;

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <span>📦</span>
              <span>Manajemen Stok Persediaan & Opname</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Pantau stok barang dapur, peringatan stok minimum, kartu tracking stok, dan pencatatan stok opname
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {activeTab === 'stok' && (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setItemForm({ category: '', name: '', unit: 'Pcs', stock: '0', min_stock: '10', notes: '' });
                  setItemModalOpen(true);
                }}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 shadow-sm transition"
              >
                <span>➕</span>
                <span>Tambah Barang Baru</span>
              </button>
            )}

            {activeTab === 'opname' && (
              <button
                onClick={() => setOpnameModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 shadow-sm transition"
              >
                <span>📝</span>
                <span>Catat Stok Opname</span>
              </button>
            )}
          </div>
        </div>

        {/* Top 3 Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('stok')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg font-semibold text-sm transition flex items-center justify-center space-x-2 ${
              activeTab === 'stok'
                ? 'bg-primary-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>📊</span>
            <span>STOK PERSEDIAAN</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tracking')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg font-semibold text-sm transition flex items-center justify-center space-x-2 ${
              activeTab === 'tracking'
                ? 'bg-primary-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>📈</span>
            <span>TRACKING STOK (KARTU STOK)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('opname')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg font-semibold text-sm transition flex items-center justify-center space-x-2 ${
              activeTab === 'opname'
                ? 'bg-primary-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>⚖️</span>
            <span>STOK OPNAME</span>
          </button>
        </div>

        {/* TAB 1: STOK PERSEDIAAN */}
        {activeTab === 'stok' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama barang..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="absolute left-3 top-2 text-gray-400 text-xs">🔍</span>
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Low Stock Toggle */}
                <button
                  type="button"
                  onClick={() => setOnlyLowStock(!onlyLowStock)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center space-x-1.5 ${
                    onlyLowStock
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>⚠️</span>
                  <span>Hanya Stok Menipis</span>
                </button>
              </div>

              <div className="text-xs text-gray-500">
                Total: <strong>{items.length}</strong> barang
              </div>
            </div>

            {/* Table Stok Persediaan (Sesuai PDF Page 6) */}
            {/* No | Kategori | Nama barang | Stok | Stok Minimum | Keterangan | Ajukan pembelian */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs text-gray-600 uppercase border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Nama Barang</th>
                      <th className="px-4 py-3 text-center">Stok Saat Ini</th>
                      <th className="px-4 py-3 text-center">Stok Minimum</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3">Keterangan</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loadingItems ? (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-gray-500">
                          Memuat data persediaan...
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-gray-400">
                          Tidak ada data barang persediaan.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const isLow = parseFloat(item.stock) <= parseFloat(item.min_stock);
                        return (
                          <tr key={item.id} className={`hover:bg-gray-50 ${isLow ? 'bg-amber-50/40' : ''}`}>
                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-medium">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-base text-gray-900">
                              {parseFloat(item.stock)} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600 text-xs">
                              {parseFloat(item.min_stock)} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isLow ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                  ⚠️ Stok menipis
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  ✓ Aman
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                              {item.notes || '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleAjukanPembelian(item)}
                                  className="px-2.5 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 shadow-sm transition"
                                  title="Ajukan Pembelian untuk barang ini"
                                >
                                  Ajukan Pembelian
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setItemForm({
                                      category: item.category,
                                      name: item.name,
                                      unit: item.unit,
                                      stock: item.stock,
                                      min_stock: item.min_stock,
                                      notes: item.notes || ''
                                    });
                                    setItemModalOpen(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100"
                                  title="Edit Barang"
                                >
                                  ✏️
                                </button>
                                {role === 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id, item.name)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100"
                                    title="Hapus Barang"
                                  >
                                    🗑️
                                  </button>
                                )}
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
        )}

        {/* TAB 2: TRACKING STOK PERSEDIAAN (KARTU STOK) */}
        {activeTab === 'tracking' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex flex-wrap items-center gap-3">
              <select
                value={logItemId}
                onChange={(e) => setLogItemId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white min-w-[200px]"
              >
                <option value="">Semua Barang Persediaan</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    [{it.category}] {it.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={logStartDate}
                  onChange={(e) => setLogStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-gray-500">s/d</span>
                <input
                  type="date"
                  value={logEndDate}
                  onChange={(e) => setLogEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {(logItemId || logStartDate || logEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setLogItemId('');
                    setLogStartDate('');
                    setLogEndDate('');
                  }}
                  className="px-2.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 border rounded-lg bg-gray-50"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* Table Tracking Stok (Sesuai PDF Page 6) */}
            {/* No | Tanggal | Kategori | Nama barang | Stok awal | Masuk | Keluar | Sisa | Keterangan */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs text-gray-600 uppercase border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Nama Barang</th>
                      <th className="px-4 py-3 text-center">Stok Awal</th>
                      <th className="px-4 py-3 text-center text-green-700">Masuk (+)</th>
                      <th className="px-4 py-3 text-center text-red-700">Keluar (-)</th>
                      <th className="px-4 py-3 text-center font-bold">Sisa</th>
                      <th className="px-4 py-3">Keterangan</th>
                      <th className="px-4 py-3">Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loadingLogs ? (
                      <tr>
                        <td colSpan="10" className="text-center py-8 text-gray-500">
                          Memuat riwayat kartu stok...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-8 text-gray-400">
                          Belum ada riwayat pergerakan stok untuk filter ini.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log, idx) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                            {formatDate(log.date)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {log.item_category}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {log.item_name}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700 text-xs">
                            {parseFloat(log.stock_initial)}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-green-600 text-xs">
                            {parseFloat(log.stock_in) > 0 ? `+${parseFloat(log.stock_in)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-red-600 text-xs">
                            {parseFloat(log.stock_out) > 0 ? `-${parseFloat(log.stock_out)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center font-extrabold text-gray-900 text-sm">
                            {parseFloat(log.stock_final)} <span className="text-[10px] font-normal text-gray-500">{log.item_unit}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700">
                            {log.notes || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {log.created_by_name || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STOK OPNAME */}
        {activeTab === 'opname' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <select
                value={opnameItemId}
                onChange={(e) => setOpnameItemId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white min-w-[220px]"
              >
                <option value="">Semua Barang Opname</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    [{it.category}] {it.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setOpnameModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 shadow-sm transition"
              >
                <span>➕</span>
                <span>Tambah Catatan Opname</span>
              </button>
            </div>

            {/* Table Stok Opname (Sesuai PDF Page 6) */}
            {/* No | Tanggal | Kategori | Nama barang | Stok sistem | Stok fisik | Selisih | Keterangan */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs text-gray-600 uppercase border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Nama Barang</th>
                      <th className="px-4 py-3 text-center">Stok Sistem</th>
                      <th className="px-4 py-3 text-center">Stok Fisik</th>
                      <th className="px-4 py-3 text-center">Selisih</th>
                      <th className="px-4 py-3">Keterangan</th>
                      <th className="px-4 py-3">Petugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loadingOpnames ? (
                      <tr>
                        <td colSpan="9" className="text-center py-8 text-gray-500">
                          Memuat data stok opname...
                        </td>
                      </tr>
                    ) : opnames.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-8 text-gray-400">
                          Belum ada catatan stok opname.
                        </td>
                      </tr>
                    ) : (
                      opnames.map((op, idx) => {
                        const diff = parseFloat(op.difference);
                        return (
                          <tr key={op.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                              {formatDate(op.date)}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {op.item_category}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {op.item_name}
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-gray-700">
                              {parseFloat(op.system_stock)} {op.item_unit}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-gray-900">
                              {parseFloat(op.physical_stock)} {op.item_unit}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                diff === 0
                                  ? 'bg-gray-100 text-gray-700'
                                  : diff > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {diff > 0 ? `+${diff}` : diff} {op.item_unit}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700">
                              {op.notes || '-'}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {op.checked_by_name || '-'}
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
        )}
      </div>

      {/* Modal Add/Edit Inventory Item */}
      {itemModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingItem ? 'Edit Barang Persediaan' : 'Tambah Barang Persediaan Baru'}
            </h3>
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="category-suggestions"
                  placeholder="Contoh: Bahan Pokok, Daging, Bumbu"
                  value={itemForm.category}
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <datalist id="category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nama Barang <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beras Ramos Super"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
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
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Stok Awal
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={itemForm.stock}
                    onChange={(e) => setItemForm({ ...itemForm, stock: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Stok Min ⚠️
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={itemForm.min_stock}
                    onChange={(e) => setItemForm({ ...itemForm, min_stock: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Keterangan / Spesifikasi
                </label>
                <textarea
                  rows="2"
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  placeholder="Catatan kebutuhan, spesifikasi merek, dll..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingItem}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:bg-gray-400"
                >
                  {submittingItem ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Stok Opname */}
      {opnameModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Catat Stok Opname Fisik</h3>
            <form onSubmit={handleSaveOpname} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Pilih Barang Persediaan <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={opnameForm.inventory_item_id}
                  onChange={(e) => setOpnameForm({ ...opnameForm, inventory_item_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">-- Pilih Barang --</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      [{it.category}] {it.name} (Stok Sistem: {parseFloat(it.stock)} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tanggal Opname
                  </label>
                  <input
                    type="date"
                    required
                    value={opnameForm.date}
                    onChange={(e) => setOpnameForm({ ...opnameForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Jumlah Fisik Sebenarnya <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="0.00"
                    value={opnameForm.physical_stock}
                    onChange={(e) => setOpnameForm({ ...opnameForm, physical_stock: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {selectedOpnameItem && opnameForm.physical_stock !== '' && (
                <div className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
                  opnameDifference === 0
                    ? 'bg-gray-50 border-gray-200 text-gray-700'
                    : opnameDifference > 0
                    ? 'bg-green-50 border-green-200 text-green-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  <div>
                    <span>Stok Sistem: <strong>{selectedOpnameItem.stock} {selectedOpnameItem.unit}</strong></span>
                    <span className="block mt-0.5">Stok Fisik: <strong>{opnameForm.physical_stock} {selectedOpnameItem.unit}</strong></span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] block">Selisih:</span>
                    <span className="font-extrabold text-sm">
                      {opnameDifference > 0 ? `+${opnameDifference}` : opnameDifference} {selectedOpnameItem.unit}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Keterangan / Alasan Selisih
                </label>
                <textarea
                  rows="2"
                  value={opnameForm.notes}
                  onChange={(e) => setOpnameForm({ ...opnameForm, notes: e.target.value })}
                  placeholder="Contoh: Barang susut, rusak, atau salah hitung..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <label className="flex items-start space-x-2 text-xs text-blue-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opnameForm.adjust_stock}
                    onChange={(e) => setOpnameForm({ ...opnameForm, adjust_stock: e.target.checked })}
                    className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                  />
                  <span>
                    <strong>Otomatis sinkronisasi stok master:</strong> Sesuaikan stok di sistem menjadi sesuai dengan stok fisik di atas dan catat ke kartu stok.
                  </span>
                </label>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpnameModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingOpname || !opnameForm.inventory_item_id || opnameForm.physical_stock === ''}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:bg-gray-400"
                >
                  {submittingOpname ? 'Menyimpan...' : 'Simpan Opname'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default InventoryManagement;
