import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Truck, CheckSquare, Square, Plus, Save, RotateCcw } from 'lucide-react';
import { equipmentAPI } from '../utils/api';

const OrderDeliveryEquipmentSection = ({ orderId, mode = 'readonly' }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  // Dapur draft map: { [equipment_id]: { checked, qty_brought, notes } }
  const [dapurDraft, setDapurDraft] = useState({});
  // Kurir draft map: { [equipment_id]: { qty_returned, qty_borrowed, notes } }
  const [kurirDraft, setKurirDraft] = useState({});

  // Quick-add new equipment master item (available for dapur/admin/operasional)
  const [showAddMaster, setShowAddMaster] = useState(false);
  const [newMaster, setNewMaster] = useState({ name: '', unit: 'Pcs', stock: 0 });
  const [creatingMaster, setCreatingMaster] = useState(false);

  const fetchOrderEquipment = async () => {
    try {
      setLoading(true);
      const res = await equipmentAPI.getByOrder(orderId);
      const items = res.data?.items || [];
      const cat = res.data?.catalog || [];
      setOrderItems(items);
      setCatalog(cat);

      // Build Dapur draft map covering catalog items + any existing order items whose master was deactivated
      const orderByEq = new Map(items.map((it) => [Number(it.equipment_id), it]));
      const nextDapur = {};
      cat.forEach((c) => {
        const existing = orderByEq.get(Number(c.id));
        nextDapur[c.id] = {
          checked: existing ? Number(existing.qty_brought) > 0 : false,
          qty_brought: existing ? Number(existing.qty_brought) : 0,
          notes: existing?.notes || '',
        };
      });
      items.forEach((it) => {
        if (!nextDapur[it.equipment_id]) {
          nextDapur[it.equipment_id] = {
            checked: Number(it.qty_brought) > 0,
            qty_brought: Number(it.qty_brought),
            notes: it.notes || '',
          };
        }
      });
      setDapurDraft(nextDapur);

      // Build Kurir draft map for items brought on delivery
      const nextKurir = {};
      items.forEach((it) => {
        const brought = Number(it.qty_brought) || 0;
        const returned = Number(it.qty_returned) || 0;
        const borrowed = Number(it.qty_borrowed) || 0;
        nextKurir[it.equipment_id] = {
          qty_returned: returned,
          qty_borrowed: borrowed,
          notes: it.notes || '',
          checked: Boolean(it.checked_by_kurir) || returned > 0 || borrowed > 0,
          brought,
        };
      });
      setKurirDraft(nextKurir);
    } catch (error) {
      console.error('Error fetching order delivery equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrderEquipment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Combined equipment list for Dapur (active catalog + inactive items that were already assigned to this order)
  const dapurRows = [
    ...catalog,
    ...orderItems
      .filter((it) => !catalog.some((c) => Number(c.id) === Number(it.equipment_id)))
      .map((it) => ({
        id: it.equipment_id,
        name: it.equipment_name,
        unit: it.equipment_unit || 'Pcs',
      })),
  ];

  const handleDapurToggle = (eqId) => {
    setDapurDraft((prev) => {
      const cur = prev[eqId] || { checked: false, qty_brought: 0, notes: '' };
      const nextChecked = !cur.checked;
      return {
        ...prev,
        [eqId]: {
          ...cur,
          checked: nextChecked,
          qty_brought: nextChecked ? (cur.qty_brought > 0 ? cur.qty_brought : 1) : 0,
        },
      };
    });
  };

  const handleDapurQtyChange = (eqId, rawVal) => {
    const qty = Math.max(0, parseInt(rawVal, 10) || 0);
    setDapurDraft((prev) => ({
      ...prev,
      [eqId]: {
        ...(prev[eqId] || { notes: '' }),
        checked: qty > 0,
        qty_brought: qty,
      },
    }));
  };

  const handleDapurNoteChange = (eqId, val) => {
    setDapurDraft((prev) => ({
      ...prev,
      [eqId]: {
        ...(prev[eqId] || { checked: false, qty_brought: 0 }),
        notes: val,
      },
    }));
  };

  const handleSaveDapur = async () => {
    try {
      setSaving(true);
      const itemsPayload = Object.entries(dapurDraft)
        .filter(([, v]) => v.checked && Number(v.qty_brought) > 0)
        .map(([eqId, v]) => ({
          equipment_id: Number(eqId),
          qty_brought: Number(v.qty_brought),
          notes: v.notes || null,
        }));
      await equipmentAPI.saveForOrder(orderId, {
        mode: 'dapur',
        items: itemsPayload,
      });
      toast.success('Checklist perlengkapan dibawa berhasil disimpan');
      await fetchOrderEquipment();
    } catch (error) {
      console.error('Error saving dapur equipment:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan perlengkapan');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMasterEquipment = async (e) => {
    e.preventDefault();
    if (!newMaster.name.trim()) {
      toast.error('Nama peralatan wajib diisi');
      return;
    }
    try {
      setCreatingMaster(true);
      const res = await equipmentAPI.create({
        name: newMaster.name.trim(),
        unit: newMaster.unit || 'Pcs',
        stock: parseInt(newMaster.stock, 10) || 0,
      });
      const created = res.data?.data;
      toast.success('Peralatan baru berhasil ditambahkan ke daftar master');
      setNewMaster({ name: '', unit: 'Pcs', stock: 0 });
      setShowAddMaster(false);
      await fetchOrderEquipment();
      if (created?.id) {
        setDapurDraft((prev) => ({
          ...prev,
          [created.id]: { checked: true, qty_brought: 1, notes: '' },
        }));
      }
    } catch (error) {
      console.error('Error adding equipment item:', error);
      toast.error(error.response?.data?.message || 'Gagal menambah peralatan');
    } finally {
      setCreatingMaster(false);
    }
  };

  const handleKurirSetStatus = (eqId, brought, type) => {
    setKurirDraft((prev) => ({
      ...prev,
      [eqId]: {
        ...(prev[eqId] || { notes: '' }),
        qty_returned: type === 'returned' ? brought : 0,
        qty_borrowed: type === 'borrowed' ? brought : 0,
        checked: true,
        brought,
      },
    }));
  };

  const handleKurirReturnedChange = (eqId, brought, rawVal) => {
    const val = Math.min(brought, Math.max(0, parseInt(rawVal, 10) || 0));
    setKurirDraft((prev) => ({
      ...prev,
      [eqId]: {
        ...(prev[eqId] || { notes: '' }),
        qty_returned: val,
        qty_borrowed: Math.max(0, brought - val),
        checked: true,
        brought,
      },
    }));
  };

  const handleKurirBorrowedChange = (eqId, brought, rawVal) => {
    const val = Math.min(brought, Math.max(0, parseInt(rawVal, 10) || 0));
    setKurirDraft((prev) => ({
      ...prev,
      [eqId]: {
        ...(prev[eqId] || { notes: '' }),
        qty_borrowed: val,
        qty_returned: Math.max(0, brought - val),
        checked: true,
        brought,
      },
    }));
  };

  const handleSaveKurir = async () => {
    try {
      setSaving(true);
      const itemsPayload = orderItems.map((it) => {
        const draft = kurirDraft[it.equipment_id];
        const brought = Number(it.qty_brought) || 0;
        const returned = draft ? draft.qty_returned : Number(it.qty_returned) || 0;
        const borrowed = draft ? draft.qty_borrowed : Math.max(0, brought - returned);
        return {
          equipment_id: it.equipment_id,
          qty_returned: returned,
          qty_borrowed: borrowed,
          notes: draft?.notes || it.notes || null,
        };
      });
      await equipmentAPI.saveForOrder(orderId, {
        mode: 'kurir',
        items: itemsPayload,
      });
      toast.success('Status pengembalian & peminjaman peralatan berhasil disimpan');
      await fetchOrderEquipment();
    } catch (error) {
      console.error('Error saving kurir equipment:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan checklist kurir');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReturned = async (item) => {
    if (!window.confirm(`Tandai ${item.qty_borrowed} ${item.equipment_unit || ''} ${item.equipment_name} sudah kembali?`)) {
      return;
    }
    try {
      await equipmentAPI.markReturned(orderId, item.id, { return_qty: item.qty_borrowed });
      toast.success(`${item.equipment_name} ditandai sudah kembali`);
      await fetchOrderEquipment();
    } catch (error) {
      console.error('Error marking equipment returned:', error);
      toast.error(error.response?.data?.message || 'Gagal memperbarui pengembalian');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-purple-700" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === 'dapur'
                ? 'Checklist Perlengkapan Dibawa Pengantaran'
                : mode === 'kurir'
                ? 'Checklist Perlengkapan Pengantaran (Kurir)'
                : 'Perlengkapan Pengantaran'}
            </h2>
            <p className="text-xs text-gray-500">
              {mode === 'dapur'
                ? 'Centang perlengkapan yang dibawa saat pengantaran beserta jumlahnya'
                : mode === 'kurir'
                ? 'Catat jumlah peralatan yang kembali saat diterima dan yang masih dipinjam pelanggan'
                : 'Daftar peralatan yang dibawa saat pengantaran, kembali, dan sedang dipinjam'}
            </p>
          </div>
        </div>

        {mode === 'dapur' && (
          <button
            type="button"
            onClick={() => setShowAddMaster(!showAddMaster)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddMaster ? 'Tutup Tambah Alat' : 'Tambah Alat Baru'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-4">Memuat daftar perlengkapan...</p>
      ) : mode === 'dapur' ? (
        <div className="space-y-4">
          {showAddMaster && (
            <form
              onSubmit={handleCreateMasterEquipment}
              className="p-4 bg-purple-50 border border-purple-200 rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nama Peralatan *
                </label>
                <input
                  type="text"
                  value={newMaster.name}
                  onChange={(e) => setNewMaster({ ...newMaster, name: e.target.value })}
                  placeholder="Contoh: Wajan Besar / Box Container"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Satuan
                </label>
                <input
                  type="text"
                  value={newMaster.unit}
                  onChange={(e) => setNewMaster({ ...newMaster, unit: e.target.value })}
                  placeholder="Pcs / Unit"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={creatingMaster}
                className="px-4 py-2 text-sm font-medium bg-purple-700 text-white rounded-lg hover:bg-purple-800 disabled:opacity-50"
              >
                {creatingMaster ? 'Menambah...' : 'Simpan Alat'}
              </button>
            </form>
          )}

          {dapurRows.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">
              Belum ada daftar peralatan. Klik &ldquo;Tambah Alat Baru&rdquo; untuk menambahkan peralatan.
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Perlengkapan</th>
                    <th className="px-4 py-3 text-center w-36">Jumlah Dibawa</th>
                    <th className="px-4 py-3 text-left">Catatan (Opsional)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dapurRows.map((eq) => {
                    const draft = dapurDraft[eq.id] || { checked: false, qty_brought: 0, notes: '' };
                    return (
                      <tr key={eq.id} className={draft.checked ? 'bg-purple-50/50' : ''}>
                        <td className="px-4 py-3">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.checked)}
                              onChange={() => handleDapurToggle(eq.id)}
                              className="w-4 h-4 text-purple-700 rounded focus:ring-purple-500"
                            />
                            <span className="font-medium text-gray-900">
                              {eq.name}{' '}
                              <span className="text-xs text-gray-500 font-normal">
                                ({eq.unit || 'Pcs'})
                              </span>
                            </span>
                          </label>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={draft.qty_brought || ''}
                            onChange={(e) => handleDapurQtyChange(eq.id, e.target.value)}
                            placeholder="0"
                            className="w-24 px-2.5 py-1.5 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={draft.notes || ''}
                            onChange={(e) => handleDapurNoteChange(eq.id, e.target.value)}
                            placeholder="Keterangan..."
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveDapur}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-lg hover:bg-purple-800 text-sm font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Perlengkapan Dibawa'}
            </button>
          </div>
        </div>
      ) : mode === 'kurir' ? (
        orderItems.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            Belum ada perlengkapan pengantaran yang dicatat Dapur untuk pesanan ini.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Perlengkapan</th>
                    <th className="px-4 py-3 text-center">Dibawa</th>
                    <th className="px-4 py-3 text-center">Kembali</th>
                    <th className="px-4 py-3 text-center">Dipinjam</th>
                    <th className="px-4 py-3 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orderItems.map((it) => {
                    const brought = Number(it.qty_brought) || 0;
                    const draft = kurirDraft[it.equipment_id] || {
                      qty_returned: Number(it.qty_returned) || 0,
                      qty_borrowed: Number(it.qty_borrowed) || 0,
                    };
                    const returned = Number(draft.qty_returned) || 0;
                    const borrowed = Number(draft.qty_borrowed) || 0;
                    return (
                      <tr key={it.equipment_id} className={borrowed > 0 ? 'bg-amber-50/50' : ''}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{it.equipment_name}</div>
                          <div className="text-xs text-gray-500">{it.equipment_unit || 'Pcs'}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-900">
                          {brought}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            {returned > 0 ? (
                              <CheckSquare className="w-4 h-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <input
                              type="number"
                              min="0"
                              max={brought}
                              value={returned}
                              onChange={(e) =>
                                handleKurirReturnedChange(it.equipment_id, brought, e.target.value)
                              }
                              className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            {borrowed > 0 ? (
                              <CheckSquare className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <input
                              type="number"
                              min="0"
                              max={brought}
                              value={borrowed}
                              onChange={(e) =>
                                handleKurirBorrowedChange(it.equipment_id, brought, e.target.value)
                              }
                              className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleKurirSetStatus(it.equipment_id, brought, 'returned')}
                              className={`px-2 py-1 text-xs rounded border ${
                                returned === brought && borrowed === 0
                                  ? 'bg-green-600 text-white border-green-600'
                                  : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                              }`}
                            >
                              Kembali Semua
                            </button>
                            <button
                              type="button"
                              onClick={() => handleKurirSetStatus(it.equipment_id, brought, 'borrowed')}
                              className={`px-2 py-1 text-xs rounded border ${
                                borrowed === brought && returned === 0
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                              }`}
                            >
                              Dipinjam
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                Peralatan berstatus &ldquo;Dipinjam&rdquo; otomatis masuk ke Rekap Peralatan Dipinjam hingga dikembalikan.
              </p>
              <button
                type="button"
                onClick={handleSaveKurir}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-lg hover:bg-purple-800 text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan Checklist Kurir'}
              </button>
            </div>
          </div>
        )
      ) : orderItems.length === 0 ? (
        <p className="text-sm text-gray-500">
          Belum ada perlengkapan pengantaran yang dicatat untuk pesanan ini.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Perlengkapan</th>
                <th className="px-4 py-3 text-center">Dibawa</th>
                <th className="px-4 py-3 text-center">Kembali</th>
                <th className="px-4 py-3 text-center">Dipinjam</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orderItems.map((it) => {
                const returned = Number(it.qty_returned) || 0;
                const borrowed = Number(it.qty_borrowed) || 0;
                return (
                  <tr key={it.id} className={borrowed > 0 ? 'bg-amber-50/40' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {it.equipment_name}{' '}
                      <span className="text-xs text-gray-500 font-normal">
                        ({it.equipment_unit || 'Pcs'})
                      </span>
                      {it.notes && <p className="text-xs text-gray-500 mt-0.5">{it.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{it.qty_brought}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                        {returned > 0 ? (
                          <CheckSquare className="w-4 h-4 text-green-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                        {returned}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          borrowed > 0 ? 'text-amber-700' : 'text-gray-500'
                        }`}
                      >
                        {borrowed > 0 ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                        {borrowed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {borrowed > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleMarkReturned(it)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700"
                        >
                          <RotateCcw className="w-3 h-3" /> Tandai Kembali
                        </button>
                      ) : returned > 0 ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                          Sudah Kembali
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                          Menunggu Cek Kurir
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderDeliveryEquipmentSection;

