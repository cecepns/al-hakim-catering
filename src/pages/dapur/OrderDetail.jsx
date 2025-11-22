import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import { parseDeliveryNotes } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';
import ImageViewer from '../../components/ImageViewer';

const DapurOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [checklist, setChecklist] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(true);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

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

  const fetchChecklist = useCallback(async () => {
    try {
      setChecklistLoading(true);
      const response = await orderAPI.getChecklist(id);
      // Parse checklist_data if it's a string
      let checklistData = response.data.checklist_data;
      if (typeof checklistData === 'string') {
        checklistData = JSON.parse(checklistData);
      }
      setChecklist(checklistData);
    } catch (error) {
      console.error('Error fetching checklist:', error);
      setChecklist(null);
    } finally {
      setChecklistLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    fetchChecklist();
  }, [fetchOrder, fetchChecklist]);

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

  const toggleChecklistItem = (sectionId, itemId) => {
    setChecklist(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const section = updated.sections.find(s => s.id === sectionId);
      if (section) {
        const item = section.items.find(i => i.id === itemId);
        if (item) {
          item.checked = !item.checked;
        }
      }
      return updated;
    });
  };

  const isChecklistComplete = () => {
    if (!checklist || !checklist.sections) return false;
    return checklist.sections.every(section =>
      section.items.every(item => item.checked)
    );
  };

  const handleSaveChecklist = async () => {
    try {
      setSavingChecklist(true);
      await orderAPI.saveChecklist(id, { checklist_data: checklist });
      alert('Checklist berhasil disimpan');
    } catch (error) {
      console.error('Error saving checklist:', error);
      alert('Gagal menyimpan checklist');
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleStartProcessing = async () => {
    if (!proofFile) {
      alert('Upload bukti foto/video proses terlebih dahulu');
      return;
    }

    try {
      setProcessing(true);
      const formData = new FormData();
      formData.append('status', 'diproses');
      formData.append('notes', notes || 'Pesanan mulai diproses dapur');
      formData.append('proof', proofFile);

      await orderAPI.updateStatus(id, formData);
      alert('Status pesanan berhasil diupdate menjadi Diproses');
      setNotes('');
      setProofFile(null);
      setProofPreview('');
      fetchOrder();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Gagal mengupdate status');
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Yakin pesanan sudah selesai dan siap dikirim?')) return;

    try {
      setProcessing(true);
      const formData = new FormData();
      formData.append('status', 'dikirim');
      formData.append('notes', 'Pesanan selesai diproses dan siap dikirim');

      await orderAPI.updateStatus(id, formData);
      alert('Pesanan selesai dan siap untuk dikirim!');
      navigate('/dapur/dashboard');
    } catch (error) {
      console.error('Error completing order:', error);
      alert(error.response?.data?.message || 'Gagal menyelesaikan pesanan');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      dibuat: 'bg-blue-100 text-blue-800',
      diproses: 'bg-yellow-100 text-yellow-800',
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
                {order.items?.map((item, index) => (
                  <div key={index} className="flex items-center py-4 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-lg">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-sm text-gray-600 mt-1">Varian: {item.variant_name}</p>
                      )}
                      <div className="flex items-center mt-2">
                        <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
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
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Selesaikan Pesanan</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Klik tombol di bawah jika pesanan sudah selesai dan siap untuk dikirim
                </p>
                <button
                  onClick={handleComplete}
                  disabled={processing}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold transition"
                >
                  {processing ? 'Memproses...' : 'Pesanan Selesai'}
                </button>
              </div>
            )}

            {/* Kitchen Checklist */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Checklist Dapur & Produksi</h2>
                {isChecklistComplete() && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                    ✓ Lengkap
                  </span>
                )}
              </div>

              {checklistLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : checklist ? (
                <div className="space-y-6">
                  {checklist.sections.map((section) => (
                    <div key={section.id} className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-semibold text-sm text-gray-900 mb-3">{section.title}</h3>
                      <div className="space-y-2">
                        {section.items.map((item) => (
                          <label key={item.id} className="flex items-start space-x-3 cursor-pointer hover:bg-white p-2 rounded transition">
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={() => toggleChecklistItem(section.id, item.id)}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                            </div>
                            <div className="flex-1">
                              <span className={`text-sm ${item.checked ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                {item.text}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleSaveChecklist}
                      disabled={savingChecklist}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold transition text-sm"
                    >
                      {savingChecklist ? 'Menyimpan...' : 'Simpan Checklist'}
                    </button>
                    {isChecklistComplete() && (
                      <div className="flex-1 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center">
                        <span className="text-green-700 text-sm font-semibold">✓ Siap Diproses</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">Gagal memuat checklist</p>
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

