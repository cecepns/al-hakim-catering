import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Truck,
  Plus,
  Edit3,
  Trash2,
  RotateCcw,
  Search,
  Package,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { equipmentAPI } from '../../utils/api';

const DeliveryEquipment = ({ role: propRole }) => {
  const { user } = useAuth();
  const effectiveRole = propRole || user?.role || 'admin';
  const [activeTab, setActiveTab] = useState('recap'); // 'catalog' | 'recap'
  const [recapFilter, setRecapFilter] = useState('all'); // 'all' | 'borrowed' | 'brought'
  const [search, setSearch] = useState('');

  // Catalog state
  const [equipmentList, setEquipmentList] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'Pcs',
    stock: 0,
    description: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Recap state
  const [recapData, setRecapData] = useState({
    brought: [],
    borrowed: [],
    summary: {
      total_orders_with_equipment: 0,
      total_brought_qty: 0,
      total_borrowed_qty: 0,
      total_borrowed_items: 0,
    },
  });
  const [recapLoading, setRecapLoading] = useState(true);

  const fetchCatalog = async () => {
    try {
      setCatalogLoading(true);
      const res = await equipmentAPI.getAll({
        include_inactive: showInactive ? 'true' : 'false',
      });
      setEquipmentList(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching equipment catalog:', error);
      toast.error('Gagal memuat daftar peralatan');
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchRecap = async () => {
    try {
      setRecapLoading(true);
      const res = await equipmentAPI.getRecap();
      setRecapData(
        res.data || {
          brought: [],
          borrowed: [],
          summary: {
            total_orders_with_equipment: 0,
            total_brought_qty: 0,
            total_borrowed_qty: 0,
            total_borrowed_items: 0,
          },
        }
      );
    } catch (error) {
      console.error('Error fetching equipment recap:', error);
      toast.error('Gagal memuat rekap peralatan');
    } finally {
      setRecapLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  useEffect(() => {
    fetchRecap();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      unit: 'Pcs',
      stock: 0,
      description: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      unit: item.unit || 'Pcs',
      stock: Number(item.stock) || 0,
      description: item.description || '',
      is_active: item.is_active !== 0 && item.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSaveEquipment = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nama peralatan wajib diisi');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        unit: formData.unit.trim() || 'Pcs',
        stock: parseInt(formData.stock, 10) || 0,
        description: formData.description || null,
        is_active: formData.is_active,
      };
      if (editingItem) {
        await equipmentAPI.update(editingItem.id, payload);
        toast.success('Peralatan berhasil diperbarui');
      } else {
        await equipmentAPI.create(payload);
        toast.success('Peralatan berhasil ditambahkan');
      }
      setModalOpen(false);
      await fetchCatalog();
    } catch (error) {
      console.error('Error saving equipment:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan peralatan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEquipment = async (item) => {
    if (!window.confirm(`Hapus atau nonaktifkan peralatan "${item.name}"?`)) {
      return;
    }
    try {
      const res = await equipmentAPI.delete(item.id);
      toast.success(res.data?.message || 'Peralatan dihapus');
      await fetchCatalog();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast.error(error.response?.data?.message || 'Gagal menghapus peralatan');
    }
  };

  const handleMarkReturned = async (row) => {
    if (
      !window.confirm(
        `Tandai ${row.qty_borrowed} ${row.equipment_unit || ''} ${row.equipment_name} untuk Pesanan #${row.order_id} (${row.customer_name}) sudah kembali?`
      )
    ) {
      return;
    }
    try {
      await equipmentAPI.markReturned(row.order_id, row.id, {
        return_qty: row.qty_borrowed,
      });
      toast.success('Pengembalian peralatan berhasil dicatat');
      await fetchRecap();
    } catch (error) {
      console.error('Error marking equipment returned:', error);
      toast.error(error.response?.data?.message || 'Gagal mencatat pengembalian');
    }
  };

  const orderDetailBase =
    effectiveRole === 'operasional'
      ? '/operasional/orders'
      : effectiveRole === 'dapur'
      ? '/dapur/orders'
      : effectiveRole === 'kurir'
      ? '/kurir/orders'
      : '/admin/orders';

  const normalizedQuery = search.toLowerCase().trim();

  const filteredCatalog = equipmentList.filter(
    (it) =>
      !normalizedQuery ||
      (it.name || '').toLowerCase().includes(normalizedQuery) ||
      (it.description || '').toLowerCase().includes(normalizedQuery)
  );

  const filterRecapRows = (rows) =>
    rows.filter(
      (r) =>
        !normalizedQuery ||
        String(r.order_id).includes(normalizedQuery) ||
        (r.equipment_name || '').toLowerCase().includes(normalizedQuery) ||
        (r.customer_name || '').toLowerCase().includes(normalizedQuery) ||
        (r.delivery_address || '').toLowerCase().includes(normalizedQuery)
    );

  const borrowedRows = filterRecapRows(recapData.borrowed || []);
  const broughtRows = filterRecapRows(recapData.brought || []);
  const canDeleteCatalog = ['admin', 'operasional', 'dapur'].includes(effectiveRole);

  return (
    <DashboardLayout role={effectiveRole}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-7 h-7 text-purple-700" />
              Perlengkapan Pengantaran
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Daftar master peralatan &amp; rekap barang dibawa pengantaran serta yang masih dipinjam pelanggan
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Tambah Peralatan
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-purple-600">
            <p className="text-xs font-medium text-gray-500 uppercase">
              Total Pesanan Memakai Alat
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {recapData.summary?.total_orders_with_equipment || 0} Pesanan
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-600">
            <p className="text-xs font-medium text-gray-500 uppercase">
              Total Barang Dibawa Pengantaran
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {recapData.summary?.total_brought_qty || 0} Unit
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-amber-500">
            <p className="text-xs font-medium text-gray-500 uppercase">
              Sedang Dipinjam (Belum Kembali)
            </p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {recapData.summary?.total_borrowed_qty || 0} Unit ({recapData.summary?.total_borrowed_items || 0} Item)
            </p>
          </div>
        </div>

        {/* Navigation Tabs + Search */}
        <div className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('recap')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'recap'
                  ? 'bg-purple-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rekap Peralatan ({(recapData.brought || []).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'catalog'
                  ? 'bg-purple-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Daftar Peralatan ({equipmentList.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama alat / #pesanan / pemesan..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'catalog' ? (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-700" />
                Daftar Master Peralatan
              </h2>
              <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded text-purple-700"
                />
                Tampilkan yang nonaktif
              </label>
            </div>

            {catalogLoading ? (
              <p className="text-sm text-gray-500 py-6 text-center">Memuat daftar peralatan...</p>
            ) : filteredCatalog.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm mb-3">Belum ada data peralatan.</p>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-purple-700 text-white rounded-lg hover:bg-purple-800"
                >
                  <Plus className="w-4 h-4" /> Tambah Peralatan Pertama
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Nama Peralatan</th>
                      <th className="px-4 py-3 text-center">Satuan</th>
                      <th className="px-4 py-3 text-center">Stok Master</th>
                      <th className="px-4 py-3 text-left">Keterangan</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCatalog.map((item) => (
                      <tr key={item.id} className={!item.is_active ? 'bg-gray-50 text-gray-400' : ''}>
                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-center">{item.unit || 'Pcs'}</td>
                        <td className="px-4 py-3 text-center font-semibold">{item.stock}</td>
                        <td className="px-4 py-3 text-gray-600">{item.description || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              item.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {item.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900 px-2 py-1 border border-purple-200 rounded"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            {canDeleteCatalog && (
                              <button
                                type="button"
                                onClick={() => handleDeleteEquipment(item)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 px-2 py-1 border border-red-200 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Hapus
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recap filter pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'Tampilkan Semua' },
                { key: 'borrowed', label: `Barang Dipinjam (${borrowedRows.length})` },
                { key: 'brought', label: `Barang Dibawa Pengantaran (${broughtRows.length})` },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setRecapFilter(pill.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    recapFilter === pill.key
                      ? 'bg-purple-700 text-white border-purple-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {recapLoading ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-sm text-gray-500">
                Memuat rekap peralatan...
              </div>
            ) : (
              <>
                {/* Section 1: Barang yang Dipinjam */}
                {(recapFilter === 'all' || recapFilter === 'borrowed') && (
                  <div className="bg-white rounded-xl shadow p-6 space-y-4 border-t-4 border-amber-500">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        Daftar Barang yang Dipinjam (Belum Kembali)
                      </h2>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">
                        {borrowedRows.length} catatan aktif
                      </span>
                    </div>

                    {borrowedRows.length === 0 ? (
                      <div className="flex items-center gap-2 p-4 bg-green-50 text-green-800 rounded-lg text-sm">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        Semua peralatan pengantaran sudah kembali / tidak ada yang dipinjam.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-amber-50 text-xs uppercase text-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left">Pesanan</th>
                              <th className="px-4 py-3 text-left">Pelanggan</th>
                              <th className="px-4 py-3 text-left">Perlengkapan</th>
                              <th className="px-4 py-3 text-center">Dibawa</th>
                              <th className="px-4 py-3 text-center">Kembali</th>
                              <th className="px-4 py-3 text-center">Dipinjam</th>
                              <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {borrowedRows.map((row) => (
                              <tr key={row.id} className="hover:bg-amber-50/40">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <Link
                                    to={`${orderDetailBase}/${row.order_id}`}
                                    className="font-semibold text-purple-700 hover:underline"
                                  >
                                    #{row.order_id}
                                  </Link>
                                  <p className="text-xs text-gray-500 capitalize">
                                    {row.order_status?.replace('_', ' ')}
                                  </p>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{row.customer_name}</div>
                                  {row.customer_phone && (
                                    <div className="text-xs text-gray-500">{row.customer_phone}</div>
                                  )}
                                  {row.delivery_address && (
                                    <div className="text-xs text-gray-500 truncate max-w-xs">
                                      {row.delivery_address}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {row.equipment_name}{' '}
                                  <span className="text-xs text-gray-500 font-normal">
                                    ({row.equipment_unit || 'Pcs'})
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">{row.qty_brought}</td>
                                <td className="px-4 py-3 text-center text-green-700 font-medium">
                                  {row.qty_returned}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                                    {row.qty_borrowed}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleMarkReturned(row)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" /> Tandai Kembali
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Section 2: Daftar Barang yang Dibawa Pengantaran */}
                {(recapFilter === 'all' || recapFilter === 'brought') && (
                  <div className="bg-white rounded-xl shadow p-6 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-purple-700" />
                        Daftar Barang yang Dibawa Pengantaran
                      </h2>
                      <span className="text-xs text-gray-500">{broughtRows.length} data tercatat</span>
                    </div>

                    {broughtRows.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4">
                        Belum ada data barang yang dibawa pengantaran.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                            <tr>
                              <th className="px-4 py-3 text-left">Pesanan</th>
                              <th className="px-4 py-3 text-left">Pelanggan</th>
                              <th className="px-4 py-3 text-left">Perlengkapan</th>
                              <th className="px-4 py-3 text-center">Dibawa</th>
                              <th className="px-4 py-3 text-center">Kembali</th>
                              <th className="px-4 py-3 text-center">Dipinjam</th>
                              <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {broughtRows.map((row) => (
                              <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <Link
                                    to={`${orderDetailBase}/${row.order_id}`}
                                    className="font-semibold text-purple-700 hover:underline"
                                  >
                                    #{row.order_id}
                                  </Link>
                                  <p className="text-xs text-gray-500 capitalize">
                                    {row.order_status?.replace('_', ' ')}
                                  </p>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{row.customer_name}</div>
                                  {row.guest_event_date && (
                                    <div className="text-xs text-gray-500">
                                      Acara: {new Date(row.guest_event_date).toLocaleDateString('id-ID')}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {row.equipment_name}{' '}
                                  <span className="text-xs text-gray-500 font-normal">
                                    ({row.equipment_unit || 'Pcs'})
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center font-semibold">{row.qty_brought}</td>
                                <td className="px-4 py-3 text-center text-green-700 font-medium">
                                  {row.qty_returned}
                                </td>
                                <td className="px-4 py-3 text-center text-amber-700 font-medium">
                                  {row.qty_borrowed}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {Number(row.qty_borrowed) > 0 ? (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-medium">
                                      Dipinjam ({row.qty_borrowed})
                                    </span>
                                  ) : Number(row.qty_returned) > 0 ? (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                                      Kembali
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
                                      Dalam Proses
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Modal Tambah / Edit Peralatan */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingItem ? 'Edit Peralatan' : 'Tambah Peralatan Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEquipment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Peralatan *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Wajan / Box Container / Pemanas"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Satuan
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="Pcs / Unit / Set"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stok Master
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keterangan
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Keterangan tambahan..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {editingItem && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded text-purple-700"
                    />
                    Aktif (tampil di daftar checklist Dapur)
                  </label>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm bg-purple-700 text-white rounded-lg hover:bg-purple-800 disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan'}
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

export default DeliveryEquipment;

