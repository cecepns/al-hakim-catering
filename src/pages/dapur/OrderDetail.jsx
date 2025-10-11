import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const DapurOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');

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
            {order.delivery_notes && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Catatan Khusus</h3>
                    <p className="mt-1 text-sm text-yellow-700">{order.delivery_notes}</p>
                  </div>
                </div>
              </div>
            )}

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
                        {log.proof_url && (
                          <div className="mt-2">
                            <a
                              href={log.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 text-sm"
                            >
                              Lihat Bukti →
                            </a>
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

            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Checklist Dapur:</h3>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>✓ Cek ketersediaan bahan</li>
                <li>✓ Upload foto proses memasak</li>
                <li>✓ Pastikan kualitas makanan</li>
                <li>✓ Kemasan rapi dan aman</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DapurOrderDetail;

