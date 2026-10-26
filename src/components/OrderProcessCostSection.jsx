import { useState, useId } from 'react';
import { formatRupiah } from '../utils/formatHelper';

/**
 * OrderProcessCostSection
 * Form MODAL & BAHAN BAKU yang disederhanakan sesuai revisi client:
 * - MODAL: Harga | Keterangan | Foto Nota + Tambah Transaksi
 * - BAHAN BAKU: Dikelompokkan berdasarkan Kategori -> Nama Bahan, Centang (Pilih ✅), Jumlah
 * - Tabel tidak wajib diisi
 * - Otomatis terintegrasi ke Neraca, Arus Kas, Laba Rugi, dan pemotongan stok persediaan
 */
const OrderProcessCostSection = ({
  modalRows = [],
  onAddModalRow,
  onRemoveModalRow,
  onUpdateModalRow,
  materialsState = {},
  onToggleMaterial,
  onQuantityChange,
  inventoryItems = [],
  loading = false
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');

  // Group inventory items by category
  const categoriesMap = inventoryItems.reduce((acc, item) => {
    const cat = (item.category || 'Lain-lain').trim();
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const categories = Object.keys(categoriesMap).sort();

  // Filter categories and items if search is active
  const filteredCategories = categories.filter((cat) => {
    if (activeCategoryFilter && cat !== activeCategoryFilter) return false;
    if (!materialSearch) return true;
    const searchLower = materialSearch.toLowerCase();
    const hasMatch = categoriesMap[cat].some(
      (item) => item.name.toLowerCase().includes(searchLower)
    );
    return hasMatch || cat.toLowerCase().includes(searchLower);
  });

  // Calculate selected materials count and estimated subtotal
  const selectedMaterialsList = Object.entries(materialsState)
    .filter(([_, val]) => val?.checked && parseFloat(val?.quantity) > 0)
    .map(([id, val]) => {
      const item = inventoryItems.find((i) => i.id === parseInt(id));
      const qty = parseFloat(val.quantity) || 0;
      const unitPrice = parseFloat(item?.last_price || 0);
      return {
        ...item,
        qty,
        subtotal: qty * unitPrice
      };
    });

  const totalModalAmount = modalRows.reduce(
    (sum, r) => sum + (parseFloat(r.amount) || 0),
    0
  );
  const totalBahanSubtotal = selectedMaterialsList.reduce(
    (sum, m) => sum + m.subtotal,
    0
  );

  return (
    <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-4 space-y-5 text-left">
      {/* Header MODAL & HPP */}
      <div className="border-b border-amber-200 pb-3">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-amber-950 flex items-center space-x-2">
            <span>💰</span>
            <span>MODAL & HPP PESANAN</span>
          </h4>
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
            Opsional (Tidak wajib diisi)
          </span>
        </div>
        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
          Tambahkan biaya modal belanja langsung atau centang bahan baku yang digunakan dari persediaan.
        </p>

        {/* Ringkasan Integrasi Keuangan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 text-[11px] text-amber-900 bg-white/70 p-2.5 rounded-lg border border-amber-200">
          <div>
            <span className="font-bold text-amber-950">📦 Modal Langsung:</span>
            <ul className="list-disc list-inside text-gray-700 ml-1 mt-0.5 space-y-0.5">
              <li>Neraca: Debit HPP, Kredit Kas</li>
              <li>Arus Kas: Operasi - Biaya Operasional</li>
              <li>Laba Rugi: HPP bahan langsung</li>
            </ul>
          </div>
          <div>
            <span className="font-bold text-amber-950">🥬 Bahan Baku Persediaan:</span>
            <ul className="list-disc list-inside text-gray-700 ml-1 mt-0.5 space-y-0.5">
              <li>Stok berkurang & tercatat kartu stok / opname</li>
              <li>Neraca: Debit HPP, Kredit Persediaan</li>
              <li>Laba Rugi: Bahan persediaan terpakai (Harga rata-rata)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SEKSI 1: MODAL */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center space-x-1.5">
              <span>💵</span>
              <span>MODAL (Biaya Langsung)</span>
            </h5>
            <span className="text-[11px] text-gray-500">Harga | Keterangan | Foto Nota</span>
          </div>
          {modalRows.length > 0 && (
            <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
              Total: Rp {formatRupiah(totalModalAmount)}
            </span>
          )}
        </div>

        {modalRows.length === 0 ? (
          <div className="bg-white rounded-lg p-3 text-center border border-dashed border-gray-300">
            <p className="text-xs text-gray-500 mb-2">
              Belum ada biaya modal belanja langsung yang ditambahkan.
            </p>
            <button
              type="button"
              onClick={onAddModalRow}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition"
            >
              <span>➕ Tambah Transaksi Modal</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[11px] font-bold text-gray-600 px-2 uppercase">
              <div className="col-span-3">Harga (Rp) *</div>
              <div className="col-span-5">Keterangan *</div>
              <div className="col-span-3">Foto Nota</div>
              <div className="col-span-1 text-center">Hapus</div>
            </div>

            {modalRows.map((row, idx) => (
              <div
                key={row.id || idx}
                className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
              >
                {/* Harga */}
                <div className="sm:col-span-3">
                  <label className="sm:hidden block text-[10px] font-bold text-gray-600 mb-0.5">
                    Harga (Rp) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="Contoh: 150000"
                    value={row.amount || ''}
                    onChange={(e) => onUpdateModalRow(row.id, 'amount', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-semibold"
                  />
                </div>

                {/* Keterangan */}
                <div className="sm:col-span-5">
                  <label className="sm:hidden block text-[10px] font-bold text-gray-600 mb-0.5">
                    Keterangan *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Belanja bumbu pasar subuh"
                    value={row.description || ''}
                    onChange={(e) => onUpdateModalRow(row.id, 'description', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Foto Nota */}
                <div className="sm:col-span-3">
                  <label className="sm:hidden block text-[10px] font-bold text-gray-600 mb-0.5">
                    Foto Nota
                  </label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      id={`nota-file-${row.id}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            onUpdateModalRow(row.id, 'proofFile', file);
                            onUpdateModalRow(row.id, 'proofPreview', reader.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-[10px] text-gray-500 file:mr-1.5 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                    />
                    {row.proofPreview && (
                      <div className="relative flex-shrink-0">
                        <img
                          src={row.proofPreview}
                          alt="Nota"
                          className="w-7 h-7 object-cover rounded border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateModalRow(row.id, 'proofFile', null);
                            onUpdateModalRow(row.id, 'proofPreview', null);
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 text-[9px] flex items-center justify-center"
                          title="Hapus foto"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tombol Hapus Row */}
                <div className="sm:col-span-1 text-right sm:text-center">
                  <button
                    type="button"
                    onClick={() => onRemoveModalRow(row.id)}
                    className="text-red-500 hover:text-red-700 p-1 text-xs rounded hover:bg-red-50 transition"
                    title="Hapus baris modal ini"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            <div className="text-left pt-1">
              <button
                type="button"
                onClick={onAddModalRow}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 shadow-sm transition"
              >
                <span>➕ Tambah Transaksi Modal</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SEKSI 2: BAHAN BAKU */}
      <div className="space-y-3 pt-3 border-t border-amber-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center space-x-1.5">
              <span>🥬</span>
              <span>BAHAN BAKU (Dari Stok Persediaan)</span>
            </h5>
            <span className="text-[11px] text-gray-500">
              Kategori | Nama Bahan | Pilih ✅ | Jumlah
            </span>
          </div>

          {selectedMaterialsList.length > 0 && (
            <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center space-x-2">
              <span>{selectedMaterialsList.length} bahan dipilih</span>
              <span>•</span>
              <span>Est. HPP: Rp {formatRupiah(totalBahanSubtotal)}</span>
            </div>
          )}
        </div>

        {/* Filter / Search Cepat untuk Bahan Baku */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Cari bahan baku..."
            value={materialSearch}
            onChange={(e) => setMaterialSearch(e.target.value)}
            className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white flex-1 min-w-[140px]"
          />
          <select
            value={activeCategoryFilter}
            onChange={(e) => setActiveCategoryFilter(e.target.value)}
            className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Semua Kategori ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c} ({categoriesMap[c]?.length || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Daftar Bahan Dikelompokkan per Kategori */}
        {loading ? (
          <div className="text-center py-6 text-xs text-gray-500">
            Memuat daftar persediaan barang...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white rounded-lg p-4 text-center text-xs text-gray-500 border border-gray-200">
            Tidak ada bahan baku yang cocok dengan pencarian.
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {filteredCategories.map((categoryName) => {
              const items = categoriesMap[categoryName] || [];
              const searchLower = materialSearch.toLowerCase();
              const visibleItems = items.filter(
                (item) =>
                  !materialSearch ||
                  item.name.toLowerCase().includes(searchLower) ||
                  categoryName.toLowerCase().includes(searchLower)
              );

              if (visibleItems.length === 0) return null;

              // Check if all visible items are selected
              const allChecked = visibleItems.every(
                (it) => materialsState[it.id]?.checked
              );

              return (
                <div
                  key={categoryName}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  {/* Category Header */}
                  <div className="bg-gray-100/80 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-800 flex items-center space-x-1.5">
                      <span>📁</span>
                      <span>{categoryName}</span>
                      <span className="text-[10px] font-normal text-gray-500">
                        ({visibleItems.length} item)
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        const targetVal = !allChecked;
                        visibleItems.forEach((it) => {
                          onToggleMaterial(it.id, targetVal);
                        });
                      }}
                      className="text-[10px] text-primary-700 hover:text-primary-900 font-semibold hover:underline"
                    >
                      {allChecked ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </button>
                  </div>

                  {/* List of items in this category */}
                  <div className="divide-y divide-gray-100">
                    {visibleItems.map((item) => {
                      const isChecked = !!materialsState[item.id]?.checked;
                      const qtyVal = materialsState[item.id]?.quantity || '';

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between px-3 py-2 transition ${
                            isChecked ? 'bg-amber-50/60' : 'hover:bg-gray-50'
                          }`}
                        >
                          {/* Nama Bahan & Checkbox */}
                          <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                            <input
                              type="checkbox"
                              id={`mat-item-${item.id}`}
                              checked={isChecked}
                              onChange={(e) => onToggleMaterial(item.id, e.target.checked)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4 cursor-pointer"
                            />
                            <label
                              htmlFor={`mat-item-${item.id}`}
                              className="text-xs font-medium text-gray-800 cursor-pointer truncate"
                            >
                              {item.name}
                            </label>
                          </div>

                          {/* Input Jumlah */}
                          <div className="flex items-center space-x-1.5 w-32 flex-shrink-0">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              placeholder="0"
                              value={qtyVal}
                              onChange={(e) => onQuantityChange(item.id, e.target.value)}
                              className={`w-full px-2 py-1 text-xs border rounded-lg focus:ring-2 focus:ring-primary-500 font-semibold text-right ${
                                isChecked
                                  ? 'border-primary-400 bg-white'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            />
                            <span className="text-[11px] text-gray-600 font-medium min-w-[28px]">
                              {item.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderProcessCostSection;
