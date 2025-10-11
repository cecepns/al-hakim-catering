import { useEffect, useState } from 'react';
import { orderAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { type: filter } : {};
      const response = await orderAPI.getReviews(params);
      setReviews(response.data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Set empty array if no reviews
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    if (!window.confirm('Tandai sebagai telah ditangani?')) return;

    try {
      await orderAPI.resolveReview(id);
      alert('Review berhasil ditandai sebagai selesai');
      fetchReviews();
    } catch (error) {
      console.error('Error resolving review:', error);
      alert('Gagal menandai review');
    }
  };

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${
          i < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  const getTypeColor = (type) => {
    const colors = {
      review: 'bg-blue-100 text-blue-800',
      complain: 'bg-red-100 text-red-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const filters = [
    { value: 'all', label: 'Semua' },
    { value: 'review', label: 'Review' },
    { value: 'complain', label: 'Komplain' },
  ];

  return (
    <DashboardLayout role="admin">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Review & Komplain</h1>
          <p className="text-gray-600 mt-1">Kelola feedback dari pelanggan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-600">Total Review</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {reviews.filter((r) => r.type === 'review').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-600">Total Komplain</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {reviews.filter((r) => r.type === 'complain').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-600">Belum Ditangani</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {reviews.filter((r) => !r.resolved).length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex space-x-2 mb-6">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === f.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
              <p className="text-gray-600">Belum ada review atau komplain</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className={`border rounded-xl p-6 ${
                    review.resolved ? 'bg-gray-50' : 'bg-white'
                  } hover:shadow-lg transition`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-semibold text-gray-900">{review.customer_name}</p>
                        <p className="text-sm text-gray-600">
                          Pesanan #{review.order_id} • {new Date(review.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(
                          review.type
                        )}`}
                      >
                        {review.type === 'review' ? 'Review' : 'Komplain'}
                      </span>
                      {review.resolved && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          Selesai
                        </span>
                      )}
                    </div>
                  </div>

                  {review.type === 'review' && review.rating && (
                    <div className="flex items-center space-x-1 mb-3">
                      {getRatingStars(review.rating)}
                    </div>
                  )}

                  <p className="text-gray-700 mb-4">{review.comment}</p>

                  {review.image_url && (
                    <div className="mb-4">
                      <img
                        src={review.image_url}
                        alt="Review"
                        className="w-48 h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {!review.resolved && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleResolve(review.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
                      >
                        Tandai Selesai
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Review dan komplain adalah feedback berharga dari pelanggan. Pastikan untuk menindaklanjuti setiap komplain dengan cepat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminReviews;

