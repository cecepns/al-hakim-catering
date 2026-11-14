import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI, orderDpAPI } from '../../utils/api';
import { formatRupiah, parseDeliveryNotes } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';
import ImageViewer from '../../components/ImageViewer';
import InvoiceModal from '../../components/InvoiceModal';
import PackagingStandardsSection from '../../components/PackagingStandardsSection';
import OrderDeliveryEquipmentSection from '../../components/OrderDeliveryEquipmentSection';
import OrderIssuesListSection from '../../components/OrderIssuesListSection';
import ReportIssueBox from '../../components/ReportIssueBox';
import CompletionFeedbackBox from '../../components/CompletionFeedbackBox';

const OperasionalOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [viewingImage, setViewingImage] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [hasIssue, setHasIssue] = useState(false);
  const [issueData, setIssueData] = useState({
    issue_type: '',
    issue_cause: '',
    issue_follow_up: '',
    issue_solution: '',
  });
  const [feedbackData, setFeedbackData] = useState({
    feedback_type: '',
    feedback_rating: 5,
    feedback_notes: '',
    feedback_image: null,
  });

  const [addDpModalOpen, setAddDpModalOpen] = useState(false);
  const [submittingAddDp, setSubmittingAddDp] = useState(false);
  const [addDpData, setAddDpData] = useState({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    proof: null,
    notes: '',
  });

  const handleSaveAddDp = async (e) => {
    e.preventDefault();
    const amountVal = parseFloat(addDpData.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Nominal tambahan DP harus berupa angka lebih dari 0');
      return;
    }
    try {
      setSubmittingAddDp(true);
      const formData = new FormData();
      formData.append('amount', String(amountVal));
      formData.append('payment_date', addDpData.payment_date);
      if (addDpData.notes) formData.append('notes', addDpData.notes);
      if (addDpData.proof) formData.append('proof', addDpData.proof);

      await orderDpAPI.addDp(id, formData);
      alert('Pembayaran DP berhasil ditambahkan');
      setAddDpModalOpen(false);
      setAddDpData({
        amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        proof: null,
        notes: '',
      });
      fetchOrder();
    } catch (err) {
      console.error('Error adding DP:', err);
      alert(err.response?.data?.message || 'Gagal menambahkan DP');
    } finally {
      setSubmittingAddDp(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
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
  };

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

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      alert('Pilih status baru');
      return;
    }

    if (hasIssue && !issueData.issue_type.trim()) {
      alert('Jenis masalah wajib diisi jika Laporkan kendala dicentang');
      return;
    }

    try {
      setUpdating(true);
      const formData = new FormData();
      formData.append('status', newStatus);
      formData.append('notes', notes);
      if (proofFile) {
        formData.append('proof', proofFile);
      }

      if (hasIssue) {
        formData.append('has_issue', 'true');
        formData.append('issue_type', issueData.issue_type.trim());
        formData.append('issue_cause', issueData.issue_cause || '');
        formData.append('issue_follow_up', issueData.issue_follow_up || '');
        formData.append('issue_solution', issueData.issue_solution || '');
        if (issueData.photo) {
          formData.append('issue_photo', issueData.photo);
        }
      }

      if (newStatus === 'selesai' && feedbackData.feedback_type) {
        formData.append('feedback_type', feedbackData.feedback_type);
        formData.append('feedback_rating', String(feedbackData.feedback_rating || 5));
        formData.append('feedback_notes', feedbackData.feedback_notes || '');
        if (feedbackData.feedback_image) {
          formData.append('feedback_image', feedbackData.feedback_image);
        }
      }

      await orderAPI.updateStatus(id, formData);
      alert('Status pesanan berhasil diupdate');
      setStatusModal(false);
      setNewStatus('');
      setNotes('');
      setProofFile(null);
      setProofPreview('');
      setHasIssue(false);
      setIssueData({ issue_type: '', issue_cause: '', issue_follow_up: '', issue_solution: '' });
      setFeedbackData({ feedback_type: '', feedback_rating: 5, feedback_notes: '', feedback_image: null });
      fetchOrder();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Gagal mengupdate status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      dibuat: 'bg-blue-100 text-blue-800',
      diproses: 'bg-yellow-100 text-yellow-800',
      dikirim: 'bg-purple-100 text-purple-800',
      selesai: 'bg-green-100 text-green-800',
      dibatalkan: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout role="operasional">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role="operasional">
        <div className="text-center py-12">
          <p className="text-gray-600">Pesanan tidak ditemukan</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="operasional">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail Pesanan #{order.id}</h1>
            <p className="text-gray-600 mt-1">
              {new Date(order.created_at).toLocaleString('id-ID')}
            </p>
          </div>
          <button
            onClick={() => navigate('/operasional/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Kembali
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Informasi Pesanan */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Informasi Pesanan</h2>
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pelanggan:</span>
                  <span className="font-medium">{order.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{order.customer_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Telepon:</span>
                  <span className="font-medium">{order.customer_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Metode Pembayaran:</span>
                  <span className="font-medium uppercase">{order.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status Pembayaran:</span>
                  <span className="font-medium capitalize">{order.payment_status}</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <div>
                    <span className="text-gray-600 block text-xs">Total DP Masuk:</span>
                    <span className="font-semibold text-green-700 text-sm">
                      Rp {formatRupiah(order.payment_amount || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block text-xs text-right">Sisa Tagihan:</span>
                    <span className="font-bold text-red-600 text-sm">
                      Rp {formatRupiah(Math.max(0, Number(order.final_amount || 0) - Number(order.payment_amount || 0)))}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAddDpModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition"
                  >
                    + Tambah DP
                  </button>
                </div>

                {Array.isArray(order.dp_payments) && order.dp_payments.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-700">Riwayat Tambah DP ({order.dp_payments.length}):</p>
                    {order.dp_payments.map((dp, idx) => (
                      <div key={dp.id || idx} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-semibold text-gray-800">DP {idx + 1}: Rp {formatRupiah(dp.amount)}</span>
                          <span className="text-gray-500 ml-1.5">
                            ({new Date(dp.payment_date || dp.created_at).toLocaleDateString('id-ID')})
                          </span>
                          {dp.notes && <span className="text-gray-600 block text-[11px] mt-0.5">{dp.notes}</span>}
                        </div>
                        {dp.proof_url && (
                          <button
                            type="button"
                            onClick={() => {
                              setViewingImage(dp.proof_url);
                              setImageViewerOpen(true);
                            }}
                            className="text-primary-600 hover:underline font-medium text-xs ml-2"
                          >
                            Bukti
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-2">Alamat Pengiriman</h3>
                <p className="text-gray-700">{order.delivery_address}</p>
                {order.delivery_notes && (() => {
                  const notes = parseDeliveryNotes(order.delivery_notes, true);
                  if (!notes) return null;
                  return (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-600">Catatan: </span>
                      {Array.isArray(notes) ? (
                        <div className="text-sm text-gray-700 mt-1 space-y-1">
                          {notes.map((line, idx) => (
                            <p key={idx}>{line}</p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-700">{notes}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Item Pesanan */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Pesanan</h2>
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
                    <div key={index} className="flex justify-between items-center py-3 border-b">
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-sm text-gray-600">Varian: {item.variant_name}</p>
                        )}
                        {item.variant_notes && (
                          <p className="text-xs text-purple-800 bg-purple-50 px-2 py-0.5 rounded inline-block mt-1">
                            Catatan variasi: {item.variant_notes}
                          </p>
                        )}
                        {Number(item.product_discount_amount) > 0 && (
                          <p className="text-xs text-green-700 mt-0.5">
                            Diskon Produk ({item.discount_percentage}%): -Rp {formatRupiah(item.product_discount_amount)}
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
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">Rp {formatRupiah(item.subtotal)}</p>
                        <p className="text-sm text-gray-600">@ Rp {formatRupiah(item.price)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(() => {
                const totalProductDiscount = (order.items || []).reduce(
                  (sum, it) => sum + (Number(it.product_discount_amount) || 0),
                  0
                );
                const subtotalAfterProduct = Number(order.total_amount || 0);
                const normalSubtotal = subtotalAfterProduct + totalProductDiscount;
                return (
                  <div className="mt-6 space-y-2">
                    {totalProductDiscount > 0 && (
                      <>
                        <div className="flex justify-between text-gray-600 text-sm">
                          <span>Harga Awal:</span>
                          <span>Rp {formatRupiah(normalSubtotal)}</span>
                        </div>
                        <div className="flex justify-between text-green-600 text-sm">
                          <span>Diskon Produk:</span>
                          <span>- Rp {formatRupiah(totalProductDiscount)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-gray-700">
                      <span>Subtotal:</span>
                      <span>Rp {formatRupiah(order.total_amount)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>
                          Diskon Voucher{order.voucher_code ? ` (${order.voucher_code})` : ''}:
                        </span>
                        <span>- Rp {formatRupiah(order.discount_amount)}</span>
                      </div>
                    )}
                    {order.cashback_used > 0 && (
                      <div className="flex justify-between text-primary-600">
                        <span>Cashback Digunakan:</span>
                        <span>- Rp {formatRupiah(order.cashback_used)}</span>
                      </div>
                    )}
                    {Number(order.margin_amount) > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Margin Tambahan:</span>
                        <span>+ Rp {formatRupiah(order.margin_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                      <span>Total:</span>
                      <span>Rp {formatRupiah(order.final_amount)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Log Aktivitas */}
            {order.statusLogs && order.statusLogs.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Log Aktivitas</h2>
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

            {/* Standar Pengemasan (Otomatis per Kategori, Editable oleh Operasional) */}
            <PackagingStandardsSection order={order} canEdit={true} />

            {/* Rekap Perlengkapan Pengantaran (Editable oleh Operasional) */}
            <OrderDeliveryEquipmentSection orderId={id} mode="operasional" />

            {/* Daftar Laporan Kendala Pesanan */}
            <OrderIssuesListSection issues={order.issues} canResolve={true} onResolved={fetchOrder} />
          </div>

          {/* Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Aksi</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setStatusModal(true)}
                  className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
                >
                  Update Status
                </button>
                {order.status !== 'dibatalkan' && (
                  <button
                    onClick={() => setInvoiceModalOpen(true)}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Lihat Faktur/Nota
                  </button>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Panduan:</h3>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Upload bukti saat update status</li>
                <li>• Tambahkan catatan jika perlu</li>
                <li>• Pastikan informasi akurat</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Update Status */}
        {statusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status Pesanan</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status Baru *
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Pilih Status</option>
                    <option value="dibuat">Dibuat</option>
                    <option value="diproses">Diproses</option>
                    <option value="dikirim">Dikirim</option>
                    <option value="selesai">Selesai</option>
                    <option value="dibatalkan">Dibatalkan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Tambahkan catatan..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Bukti (Foto/Video)
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

                {newStatus === 'selesai' && (
                  <CompletionFeedbackBox values={feedbackData} onChange={setFeedbackData} />
                )}

                <ReportIssueBox
                  checked={hasIssue}
                  onCheckedChange={setHasIssue}
                  values={issueData}
                  onChange={setIssueData}
                />

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setStatusModal(false);
                      setNewStatus('');
                      setNotes('');
                      setProofFile(null);
                      setProofPreview('');
                      setHasIssue(false);
                      setIssueData({ issue_type: '', issue_cause: '', issue_follow_up: '', issue_solution: '' });
                      setFeedbackData({ feedback_type: '', feedback_rating: 5, feedback_notes: '', feedback_image: null });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || updating}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
                  >
                    {updating ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Tambah DP (Revisi Klien) */}
        {addDpModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Tambah Pembayaran DP</h3>
              <p className="text-xs text-gray-500 mb-4">
                Catat cicilan/tambahan DP pesanan #{order.id}. Otomatis masuk ke Arus Kas & Neraca serta mengupdate sisa tagihan pada Nota/Faktur.
              </p>

              <form onSubmit={handleSaveAddDp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nominal Tambahan DP (Rp) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={addDpData.amount}
                    onChange={(e) => setAddDpData({ ...addDpData, amount: e.target.value })}
                    placeholder="Contoh: 500000"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal Pembayaran *
                  </label>
                  <input
                    type="date"
                    required
                    value={addDpData.payment_date}
                    onChange={(e) => setAddDpData({ ...addDpData, payment_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Bukti Pembayaran / Transfer (Opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAddDpData({ ...addDpData, proof: e.target.files?.[0] || null })}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={addDpData.notes}
                    onChange={(e) => setAddDpData({ ...addDpData, notes: e.target.value })}
                    placeholder="Contoh: Transfer DP tahap 2 via BRI"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="p-3 bg-purple-50 rounded-lg text-xs text-purple-900 space-y-1">
                  <div className="flex justify-between">
                    <span>Total Tagihan:</span>
                    <span className="font-semibold">Rp {formatRupiah(order.final_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DP Saat Ini:</span>
                    <span className="font-semibold">Rp {formatRupiah(order.payment_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-primary-700 pt-1 border-t border-purple-200">
                    <span>Sisa Tagihan Setelah Ini:</span>
                    <span>
                      Rp {formatRupiah(Math.max(0, Number(order.final_amount || 0) - (Number(order.payment_amount || 0) + (Number(addDpData.amount) || 0))))}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddDpModalOpen(false)}
                    disabled={submittingAddDp}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAddDp || !addDpData.amount}
                    className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {submittingAddDp ? 'Menyimpan...' : 'Simpan Tambah DP'}
                  </button>
                </div>
              </form>
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
          title="Bukti Foto"
        />

        {/* Invoice Modal */}
        <InvoiceModal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          orderId={id}
        />
      </div>
    </DashboardLayout>
  );
};

export default OperasionalOrderDetail;

