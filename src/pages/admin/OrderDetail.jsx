import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import { formatRupiah, parseDeliveryNotes, formatDate } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';
import ImageViewer from '../../components/ImageViewer';
import InvoiceModal from '../../components/InvoiceModal';

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [paymentStatusModal, setPaymentStatusModal] = useState(false);
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

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

  const handleEditNotes = () => {
    // Extract kitchen notes or admin notes from delivery_notes
    let existingNotes = '';
    if (order?.delivery_notes) {
      try {
        const parsed = typeof order.delivery_notes === 'string' && order.delivery_notes.trim().startsWith('{')
          ? JSON.parse(order.delivery_notes)
          : { notes: order.delivery_notes };
        existingNotes = parsed.kitchen_notes || parsed.admin_notes || parsed.notes || '';
      } catch {
        existingNotes = order.delivery_notes || '';
      }
    }
    setEditingNotes(true);
    setNotesValue(existingNotes);
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await orderAPI.updateNotes(id, { notes: notesValue });
      alert('Catatan berhasil disimpan');
      setEditingNotes(false);
      setNotesValue('');
      fetchOrder();
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Gagal menyimpan catatan');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelEditNotes = () => {
    setEditingNotes(false);
    setNotesValue('');
  };

  const getNotesDisplay = () => {
    if (!order?.delivery_notes) return null;
    try {
      const parsed = typeof order.delivery_notes === 'string' && order.delivery_notes.trim().startsWith('{')
        ? JSON.parse(order.delivery_notes)
        : { notes: order.delivery_notes };
      return parsed.kitchen_notes || parsed.admin_notes || parsed.notes || null;
    } catch {
      return order.delivery_notes || null;
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;

    try {
      setUpdating(true);
      const formData = new FormData();
      formData.append('status', newStatus);
      formData.append('notes', notes);
      if (proofFile) {
        formData.append('proof', proofFile);
      }
      
      await orderAPI.updateStatus(id, formData);
      alert('Status pesanan berhasil diupdate');
      setStatusModal(false);
      setNewStatus('');
      setNotes('');
      setProofFile(null);
      setProofPreview(null);
      fetchOrder();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Gagal mengupdate status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentStatusUpdate = async () => {
    if (!newPaymentStatus) return;

    try {
      setUpdatingPaymentStatus(true);
      await orderAPI.updatePaymentStatus(id, { payment_status: newPaymentStatus });
      alert('Status pembayaran berhasil diupdate');
      setPaymentStatusModal(false);
      setNewPaymentStatus('');
      fetchOrder();
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert(error.response?.data?.message || 'Gagal mengupdate status pembayaran');
    } finally {
      setUpdatingPaymentStatus(false);
    }
  };

  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
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

  const getPaymentStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-orange-100 text-orange-800',
      paid: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      partial: 'Partial',
      paid: 'Lunas',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role="admin">
        <div className="text-center py-12">
          <p className="text-gray-600">Pesanan tidak ditemukan</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail Pesanan #{order.id}</h1>
            <p className="text-gray-600 mt-1">
              {formatDate(order.created_at)}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/orders')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Kembali
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Informasi Pesanan</h2>
                <span
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pelanggan:</span>
                    <span className="font-medium text-right max-w-[60%] truncate">
                      {order.customer_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-right max-w-[60%] truncate">
                      {order.customer_email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Telepon:</span>
                    <span className="font-medium text-right max-w-[60%] truncate">
                      {order.customer_phone}
                    </span>
                  </div>
                  {order.marketing_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Marketing ID:</span>
                      <span className="font-medium text-right max-w-[60%] truncate">
                        {order.marketing_id}
                      </span>
                    </div>
                  )}
                  {order.voucher_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Voucher ID:</span>
                      <span className="font-medium text-right max-w-[60%] truncate">
                        {order.voucher_id}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Metode Pembayaran:</span>
                    <span className="font-medium uppercase">
                      {order.payment_method}
                    </span>
                  </div>
                  {order.payment_amount != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Jumlah Pembayaran:</span>
                      <span className="font-medium">
                        Rp {formatRupiah(order.payment_amount)}
                      </span>
                    </div>
                  )}
                  {order.margin_amount != null && order.margin_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Margin Marketing:</span>
                      <span className="font-medium">
                        Rp {formatRupiah(order.margin_amount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status Pembayaran:</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-lg text-sm font-semibold ${getPaymentStatusColor(
                          order.payment_status
                        )}`}
                      >
                        {getPaymentStatusLabel(order.payment_status)}
                      </span>
                      <button
                        onClick={() => {
                          setNewPaymentStatus(order.payment_status);
                          setPaymentStatusModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Ubah
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Alamat & Detail Acara</h3>
                  </div>
                  <p className="text-gray-700 whitespace-pre-line">
                    {order.delivery_address}
                  </p>

                  {/* Detail event / referensi / lokasi dari delivery_notes */}
                  {order.delivery_notes && (() => {
                    const notes = parseDeliveryNotes(order.delivery_notes, true);
                    if (!notes) return null;

                    return (
                      <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-lg p-3 space-y-1">
                        <p className="font-medium text-gray-800 mb-1">
                          Detail Acara & Pengiriman:
                        </p>
                        {Array.isArray(notes) ? (
                          notes.map((line, idx) => (
                            <p key={idx}>{line}</p>
                          ))
                        ) : (
                          <p>{notes}</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Referensi / Partner Bisnis */}
                  {(() => {
                    const referenceName =
                      order.partner_business_name ||
                      order.guest_reference_detail ||
                      order.guest_reference ||
                      null;
                    const waNumber = order.partner_wa_number || null;

                    if (!referenceName && !waNumber) return null;

                    return (
                      <div className="mt-4 bg-primary-50 border border-primary-100 rounded-lg p-4 space-y-1">
                        <p className="text-sm font-semibold text-primary-800">
                          Referensi / Partner Bisnis
                        </p>
                        {referenceName && (
                          <p className="text-sm text-gray-800">
                            Nama: <span className="font-medium">{referenceName}</span>
                          </p>
                        )}
                        {waNumber && (
                          <p className="text-sm text-gray-800">
                            No. WA: <span className="font-medium">{waNumber}</span>
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Catatan Internal (Dapur/Admin):
                    </span>
                    {!editingNotes && (
                      <button
                        onClick={handleEditNotes}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center gap-1"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                        rows="4"
                        placeholder="Catatan untuk proses dapur atau admin..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveNotes}
                          disabled={savingNotes}
                          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                        >
                          {savingNotes ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <button
                          onClick={handleCancelEditNotes}
                          disabled={savingNotes}
                          className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 min-h-[60px]">
                      {getNotesDisplay() || (
                        <span className="text-gray-400 italic">
                          Tidak ada catatan internal
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Pesanan</h2>
              <div className="space-y-4">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b">
                    <div>
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-sm text-gray-600">Varian: {item.variant_name}</p>
                      )}
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        Rp {formatRupiah(item.subtotal)}
                      </p>
                      <p className="text-sm text-gray-600">
                        @ Rp {formatRupiah(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span>Rp {formatRupiah(order.total_amount)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Diskon:</span>
                    <span>- Rp {formatRupiah(order.discount_amount)}</span>
                  </div>
                )}
                {order.cashback_used > 0 && (
                  <div className="flex justify-between text-primary-600">
                    <span>Cashback Digunakan:</span>
                    <span>- Rp {formatRupiah(order.cashback_used)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                  <span>Total:</span>
                  <span>Rp {formatRupiah(order.final_amount)}</span>
                </div>
              </div>
            </div>

            {/* Status Logs */}
            {order.statusLogs && order.statusLogs.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Status</h2>
                <div className="space-y-4">
                  {order.statusLogs.map((log, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-sm">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(
                              log.status
                            )}`}
                          >
                            {log.status}
                          </span>
                          <span className="text-sm text-gray-600">
                            {new Date(log.created_at).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          Oleh: {log.handler_name || 'System'}
                        </p>
                        {log.notes && (
                          <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                        )}
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
          </div>
        </div>

        {/* Status Update Modal */}
        {statusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status Pesanan</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status Baru
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
                    Bukti Foto (Opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  {proofPreview && (
                    <div className="mt-2">
                      <img
                        src={proofPreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setProofFile(null);
                          setProofPreview(null);
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-800"
                      >
                        Hapus Preview
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setStatusModal(false);
                      setNewStatus('');
                      setNotes('');
                      setProofFile(null);
                      setProofPreview(null);
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

        {/* Payment Status Update Modal */}
        {paymentStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status Pembayaran</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status Pembayaran Baru
                  </label>
                  <select
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Pilih Status</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Lunas</option>
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setPaymentStatusModal(false);
                      setNewPaymentStatus('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handlePaymentStatusUpdate}
                    disabled={!newPaymentStatus || updatingPaymentStatus}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
                  >
                    {updatingPaymentStatus ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

export default AdminOrderDetail;
