import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import { formatRupiah, parseDeliveryNotes } from '../../utils/formatHelper';
import { getImageUrl } from '../../utils/imageHelper';
import DashboardLayout from '../../components/DashboardLayout';
import ImageViewer from '../../components/ImageViewer';

const PembeliOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingImage, setViewingImage] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [review, setReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: '',
    image: null,
    imagePreview: null
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (order) {
      fetchReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getById(id);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReview = async () => {
    try {
      const response = await orderAPI.getReview(id);
      setReview(response.data);
      setShowReviewForm(false);
    } catch (error) {
      // Review doesn't exist yet, which is fine
      if (error.response?.status !== 404) {
        console.error('Error fetching review:', error);
      } else {
        // If order is completed and no review exists, show form
        if (order?.status === 'selesai') {
          setShowReviewForm(true);
        }
      }
    }
  };

  const handleStarClick = (rating) => {
    setReviewForm({ ...reviewForm, rating });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReviewForm({
        ...reviewForm,
        image: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (reviewForm.rating === 0) {
      alert('Silakan beri rating terlebih dahulu');
      return;
    }

    try {
      setSubmittingReview(true);
      const formData = new FormData();
      formData.append('rating', reviewForm.rating);
      formData.append('comment', reviewForm.comment);
      if (reviewForm.image) {
        formData.append('image', reviewForm.image);
      }

      await orderAPI.addReview(id, formData);
      alert('Review berhasil dikirim!');
      setShowReviewForm(false);
      fetchReview();
      fetchOrder();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(error.response?.data?.message || 'Gagal mengirim review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-6 h-6 ${
          i < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
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
      <DashboardLayout role="pembeli">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role="pembeli">
        <div className="text-center py-12">
          <p className="text-gray-600">Pesanan tidak ditemukan</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="pembeli">
      <div>
        <button onClick={() => navigate('/pembeli/orders')} className="mb-6 text-gray-600 hover:text-gray-900">← Kembali</button>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pesanan #{order.id}</h1>
              <p className="text-gray-600 mt-1">{new Date(order.created_at).toLocaleString('id-ID')}</p>
            </div>
            <span className={`px-4 py-2 rounded-lg font-semibold ${getStatusColor(order.status)}`}>{order.status}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Alamat Pengiriman</h3>
              <p className="text-gray-700">{order.delivery_address}</p>
              {order.delivery_notes && (
                <div className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Catatan:</span>
                  {(() => {
                    const notes = parseDeliveryNotes(order.delivery_notes, false);
                    if (Array.isArray(notes)) {
                      return (
                        <div className="mt-1 space-y-1">
                          {notes.map((line, idx) => (
                            <p key={idx}>{line}</p>
                          ))}
                        </div>
                      );
                    }
                    return <span className="ml-1">{notes}</span>;
                  })()}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Pembayaran</h3>
              <p className="text-gray-700 capitalize">{order.payment_method}</p>
              <p className="text-sm text-gray-600">Status: {order.payment_status}</p>
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 mb-4">Item Pesanan</h3>
          <div className="space-y-4 mb-6">
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
                    {item.variant_name && <p className="text-sm text-gray-600">Varian: {item.variant_name}</p>}
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
                    <p className="text-sm text-gray-600">Qty: {item.quantity} x Rp {formatRupiah(item.price)}</p>
                  </div>
                  <p className="font-semibold text-gray-900">Rp {formatRupiah(item.subtotal)}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
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
                <span>Cashback:</span>
                <span>- Rp {formatRupiah(order.cashback_used)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
              <span>Total:</span>
              <span className="text-primary-600">Rp {formatRupiah(order.final_amount)}</span>
            </div>
          </div>
        </div>

        {order.statusLogs && order.statusLogs.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Pesanan</h2>
            <div className="space-y-4">
              {order.statusLogs.map((log, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(log.status)}`}>{log.status}</span>
                      <span className="text-sm text-gray-600">{new Date(log.created_at).toLocaleString('id-ID')}</span>
                    </div>
                    <p className="text-sm text-gray-700">Oleh: {log.handler_name}</p>
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

        {/* Review Section */}
        {order.status === 'selesai' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Pesanan</h2>
            
            {review ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-1 mb-3">
                  {getRatingStars(review.rating)}
                </div>
                {review.comment && (
                  <p className="text-gray-700 mb-3">{review.comment}</p>
                )}
                {review.image_url && (
                  <div className="mb-3">
                    <img
                      src={getImageUrl(review.image_url)}
                      alt="Review"
                      className="w-48 h-48 object-cover rounded-lg cursor-pointer"
                      onClick={() => {
                        setViewingImage(getImageUrl(review.image_url));
                        setImageViewerOpen(true);
                      }}
                    />
                  </div>
                )}
                <p className="text-sm text-gray-500">
                  Review diberikan pada {new Date(review.created_at).toLocaleString('id-ID')}
                </p>
              </div>
            ) : showReviewForm ? (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Penilaian Bintang *
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleStarClick(star)}
                        className="focus:outline-none"
                      >
                        <svg
                          className={`w-8 h-8 ${
                            star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kritik/Saran
                  </label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Bagikan pengalaman Anda dengan pesanan ini..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Foto (Opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {reviewForm.imagePreview && (
                    <div className="mt-2">
                      <img
                        src={reviewForm.imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview || reviewForm.rating === 0}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingReview ? 'Mengirim...' : 'Kirim Review'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowReviewForm(true)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Beri Review
              </button>
            )}
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
      </div>
    </DashboardLayout>
  );
};

export default PembeliOrderDetail;
