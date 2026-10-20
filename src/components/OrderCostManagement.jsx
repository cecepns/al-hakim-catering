import { useState, useEffect, useCallback } from 'react';
import { orderCostsAPI, inventoryAPI } from '../utils/api';
import { formatRupiah } from '../utils/formatHelper';
import { getImageUrl } from '../utils/imageHelper';
import ImageViewer from './ImageViewer';

const OrderCostManagement = ({ orderId, readOnly = false, onUpdated }) => {
  const [costs, setCosts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for Direct Cost (Modal)
  const [costAmount, setCostAmount] = useState('');
  const [costDescription, setCostDescription] = useState('');
  const [costProofFile, setCostProofFile] = useState(null);
  const [costProofPreview, setCostProofPreview] = useState(null);
  const [submittingCost, setSubmittingCost] = useState(false);

  // Form states for Material Used (Bahan Baku)
  const [selectedItemId, setSelectedItemId] = useState('');
  const [materialQty, setMaterialQty] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [submittingMaterial, setSubmittingMaterial] = useState(false);

  // Image Viewer
  const [viewingImage, setViewingImage] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState('modal'); // 'modal' | 'bahan'

  const fetchData = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const [costRes, matRes, invRes] = await Promise.all([
        orderCostsAPI.getCosts(orderId),
        orderCostsAPI.getMaterials(orderId),
        inventoryAPI.getItems()
      ]);
      setCosts(costRes.data || []);
      setMaterials(matRes.data || []);
      setInventoryItems(invRes.data || []);
    } catch (error) {
      console.error('Error fetching order costs and materials:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle proof image change
  const handleProofChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCostProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCostProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add Direct Cost
  const handleAddCost = async (e) => {
    e.preventDefault();
    if (!costAmount || parseFloat(costAmount) <= 0) {
      alert('Masukkan nominal harga modal yang valid');
      return;
    }

    try {
      setSubmittingCost(true);
      const formData = new FormData();
      formData.append('amount', costAmount);
      formData.append('description', costDescription || `Biaya modal pesanan #${orderId}`);
      if (costProofFile) {
        formData.append('receipt', costProofFile);
      }

      await orderCostsAPI.addCost(orderId, formData);
      setCostAmount('');
      setCostDescription('');
      setCostProofFile(null);
      setCostProofPreview(null);
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (error) {
      console.error('Error adding cost:', error);
      alert(error.response?.data?.message || 'Gagal menambahkan modal');
    } finally {
      setSubmittingCost(false);
    }
  };

  // Delete Direct Cost
  const handleDeleteCost = async (costId) => {
    if (!window.confirm('Hapus biaya modal ini? Jurnal neraca dan transaksi arus kas terkait juga akan dihapus.')) {
      return;
    }

    try {
      await orderCostsAPI.deleteCost(orderId, costId);
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (error) {
      console.error('Error deleting cost:', error);
      alert(error.response?.data?.message || 'Gagal menghapus modal');
    }
  };

  // Add Material Used
  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!selectedItemId) {
      alert('Pilih bahan baku terlebih dahulu');
      return;
    }
    if (!materialQty || parseFloat(materialQty) <= 0) {
      alert('Masukkan jumlah pemakaian yang valid');
      return;
    }
    if (!isConfirmed) {
      alert('Silakan centang persetujuan pemakaian bahan');
      return;
    }

    try {
      setSubmittingMaterial(true);
      await orderCostsAPI.addMaterial(orderId, {
        inventory_item_id: selectedItemId,
        quantity: parseFloat(materialQty)
      });

      setSelectedItemId('');
      setMaterialQty('');
      setIsConfirmed(false);
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (error) {
      console.error('Error adding material:', error);
      alert(error.response?.data?.message || 'Gagal mencatat pemakaian bahan baku');
    } finally {
      setSubmittingMaterial(false);
    }
  };

  // Delete Material Used
  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Hapus pemakaian bahan baku ini? Stok barang akan dikembalikan ke master persediaan.')) {
      return;
    }

    try {
      await orderCostsAPI.deleteMaterial(orderId, materialId);
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert(error.response?.data?.message || 'Gagal menghapus bahan baku');
    }
  };

  const selectedItemObj = inventoryItems.find((i) => i.id === parseInt(selectedItemId));

  // Calculations
  const totalDirectCosts = costs.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalMaterialCosts = materials.reduce((sum, m) => sum + parseFloat(m.subtotal || 0), 0);
  const totalHPP = totalDirectCosts + totalMaterialCosts;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mt-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-primary-700 px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xl">💰</span>
            <h3 className="text-lg font-bold">MODAL & HPP PESANAN</h3>
          </div>
          <p className="text-xs text-amber-100 mt-0.5">
            Kelola modal langsung dan pemakaian bahan baku persediaan (Otomatis masuk Neraca, Arus Kas & Laba Rugi)
          </p>
        </div>
        <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-lg text-right">
          <span className="text-xs text-amber-100 block">Total HPP Pesanan</span>
          <span className="text-xl font-extrabold text-white">Rp {formatRupiah(totalHPP)}</span>
        </div>
      </div>

      <div className="p-6">
        {/* Catatan Sesuai PDF */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg mb-6 text-xs text-amber-900 flex items-start space-x-2">
          <span className="text-amber-600 font-bold">💡 Info:</span>
          <div>
            <strong>Tabel modal & bahan baku tidak wajib diisi.</strong> Jika diisi, sistem otomatis memotong stok persediaan, mencatat kartu stok, serta mengintegrasikan ke Neraca (Debit HPP), Arus Kas (Biaya Operasional), dan Laporan Laba Rugi.
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6 space-x-4">
          <button
            type="button"
            onClick={() => setActiveTab('modal')}
            className={`pb-3 px-2 font-semibold text-sm transition relative ${
              activeTab === 'modal'
                ? 'text-primary-700 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            💵 Modal Langsung ({costs.length})
            <span className="ml-2 text-xs font-normal text-gray-500">
              (Rp {formatRupiah(totalDirectCosts)})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bahan')}
            className={`pb-3 px-2 font-semibold text-sm transition relative ${
              activeTab === 'bahan'
                ? 'text-primary-700 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🥬 Bahan Baku Persediaan ({materials.length})
            <span className="ml-2 text-xs font-normal text-gray-500">
              (Rp {formatRupiah(totalMaterialCosts)})
            </span>
          </button>
        </div>

        {/* TAB 1: MODAL LANGSUNG */}
        {activeTab === 'modal' && (
          <div className="space-y-6">
            {!readOnly && (
              <form onSubmit={handleAddCost} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center space-x-1.5">
                  <span>➕</span>
                  <span>Tambah Transaksi Modal Langsung</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Harga / Biaya (Rp) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="Contoh: 150000"
                      value={costAmount}
                      onChange={(e) => setCostAmount(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Keterangan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Belanja bumbu pasar subuh"
                      value={costDescription}
                      onChange={(e) => setCostDescription(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Foto Nota (Opsional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofChange}
                      className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                  </div>
                </div>

                {costProofPreview && (
                  <div className="mt-3 flex items-center space-x-3">
                    <img
                      src={costProofPreview}
                      alt="Preview Nota"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCostProofFile(null);
                        setCostProofPreview(null);
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Hapus Foto
                    </button>
                  </div>
                )}

                <div className="mt-3 text-right">
                  <button
                    type="submit"
                    disabled={submittingCost}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:bg-gray-400 shadow-sm transition"
                  >
                    <span>{submittingCost ? 'Menyimpan...' : '➕ Simpan Modal'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* List Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs text-gray-600 uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                    <th className="px-4 py-3 text-center">Foto Nota</th>
                    <th className="px-4 py-3">Dicatat Oleh</th>
                    {!readOnly && <th className="px-4 py-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={readOnly ? 5 : 6} className="text-center py-6 text-gray-500">
                        Memuat data modal...
                      </td>
                    </tr>
                  ) : costs.length === 0 ? (
                    <tr>
                      <td colSpan={readOnly ? 5 : 6} className="text-center py-6 text-gray-400">
                        Belum ada biaya modal langsung yang dicatat untuk pesanan ini.
                      </td>
                    </tr>
                  ) : (
                    costs.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          Rp {formatRupiah(item.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.proof_image_url ? (
                            <button
                              type="button"
                              onClick={() => {
                                setViewingImage(getImageUrl(item.proof_image_url));
                                setImageViewerOpen(true);
                              }}
                              className="text-xs text-primary-600 hover:text-primary-800 underline font-medium"
                            >
                              Lihat Nota
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {item.created_by_name || 'Admin'}
                        </td>
                        {!readOnly && (
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteCost(item.id)}
                              className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50"
                            >
                              Hapus
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {costs.length > 0 && (
                  <tfoot className="bg-gray-50 font-semibold text-gray-900 border-t border-gray-200">
                    <tr>
                      <td colSpan="2" className="px-4 py-3 text-right text-xs uppercase">
                        Subtotal Modal Langsung:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-primary-700">
                        Rp {formatRupiah(totalDirectCosts)}
                      </td>
                      <td colSpan={readOnly ? 2 : 3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: BAHAN BAKU (PERSEDIAAN) */}
        {activeTab === 'bahan' && (
          <div className="space-y-6">
            {!readOnly && (
              <form onSubmit={handleAddMaterial} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center space-x-1.5">
                  <span>🥬</span>
                  <span>Ambil Bahan Baku dari Stok Persediaan</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-5">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Pilih Bahan Baku <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedItemId}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option value="">-- Pilih Barang dari Master Persediaan --</option>
                      {inventoryItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          [{item.category}] {item.name} - Stok: {item.stock} {item.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Jumlah Terpakai {selectedItemObj ? `(${selectedItemObj.unit})` : ''} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      placeholder="0.00"
                      value={materialQty}
                      onChange={(e) => setMaterialQty(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center pb-2">
                    <label className="inline-flex items-center space-x-2 text-xs font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isConfirmed}
                        onChange={(e) => setIsConfirmed(e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                      />
                      <span>Pilih ✅</span>
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={submittingMaterial || !selectedItemId || !materialQty || !isConfirmed}
                      className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:bg-gray-300 shadow-sm transition"
                    >
                      {submittingMaterial ? 'Memproses...' : 'Potong Stok'}
                    </button>
                  </div>
                </div>

                {selectedItemObj && (
                  <div className="mt-2 text-xs text-gray-500 flex items-center space-x-3">
                    <span>Stok tersedia: <strong>{selectedItemObj.stock} {selectedItemObj.unit}</strong></span>
                    <span>Harga beli terakhir: <strong>Rp {formatRupiah(selectedItemObj.last_price || 0)} / {selectedItemObj.unit}</strong></span>
                    {materialQty && (
                      <span className="text-primary-700 font-semibold">
                        Estimasi HPP: Rp {formatRupiah((parseFloat(materialQty) || 0) * (parseFloat(selectedItemObj.last_price) || 0))}
                      </span>
                    )}
                  </div>
                )}
              </form>
            )}

            {/* Material List Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs text-gray-600 uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Nama Bahan Baku</th>
                    <th className="px-4 py-3 text-center">Jumlah</th>
                    <th className="px-4 py-3 text-right">Harga Satuan</th>
                    <th className="px-4 py-3 text-right">Subtotal HPP</th>
                    {!readOnly && <th className="px-4 py-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={readOnly ? 6 : 7} className="text-center py-6 text-gray-500">
                        Memuat data bahan baku...
                      </td>
                    </tr>
                  ) : materials.length === 0 ? (
                    <tr>
                      <td colSpan={readOnly ? 6 : 7} className="text-center py-6 text-gray-400">
                        Belum ada pemakaian bahan baku persediaan yang dicatat.
                      </td>
                    </tr>
                  ) : (
                    materials.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                            {m.category || 'Umum'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{m.item_name}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-800">
                          {m.quantity} {m.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          Rp {formatRupiah(m.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          Rp {formatRupiah(m.subtotal)}
                        </td>
                        {!readOnly && (
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(m.id)}
                              className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50"
                              title="Hapus dan kembalikan stok"
                            >
                              Batal & Balik Stok
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {materials.length > 0 && (
                  <tfoot className="bg-gray-50 font-semibold text-gray-900 border-t border-gray-200">
                    <tr>
                      <td colSpan="5" className="px-4 py-3 text-right text-xs uppercase">
                        Subtotal Pemakaian Bahan Baku:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-primary-700">
                        Rp {formatRupiah(totalMaterialCosts)}
                      </td>
                      {!readOnly && <td></td>}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Image Viewer for Receipt */}
      <ImageViewer
        imageUrl={viewingImage}
        isOpen={imageViewerOpen}
        onClose={() => {
          setImageViewerOpen(false);
          setViewingImage(null);
        }}
        title="Bukti Nota Modal Pesanan"
      />
    </div>
  );
};

export default OrderCostManagement;
