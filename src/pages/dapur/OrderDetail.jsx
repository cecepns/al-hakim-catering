import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI, orderCostsAPI, inventoryAPI, orderIssuesAPI } from '../../utils/api';
import { parseDeliveryNotes, formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';
import ImageViewer from '../../components/ImageViewer';
import OrderCostManagement from '../../components/OrderCostManagement';
import OrderProcessCostSection from '../../components/OrderProcessCostSection';
import PackagingStandardsSection from '../../components/PackagingStandardsSection';
import OrderDeliveryEquipmentSection from '../../components/OrderDeliveryEquipmentSection';
import OrderIssuesListSection from '../../components/OrderIssuesListSection';
import ReportIssueBox from '../../components/ReportIssueBox';

const DapurOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [viewingImage, setViewingImage] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  // States for Laporkan Kendala
  const [hasIssue, setHasIssue] = useState(false);
  const [issueData, setIssueData] = useState({
    issue_type: '',
    issue_cause: '',
    issue_follow_up: '',
    issue_solution: '',
  });
  const [standaloneIssueChecked, setStandaloneIssueChecked] = useState(false);
  const [standaloneIssueData, setStandaloneIssueData] = useState({
    issue_type: '',
    issue_cause: '',
    issue_follow_up: '',
    issue_solution: '',
  });
  const [submittingIssue, setSubmittingIssue] = useState(false);

  // States for MODAL & HPP on update status diproses (Revisi Gambar 1)
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [modalRows, setModalRows] = useState([]);
  const [materialsState, setMaterialsState] = useState({});

  const fetchInventory = useCallback(async () => {
    try {
      setLoadingInventory(true);
      const res = await inventoryAPI.getItems();
      setInventoryItems(res.data || []);
    } catch (err) {
      console.error('Error fetching inventory for kitchen:', err);
    } finally {
      setLoadingInventory(false);
    }
  }, []);

  const handleAddModalRow = () => {
    setModalRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        amount: '',
        description: '',
        proofFile: null,
        proofPreview: null
      }
    ]);
  };

  const handleRemoveModalRow = (rowId) => {
    setModalRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleUpdateModalRow = (rowId, field, value) => {
    setModalRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    );
  };

  const handleToggleMaterial = (itemId, checked) => {
    setMaterialsState((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        checked,
        quantity: checked ? (prev[itemId]?.quantity || '') : ''
      }
    }));
  };

  const handleQuantityChange = (itemId, quantity) => {
    setMaterialsState((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity,
        checked: parseFloat(quantity) > 0 ? true : (prev[itemId]?.checked || false)
      }
    }));
  };

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getById(id);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      alert('Gagal memuat detail pesanan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    fetchInventory();
  }, [fetchOrder, fetchInventory]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartProcessing = async () => {
    if (!proofFile) {
      alert('Upload bukti foto/video proses terlebih dahulu');
      return;
    }

    if (hasIssue && !issueData.issue_type.trim()) {
      alert('Jenis masalah wajib diisi jika Laporkan kendala dicentang');
      return;
    }

    try {
      setProcessing(true);
      const formData = new FormData();
      formData.append('status', 'diproses');
      formData.append('notes', notes || 'Pesanan mulai diproses dapur');
      formData.append('proof', proofFile);

      if (hasIssue) {
        formData.append('has_issue', 'true');
        formData.append('issue_type', issueData.issue_type.trim());
        formData.append('issue_cause', issueData.issue_cause || '');
        formData.append('issue_follow_up', issueData.issue_follow_up || '');
        formData.append('issue_solution', issueData.issue_solution || '');
      }

      await orderAPI.updateStatus(id, formData);

      // Integrasi MODAL & HPP saat status diproses dapur (Revisi Gambar 1)
      // 1. Simpan modal jika ada yang diisi
      const validModalRows = modalRows.filter((r) => parseFloat(r.amount) > 0);
      for (const row of validModalRows) {
        const costFormData = new FormData();
        costFormData.append('amount', row.amount);
        costFormData.append('description', row.description || `Modal pesanan #${id}`);
        if (row.proofFile) {
          costFormData.append('receipt', row.proofFile);
        }
        await orderCostsAPI.addCost(id, costFormData);
      }

      // 2. Simpan bahan baku jika ada yang dicentang
      const selectedMaterials = Object.entries(materialsState)
        .filter(([, val]) => val?.checked && parseFloat(val?.quantity) > 0)
        .map(([itemId, val]) => ({
          inventory_item_id: itemId,
          quantity: parseFloat(val.quantity)
        }));

      if (selectedMaterials.length > 0) {
        await orderCostsAPI.addMaterial(id, { materials: selectedMaterials });
      }

      alert('Status pesanan berhasil diupdate menjadi Diproses');
      setNotes('');
      setProofFile(null);
      setProofPreview('');
      setModalRows([]);
      setMaterialsState({});
      setHasIssue(false);
      setIssueData({ issue_type: '', issue_cause: '', issue_follow_up: '', issue_solution: '' });
      fetchOrder();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Gagal mengupdate status');
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (hasIssue && !issueData.issue_type.trim()) {
      alert('Jenis masalah wajib diisi jika Laporkan kendala dicentang');
      return;
    }

    if (!window.confirm('Yakin pesanan sudah selesai dan siap dikirim?')) return;

    try {
      setProcessing(true);
      const formData = new FormData();
      formData.append('status', 'siap-kirim');
      formData.append('notes', 'Pesanan selesai diproses dan siap dikirim');

      if (hasIssue) {
        formData.append('has_issue', 'true');
        formData.append('issue_type', issueData.issue_type.trim());
        formData.append('issue_cause', issueData.issue_cause || '');
        formData.append('issue_follow_up', issueData.issue_follow_up || '');
        formData.append('issue_solution', issueData.issue_solution || '');
      }

      await orderAPI.updateStatus(id, formData);
      setHasIssue(false);
      setIssueData({ issue_type: '', issue_cause: '', issue_follow_up: '', issue_solution: '' });
      alert('Pesanan selesai dan siap untuk dikirim!');
      navigate('/dapur/dashboard');
    } catch (error) {
      console.error('Error completing order:', error);
      alert(error.response?.data?.message || 'Gagal menyelesaikan pesanan');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitStandaloneIssue = async () => {
    if (!standaloneIssueData.issue_type.trim()) {
      alert('Jenis masalah wajib diisi');
      return;
    }
    try {
      setSubmittingIssue(true);
      await orderIssuesAPI.create(id, {
        issue_type: standaloneIssueData.issue_type.trim(),
        cause: standaloneIssueData.issue_cause || '',
        follow_up: standaloneIssueData.issue_follow_up || '',
        solution: standaloneIssueData.issue_solution || '',
      });
      alert('Kendala berhasil dilaporkan ke dashboard Admin & Operasional');
      setStandaloneIssueChecked(false);
      setStandaloneIssueData({ issue_type: '', issue_cause: '', issue_follow_up: '', issue_solution: '' });
      fetchOrder();
    } catch (error) {
      console.error('Error reporting standalone issue:', error);
      alert(error.response?.data?.message || 'Gagal melaporkan kendala');
    } finally {
      setSubmittingIssue(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      dibuat: 'bg-blue-100 text-blue-800',
      diproses: 'bg-yellow-100 text-yellow-800',
      'siap-kirim': 'bg-orange-100 text-orange-800',
      dikirim: 'bg-purple-100 text-purple-800',
      selesai: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout role="dapur">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role="dapur">
        <div className="text-center py-12">
          <p className="text-gray-600">Pesanan tidak ditemukan</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="dapur">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail Pesanan #{order.id}</h1>
            <p className="text-gray-600 mt-1">
              {new Date(order.created_at).toLocaleString('id-ID')}
            </p>
          </div>
          <button
            onClick={() => navigate('/dapur/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Kembali
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Status Badge */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Status Pesanan</h2>
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
            </div>

            {/* Item Pesanan */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Item yang Harus Dibuat</h2>
              <div className="space-y-4">
                {order.items?.map((item, index) => {
                  // Parse addons_json if it exists
                  let addons = [];
                  if (item.addons_json) {
                    try {
                      addons = typeof item.addons_json === 'string' 
                        ? JSON.parse(item.addons_json) 
                        : item.addons_json;
                      // Ensure it's an array
                      if (!Array.isArray(addons)) {
                        addons = [];
                      }
                    } catch (error) {
                      console.error('Error parsing addons_json:', error);
                      addons = [];
                    }
                  }

                  return (
                    <div key={index} className="flex items-center py-4 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-lg">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-sm text-gray-600 mt-1">Varian: {item.variant_name}</p>
                        )}
                        {item.variant_notes && (
                          <p className="text-xs text-purple-800 bg-purple-50 px-2 py-0.5 rounded inline-block mt-1">
                            Catatan variasi: {item.variant_notes}
                          </p>
                        )}
                        {addons.length > 0 && (
                          <div className="mt-1">
                            <p className="text-sm font-medium text-gray-700">Add-on:</p>
                            <ul className="text-sm text-gray-600 ml-4 list-disc">
                              {addons.map((addon, addonIndex) => (
                                <li key={addonIndex}>
                                  {addon.name || addon}
                                  {addon.price && (
                                    <span className="text-primary-600 ml-1">
                                      (+Rp {formatRupiah(addon.price)})
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex items-center mt-2">
                          <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
                            Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Catatan Pelanggan */}
            {order.delivery_notes && (() => {
              const notes = parseDeliveryNotes(order.delivery_notes, true);
              if (!notes) return null;
              return (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Catatan Khusus</h3>
                      {Array.isArray(notes) ? (
                        <div className="mt-1 text-sm text-yellow-700 space-y-1">
                          {notes.map((line, idx) => (
                            <p key={idx}>{line}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-yellow-700">{notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Log Aktivitas */}
            {order.statusLogs && order.statusLogs.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Pesanan</h2>
                <div className="space-y-4">
                  {order.statusLogs.map((log, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-sm">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                          <span className="text-sm text-gray-600">
                            {new Date(log.created_at).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">Oleh: {log.handler_name || 'System'}</p>
                        {log.notes && <p className="text-sm text-gray-600 mt-1">{log.notes}</p>}
                        {(log.proof_image_url || log.proof_url) && (
                          <div className="mt-2">
                            <button
                              onClick={() => {
                                setViewingImage(log.proof_image_url || log.proof_url);
                                setImageViewerOpen(true);
                              }}
                              className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Lihat Foto
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standar Pengemasan (Otomatis per Kategori) */}
            <PackagingStandardsSection order={order} canEdit={false} />

            {/* MODAL & HPP PESANAN (Halaman 8 & 9 PDF) */}
            <OrderCostManagement orderId={id} onUpdated={fetchOrder} />

            {/* Checklist Perlengkapan Pengantaran (Dapur) */}
            <OrderDeliveryEquipmentSection orderId={id} mode="dapur" />

            {/* Daftar Kendala Pesanan */}
            <OrderIssuesListSection issues={order.issues} canResolve={false} onResolved={fetchOrder} />
          </div>

          {/* Action Panel */}
          <div className="space-y-6">
            {order.status === 'dibuat' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Mulai Proses</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catatan
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Tambahkan catatan (opsional)..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Bukti Proses *
                    </label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    {proofPreview && (
                      <div className="mt-2">
                        <img
                          src={proofPreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* MODAL & HPP saat mulai diproses (Revisi Gambar 1) */}
                  <OrderProcessCostSection
                    modalRows={modalRows}
                    onAddModalRow={handleAddModalRow}
                    onRemoveModalRow={handleRemoveModalRow}
                    onUpdateModalRow={handleUpdateModalRow}
                    materialsState={materialsState}
                    onToggleMaterial={handleToggleMaterial}
                    onQuantityChange={handleQuantityChange}
                    inventoryItems={inventoryItems}
                    loading={loadingInventory}
                  />

                  <ReportIssueBox
                    checked={hasIssue}
                    onCheckedChange={setHasIssue}
                    values={issueData}
                    onChange={setIssueData}
                  />

                  <button
                    onClick={handleStartProcessing}
                    disabled={!proofFile || processing}
                    className="w-full bg-yellow-600 text-white px-4 py-3 rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 font-semibold transition"
                  >
                    {processing ? 'Memproses...' : 'Mulai Proses Pesanan'}
                  </button>
                </div>
              </div>
            )}

            {order.status === 'diproses' && (
              <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Selesaikan Pesanan</h2>
                <p className="text-sm text-gray-600">
                  Klik tombol di bawah jika pesanan sudah selesai dan siap untuk dikirim
                </p>
                <ReportIssueBox
                  checked={hasIssue}
                  onCheckedChange={setHasIssue}
                  values={issueData}
                  onChange={setIssueData}
                />
                <button
                  onClick={handleComplete}
                  disabled={processing}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold transition"
                >
                  {processing ? 'Memproses...' : 'Pesanan Selesai'}
                </button>
              </div>
            )}

            {/* Standalone Laporkan Kendala (muncul kapan saja) */}
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Kendala Produksi / Dapur</h2>
              <p className="text-xs text-gray-500">
                Laporkan kendala kapan saja tanpa mengubah status pesanan (otomatis masuk ke Admin & Operasional).
              </p>
              <ReportIssueBox
                checked={standaloneIssueChecked}
                onCheckedChange={setStandaloneIssueChecked}
                values={standaloneIssueData}
                onChange={setStandaloneIssueData}
              />
              {standaloneIssueChecked && (
                <button
                  type="button"
                  onClick={handleSubmitStandaloneIssue}
                  disabled={submittingIssue || !standaloneIssueData.issue_type.trim()}
                  className="w-full bg-amber-600 text-white px-4 py-2.5 rounded-lg hover:bg-amber-700 disabled:bg-gray-400 font-semibold text-sm transition"
                >
                  {submittingIssue ? 'Mengirim Laporan...' : 'Kirim Laporan Kendala'}
                </button>
              )}
            </div>
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
        title="Bukti Foto"
      />
    </DashboardLayout>
  );
};

export default DapurOrderDetail;

