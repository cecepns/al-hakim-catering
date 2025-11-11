import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import { formatRupiah, parseDeliveryNotes } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const KurirOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState(false);
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

  const handleStartShipping = async () => {
    if (!proofFile) {
      alert('Upload bukti pengiriman terlebih dahulu');
      return;
    }

    try {
      setShipping(true);
      const formData = new FormData();
      formData.append('status', 'dikirim');
      formData.append('notes', notes || 'Pesanan dalam pengiriman');
      formData.append('proof', proofFile);

      await orderAPI.updateStatus(id, formData);
      alert('Status pesanan berhasil diupdate menjadi Dikirim');
      setNotes('');
      setProofFile(null);
      setProofPreview('');
      fetchOrder();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Gagal mengupdate status');
    } finally {
      setShipping(false);
    }
  };

  const handleDelivered = async () => {
    if (!window.confirm('Konfirmasi pesanan sudah diterima pelanggan?')) return;

    try {
      setShipping(true);
      const formData = new FormData();
      formData.append('status', 'selesai');
      formData.append('notes', 'Pesanan telah diterima pelanggan');

      await orderAPI.updateStatus(id, formData);
      alert('Pesanan berhasil diselesaikan!');
      navigate('/kurir/dashboard');
    } catch (error) {
      console.error('Error completing order:', error);
      alert(error.response?.data?.message || 'Gagal menyelesaikan pesanan');
    } finally {
      setShipping(false);
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
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-sm text-gray-600">Varian: {item.variant_name}</p>
                      )}
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
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
            {order.status === 'diproses' && (
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
                      Upload Bukti (Resi/Foto) *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
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
                    onClick={handleStartShipping}
                    disabled={!proofFile || shipping}
                    className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold transition"
                  >
                    {shipping ? 'Memproses...' : 'Mulai Kirim Pesanan'}
                  </button>
                </div>
              </div>
            )}

            {order.status === 'dikirim' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Konfirmasi Penerimaan</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Klik tombol di bawah setelah pesanan diterima oleh pelanggan
                </p>
                <button
                  onClick={handleDelivered}
                  disabled={shipping}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold transition"
                >
                  {shipping ? 'Memproses...' : 'Pesanan Diterima'}
                </button>
              </div>
            )}

            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Checklist Kurir:</h3>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>✓ Periksa kelengkapan pesanan</li>
                <li>✓ Catat nomor kontak pelanggan</li>
                <li>✓ Upload bukti pengiriman</li>
                <li>✓ Konfirmasi penerimaan</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default KurirOrderDetail;

