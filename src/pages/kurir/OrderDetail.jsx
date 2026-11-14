import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI, orderIssuesAPI } from '../../utils/api';
import { formatRupiah, parseDeliveryNotes } from '../../utils/formatHelper';
import { getImageUrl } from '../../utils/imageHelper';
import DashboardLayout from '../../components/DashboardLayout';
import ImageViewer from '../../components/ImageViewer';
import OrderDeliveryEquipmentSection from '../../components/OrderDeliveryEquipmentSection';
import OrderIssuesListSection from '../../components/OrderIssuesListSection';
import ReportIssueBox from '../../components/ReportIssueBox';
import CompletionFeedbackBox from '../../components/CompletionFeedbackBox';

const KurirOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState(false);
  const [notes, setNotes] = useState('');
  const [proofShippingFile, setProofShippingFile] = useState(null);
  const [proofShippingPreview, setProofShippingPreview] = useState('');
  const [proofShippingExisting, setProofShippingExisting] = useState(null);
  const [proofDeliveryFile, setProofDeliveryFile] = useState(null);
  const [proofDeliveryPreview, setProofDeliveryPreview] = useState('');
  const [proofDeliveryExisting, setProofDeliveryExisting] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  // States for Laporkan Kendala & Review/Komplin saat Selesai (Revisi 7)
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
  const [standaloneIssueChecked, setStandaloneIssueChecked] = useState(false);
  const [standaloneIssueData, setStandaloneIssueData] = useState({
    issue_type: '',
    issue_cause: '',
    issue_follow_up: '',
    issue_solution: '',
  });
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getById(id);
      const orderData = response.data;
      setOrder(orderData);
      
      // Extract existing proofs from status logs
      if (orderData.statusLogs && Array.isArray(orderData.statusLogs)) {
        // Find proof_shipping (from status 'dikirim')
        const shippingLog = orderData.statusLogs.find(log => 
          log.status === 'dikirim' && (log.proof_image_url || log.proof_url)
        );
        if (shippingLog) {
          const proofUrl = shippingLog.proof_image_url || shippingLog.proof_url;
          setProofShippingExisting(getImageUrl(proofUrl));
        }
        
        // Find proof_delivery (from status 'selesai')
        const deliveryLog = orderData.statusLogs.find(log => 
          log.status === 'selesai' && (log.proof_image_url || log.proof_url)
        );
        if (deliveryLog) {
          const proofUrl = deliveryLog.proof_image_url || deliveryLog.proof_url;
          setProofDeliveryExisting(getImageUrl(proofUrl));
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      alert('Gagal memuat detail pesanan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleShippingFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofShippingFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofShippingPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeliveryFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofDeliveryFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofDeliveryPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartShipping = async () => {
    if (!proofShippingFile) {
      alert('Upload bukti pengiriman terlebih dahulu');
      return;
    }

    if (hasIssue && !issueData.issue_type.trim()) {
      alert('Jenis masalah wajib diisi jika Laporkan kendala dicentang');
      return;
    }

    try {
      setShipping(true);
      const formData = new FormData();
      formData.append('status', 'dikirim');
      formData.append('notes', notes || 'Pesanan dalam pengiriman');
      formData.append('proof_shipping', proofShippingFile);

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

      await orderAPI.updateStatus(id, formData);
      alert('Status pesanan berhasil diupdate menjadi Dikirim');
      setNotes('');
      setProofShippingFile(null);
      setProofShippingPreview('');
      setHasIssue(false);
      setIssueData({ issue_type: '', issue_cause: '', issue_follow_up: '', issue_solution: '' });
      fetchOrder();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Gagal mengupdate status');
    } finally {
      setShipping(false);
    }
  };

  const handleUpdateShippingProof = async () => {
    if (!proofShippingFile) {
      alert('Pilih file bukti pengiriman terlebih dahulu');
      return;
    }

    try {
      setShipping(true);
      const formData = new FormData();
      formData.append('status', 'dikirim'); // Keep same status
      formData.append('notes', notes || 'Update bukti pengiriman');
      formData.append('proof_shipping', proofShippingFile);

      await orderAPI.updateStatus(id, formData);
      alert('Bukti pengiriman berhasil diupdate');
      setNotes('');
      setProofShippingFile(null);
      setProofShippingPreview('');
      fetchOrder();
    } catch (error) {
      console.error('Error updating shipping proof:', error);
      alert(error.response?.data?.message || 'Gagal mengupdate bukti pengiriman');
    } finally {
      setShipping(false);
    }
  };

  const handleDelivered = async () => {
    if (!proofDeliveryFile) {
      alert('Upload bukti pesanan diterima terlebih dahulu');
      return;
    }

    if (hasIssue && !issueData.issue_type.trim()) {
      alert('Jenis masalah wajib diisi jika Laporkan kendala dicentang');
      return;
    }

    if (!window.confirm('Konfirmasi pesanan sudah diterima pelanggan?')) return;

    try {
      setShipping(true);
      const formData = new FormData();
      formData.append('status', 'selesai');
      formData.append('notes', 'Pesanan telah diterima pelanggan');
      formData.append('proof_delivery', proofDeliveryFile);

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

      if (feedbackData.feedback_type) {
        formData.append('feedback_type', feedbackData.feedback_type);
        formData.append('feedback_rating', String(feedbackData.feedback_rating || 5));
        formData.append('feedback_notes', feedbackData.feedback_notes || '');
        if (feedbackData.feedback_image) {
          formData.append('feedback_image', feedbackData.feedback_image);
        }
      }

      await orderAPI.updateStatus(id, formData);
      setHasIssue(false);
      setIssueData({ issue_type: '', issue_cause: '', issue_follow_up: '', issue_solution: '' });
      setFeedbackData({ feedback_type: '', feedback_rating: 5, feedback_notes: '', feedback_image: null });
      alert('Pesanan berhasil diselesaikan!');
      navigate('/kurir/dashboard');
    } catch (error) {
      console.error('Error completing order:', error);
      alert(error.response?.data?.message || 'Gagal menyelesaikan pesanan');
    } finally {
      setShipping(false);
    }
  };

  const handleSubmitStandaloneIssue = async () => {
    if (!standaloneIssueData.issue_type.trim()) {
      alert('Jenis masalah wajib diisi');
      return;
    }
    try {
      setSubmittingIssue(true);
      const issueForm = new FormData();
      issueForm.append('issue_type', standaloneIssueData.issue_type.trim());
      issueForm.append('cause', standaloneIssueData.issue_cause || '');
      issueForm.append('follow_up', standaloneIssueData.issue_follow_up || '');
      issueForm.append('solution', standaloneIssueData.issue_solution || '');
      if (standaloneIssueData.photo) {
        issueForm.append('photo', standaloneIssueData.photo);
      }
      await orderIssuesAPI.create(id, issueForm);
      alert('Kendala berhasil dilaporkan ke dashboard Admin & Operasional');
      setStandaloneIssueChecked(false);
      setStandaloneIssueData({ issue_type: '', issue_cause: '', issue_follow_up: '', issue_solution: '', photo: null, photo_preview: null });
      fetchOrder();
    } catch (error) {
      console.error('Error reporting standalone issue:', error);
      alert(error.response?.data?.message || 'Gagal melaporkan kendala');
    } finally {
      setSubmittingIssue(false);
    }
  };

  const checkEventWarning = () => {
    if (!order?.guest_event_date || !order?.guest_event_time) return false;
    
    try {
      // Normalize date and time formats
      const dateStr = order.guest_event_date.trim();
      const timeStr = order.guest_event_time.trim();
      const normalizedTime = timeStr.length === 5 ? timeStr : timeStr.substring(0, 5);
      
      const eventDate = new Date(`${dateStr}T${normalizedTime}`);
      
      // Validate date
      if (isNaN(eventDate.getTime())) {
        return false;
      }
      
      const now = new Date();
      const diffMs = eventDate - now;
      const diffMinutes = diffMs / (1000 * 60);
      
      return diffMinutes > 0 && diffMinutes <= 30;
    } catch (error) {
      console.error('Error checking event warning:', error);
      return false;
    }
  };

  const formatEventDateTime = () => {
    if (!order?.guest_event_date || !order?.guest_event_time) return null;
    
    try {
      // Normalize date and time formats
      const dateStr = order.guest_event_date.trim();
      const timeStr = order.guest_event_time.trim();
      
      // Ensure time format is HH:MM or HH:MM:SS
      const normalizedTime = timeStr.length === 5 ? timeStr : timeStr.substring(0, 5);
      
      // Create date object
      const eventDate = new Date(`${dateStr}T${normalizedTime}`);
      
      // Validate date
      if (isNaN(eventDate.getTime())) {
        console.error('Invalid date format:', { date: dateStr, time: timeStr });
        return null;
      }
      
      return {
        date: eventDate.toLocaleDateString('id-ID', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        time: eventDate.toLocaleTimeString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        fullDateTime: eventDate.toLocaleString('id-ID')
      };
    } catch (error) {
      console.error('Error formatting event date/time:', error);
      return null;
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
      <DashboardLayout role="kurir">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role="kurir">
        <div className="text-center py-12">
          <p className="text-gray-600">Pesanan tidak ditemukan</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="kurir">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pengiriman #{order.id}</h1>
            <p className="text-gray-600 mt-1">
              {new Date(order.created_at).toLocaleString('id-ID')}
            </p>
          </div>
          <button
            onClick={() => navigate('/kurir/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Kembali
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Status & Info Pelanggan */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Informasi Pengiriman</h2>
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="space-y-4">
                {(() => {
                  const eventDateTime = formatEventDateTime();
                  if (!eventDateTime) return null;
                  
                  return (
                    <div className={`rounded-lg p-4 ${checkEventWarning() ? 'bg-yellow-50 border-2 border-yellow-400' : 'bg-blue-50'}`}>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Tanggal & Waktu Acara:
                      </h3>
                      <p className="text-gray-700 font-medium">{eventDateTime.date}</p>
                      <p className="text-gray-700 font-medium">{eventDateTime.time}</p>
                      {checkEventWarning() && (
                        <div className="mt-2 p-2 bg-yellow-200 rounded flex items-center gap-2">
                          <svg className="w-5 h-5 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-yellow-800 font-semibold">Pesanan harus segera tiba</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Penerima:</h3>
                  <p className="text-gray-700 font-medium">{order.customer_name}</p>
                  <p className="text-gray-600">{order.customer_phone}</p>
                  <p className="text-gray-600">{order.customer_email}</p>
                </div>

                <div className="bg-primary-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Alamat Pengiriman:
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{order.delivery_address}</p>
                  {order.delivery_notes && (() => {
                    const notes = parseDeliveryNotes(order.delivery_notes, true);
                    if (!notes) return null;
                    return (
                      <div className="mt-2 pt-2 border-t border-primary-200">
                        <p className="text-sm font-medium text-gray-600 mb-2">Catatan Pengiriman:</p>
                        {Array.isArray(notes) ? (
                          <div className="text-sm text-gray-700 space-y-1">
                            {notes.map((line, idx) => (
                              <p key={idx}>{line}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700">{notes}</p>
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
                      <div className="mt-4 bg-white/70 border border-primary-200 rounded-lg p-3 space-y-1">
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

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Total Pembayaran:</span>
                  <span className="text-xl font-bold text-green-600">
                    Rp {formatRupiah(order.final_amount)}
                  </span>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Metode: </span>
                    <span className="uppercase">{order.payment_method}</span>
                    {order.payment_method === 'cod' && (
                      <span className="ml-2 text-yellow-700 font-semibold">
                        (Bayar di Tempat)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Item Pesanan */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Pesanan</h2>
              <div className="space-y-3">
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
                    <div key={index} className="flex justify-between items-center py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-sm text-gray-600">Varian: {item.variant_name}</p>
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
                        <p className="text-sm text-gray-600 mt-1">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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

            {/* Checklist Perlengkapan Pengantaran (Kurir) */}
            <OrderDeliveryEquipmentSection orderId={id} mode="kurir" />

            {/* Daftar Kendala Pesanan */}
            <OrderIssuesListSection issues={order.issues} canResolve={false} onResolved={fetchOrder} />
          </div>

          {/* Action Panel */}
          <div className="space-y-6">
            {order.status === 'siap-kirim' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Mulai Pengiriman</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catatan Pengiriman
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Contoh: Dalam perjalanan ke lokasi..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Bukti Pengiriman *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleShippingFileChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    {proofShippingPreview && (
                      <div className="mt-2">
                        <img
                          src={proofShippingPreview}
                          alt="Preview Bukti Pengiriman"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <ReportIssueBox
                    checked={hasIssue}
                    onCheckedChange={setHasIssue}
                    values={issueData}
                    onChange={setIssueData}
                  />

                  <button
                    onClick={handleStartShipping}
                    disabled={!proofShippingFile || shipping}
                    className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold transition"
                  >
                    {shipping ? 'Memproses...' : 'Mulai Kirim Pesanan'}
                  </button>
                </div>
              </div>
            )}

            {order.status === 'dikirim' && (
              <>
                {/* Upload Bukti Pengiriman */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Bukti Pengiriman</h2>
                  
                  <div className="space-y-4">
                    {proofShippingExisting && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bukti Pengiriman yang Sudah Diupload:
                        </label>
                        <div className="relative">
                          <img
                            src={proofShippingExisting}
                            alt="Bukti Pengiriman"
                            className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                            onClick={() => {
                              setViewingImage(proofShippingExisting);
                              setImageViewerOpen(true);
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
                            Sudah Diupload
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {proofShippingExisting ? 'Update Bukti Pengiriman' : 'Upload Bukti Pengiriman'}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleShippingFileChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      {proofShippingPreview && (
                        <div className="mt-2">
                          <img
                            src={proofShippingPreview}
                            alt="Preview Bukti Pengiriman"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>

                    {proofShippingFile && (
                      <button
                        onClick={handleUpdateShippingProof}
                        disabled={shipping}
                        className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold transition"
                      >
                        {shipping ? 'Memproses...' : proofShippingExisting ? 'Update Bukti Pengiriman' : 'Upload Bukti Pengiriman'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Upload Bukti Pesanan Diterima */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Pesanan Diterima</h2>
                  
                  <div className="space-y-4">
                    {proofDeliveryExisting && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bukti Pesanan Diterima yang Sudah Diupload:
                        </label>
                        <div className="relative">
                          <img
                            src={proofDeliveryExisting}
                            alt="Bukti Pesanan Diterima"
                            className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                            onClick={() => {
                              setViewingImage(proofDeliveryExisting);
                              setImageViewerOpen(true);
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
                            Sudah Diupload
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Bukti Pesanan Diterima *
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDeliveryFileChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      {proofDeliveryPreview && (
                        <div className="mt-2">
                          <img
                            src={proofDeliveryPreview}
                            alt="Preview Bukti Diterima"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>

                    {/* Review atau Komplin saat Pesanan Selesai (Revisi 7 - Gambar 5) */}
                    <CompletionFeedbackBox values={feedbackData} onChange={setFeedbackData} />

                    {/* Laporkan Kendala */}
                    <ReportIssueBox
                      checked={hasIssue}
                      onCheckedChange={setHasIssue}
                      values={issueData}
                      onChange={setIssueData}
                    />

                    <button
                      onClick={handleDelivered}
                      disabled={!proofDeliveryFile || shipping}
                      className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold transition"
                    >
                      {shipping ? 'Memproses...' : 'Pesanan Diterima'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Standalone Laporkan Kendala (muncul kapan saja) */}
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Kendala Pengiriman</h2>
              <p className="text-xs text-gray-500">
                Laporkan kendala lapangan kapan saja (otomatis tercatat di Admin & Operasional).
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

export default KurirOrderDetail;

