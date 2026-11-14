import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AlertTriangle, CheckCircle2, MessageSquareWarning, Trash2 } from 'lucide-react';
import { orderAPI, orderIssuesAPI } from '../../utils/api';
import { getImageUrl, handleImageError } from '../../utils/imageHelper';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import ImageViewer from '../../components/ImageViewer';

const AdminReviews = () => {
  const { user } = useAuth();
  const role = user?.role === 'operasional' ? 'operasional' : 'admin';

  const [activeTab, setActiveTab] = useState('feedback'); // 'feedback' | 'issues'
  const [reviews, setReviews] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [issueFilter, setIssueFilter] = useState('all');

  const [resolvingIssueId, setResolvingIssueId] = useState(null);
  const [solutionDraft, setSolutionDraft] = useState('');
  const [savingIssue, setSavingIssue] = useState(false);

  const [viewerImage, setViewerImage] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  useEffect(() => {
    fetchIssues();
  }, [issueFilter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { type: filter } : {};
      const response = await orderAPI.getReviews(params);
      setReviews(response.data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async () => {
    try {
      setIssuesLoading(true);
      const params = issueFilter !== 'all' ? { status: issueFilter } : {};
      const response = await orderIssuesAPI.getAll(params);
      setIssues(response.data || []);
    } catch (error) {
      console.error('Error fetching order issues:', error);
      setIssues([]);
    } finally {
      setIssuesLoading(false);
    }
  };

  const handleResolve = async (review) => {
    if (!window.confirm('Tandai review/komplain ini sebagai telah ditangani?')) return;

    try {
      await orderAPI.resolveReview(review.id, review.type);
      toast.success('Feedback berhasil ditandai sebagai selesai');
      fetchReviews();
    } catch (error) {
      console.error('Error resolving review:', error);
      toast.error('Gagal menandai feedback');
    }
  };

  const handleDelete = async (review) => {
    const isComplain = review.type === 'complain';
    const label = isComplain ? 'komplain' : 'review';
    if (!window.confirm(`Yakin ingin menghapus ${label} untuk Pesanan #${review.order_id}? Data yang dihapus tidak dapat dikembalikan.`)) {
      return;
    }

    try {
      await orderAPI.deleteReview(review.id, review.type);
      toast.success(`${isComplain ? 'Komplain' : 'Review'} berhasil dihapus`);
      fetchReviews();
    } catch (error) {
      console.error(`Error deleting ${label}:`, error);
      toast.error(error.response?.data?.message || `Gagal menghapus ${label}`);
    }
  };

  const startResolveIssue = (issue) => {
    setResolvingIssueId(issue.id);
    setSolutionDraft(issue.solution || '');
  };

  const handleResolveIssue = async (issueId) => {
    try {
      setSavingIssue(true);
      await orderIssuesAPI.resolve(issueId, { solution: solutionDraft });
      toast.success('Laporan kendala ditandai selesai');
      setResolvingIssueId(null);
      setSolutionDraft('');
      fetchIssues();
    } catch (error) {
      console.error('Error resolving order issue:', error);
      toast.error(error.response?.data?.message || 'Gagal menyelesaikan kendala');
    } finally {
      setSavingIssue(false);
    }
  };

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
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

  const issueFilters = [
    { value: 'all', label: 'Semua Kendala' },
    { value: 'open', label: 'Belum Ditangani' },
    { value: 'resolved', label: 'Selesai' },
  ];

  const openFeedbackCount = reviews.filter((r) => !r.resolved).length;
  const openIssueCount = issues.filter((i) => i.status !== 'resolved').length;

  return (
    <DashboardLayout role={role}>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Review, Komplain &amp; Laporan Kendala
          </h1>
          <p className="text-gray-600 mt-1">
            Kelola review &amp; komplain pesanan serta tindak lanjuti kendala tim operasional, dapur, dan kurir
          </p>
        </div>

        {/* Top-level Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
          <button
            onClick={() => setActiveTab('feedback')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'feedback'
                ? 'bg-primary-600 text-white shadow'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <MessageSquareWarning className="w-4 h-4" />
            Review &amp; Komplain
            {openFeedbackCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'feedback'
                    ? 'bg-white/20 text-white'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {openFeedbackCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('issues')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'issues'
                ? 'bg-red-600 text-white shadow'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Laporan Kendala Pesanan
            {openIssueCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'issues'
                    ? 'bg-white/20 text-white'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {openIssueCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'feedback' ? (
          <>
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
                  {openFeedbackCount}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-wrap gap-2 mb-6">
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
                      key={`${review.type}-${review.id}`}
                      className={`border rounded-xl p-6 ${
                        review.resolved ? 'bg-gray-50' : 'bg-white'
                      } hover:shadow-lg transition`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                        <div>
                          <p className="font-semibold text-gray-900">{review.customer_name}</p>
                          <p className="text-sm text-gray-600">
                            <Link
                              to={`/${role}/orders/${review.order_id}`}
                              className="text-primary-600 hover:underline font-medium"
                            >
                              Pesanan #{review.order_id}
                            </Link>{' '}
                            • {new Date(review.created_at).toLocaleString('id-ID')}
                          </p>
                          {review.submitted_by_name && (
                            <p className="text-xs text-purple-700 mt-0.5">
                              Diinput oleh: {review.submitted_by_name}
                              {review.submitted_by_role ? ` (${review.submitted_by_role})` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(
                              review.type
                            )}`}
                          >
                            {review.type === 'review' ? 'Review' : 'Komplain'}
                          </span>
                          {review.resolved ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Selesai
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                              Belum Ditangani
                            </span>
                          )}
                        </div>
                      </div>

                      {review.type === 'review' && review.rating && (
                        <div className="flex items-center space-x-1 mb-3">
                          {getRatingStars(review.rating)}
                        </div>
                      )}

                      {review.type === 'complain' && review.subject && (
                        <p className="text-sm font-semibold text-red-700 mb-1">
                          {review.subject}
                        </p>
                      )}

                      {review.comment ? (
                        <p className="text-gray-700 mb-4 whitespace-pre-line">{review.comment}</p>
                      ) : (
                        <p className="text-xs italic text-gray-400 mb-4">(Tidak ada catatan teks)</p>
                      )}

                      {review.image_url && (
                        <div className="mb-4">
                          <img
                            src={getImageUrl(review.image_url)}
                            alt="Feedback"
                            onError={handleImageError}
                            className="w-48 h-48 object-cover rounded-lg cursor-pointer border hover:opacity-90 transition"
                            onClick={() => {
                              setViewerImage(getImageUrl(review.image_url));
                              setViewerOpen(true);
                            }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                        <div>
                          {review.type === 'complain' ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(review)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition"
                              title="Hapus Komplain"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Hapus Komplain
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDelete(review)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 border border-gray-200 rounded-lg text-xs font-semibold transition"
                              title="Hapus Review"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Hapus
                            </button>
                          )}
                        </div>

                        {!review.resolved ? (
                          <button
                            type="button"
                            onClick={() => handleResolve(review)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-semibold shadow-sm transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Tandai Selesai
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            Telah Ditangani
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <p className="text-sm text-gray-600">Total Kendala Tercatat</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{issues.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <p className="text-sm text-gray-600">Belum Ditangani</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{openIssueCount}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <p className="text-sm text-gray-600">Sudah Selesai</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {issues.filter((i) => i.status === 'resolved').length}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-wrap gap-2 mb-6">
                {issueFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setIssueFilter(f.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      issueFilter === f.value
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {issuesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                </div>
              ) : issues.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-3" />
                  <p>Tidak ada laporan kendala</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`border rounded-xl p-5 ${
                        issue.status === 'resolved'
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-red-50/40 border-red-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {issue.issue_type}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                issue.status === 'resolved'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {issue.status === 'resolved' ? 'Selesai' : 'Belum Ditangani'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Pelanggan: <span className="font-medium">{issue.customer_name}</span> •{' '}
                            <Link
                              to={`/${role}/orders/${issue.order_id}`}
                              className="text-primary-600 hover:underline font-medium"
                            >
                              Pesanan #{issue.order_id}
                            </Link>{' '}
                            • {new Date(issue.created_at).toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Dilaporkan oleh:{' '}
                            <span className="font-medium text-gray-700">
                              {issue.reported_by_name || '-'}
                            </span>{' '}
                            ({issue.reported_role || '-'})
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm bg-white border border-gray-200 rounded-lg p-3 mb-3">
                        <div>
                          <span className="block text-xs font-semibold text-gray-500 uppercase">
                            Penyebab
                          </span>
                          <p className="text-gray-800 mt-0.5 whitespace-pre-line">
                            {issue.cause || '-'}
                          </p>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-gray-500 uppercase">
                            Tindak Lanjut
                          </span>
                          <p className="text-gray-800 mt-0.5 whitespace-pre-line">
                            {issue.follow_up || '-'}
                          </p>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-gray-500 uppercase">
                            Solusi
                          </span>
                          <p className="text-gray-800 mt-0.5 whitespace-pre-line">
                            {issue.solution || '-'}
                          </p>
                        </div>
                      </div>

                      {issue.photo_url && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Bukti Foto Kendala</p>
                          <img
                            src={getImageUrl(issue.photo_url)}
                            alt="Bukti Kendala"
                            onError={handleImageError}
                            className="w-36 h-36 object-cover rounded-lg cursor-pointer border hover:opacity-90 transition"
                            onClick={() => {
                              setViewerImage(getImageUrl(issue.photo_url));
                              setViewerOpen(true);
                            }}
                          />
                        </div>
                      )}

                      {issue.status === 'resolved' ? (
                        issue.resolved_by_name && (
                          <p className="text-xs text-green-700">
                            Diselesaikan oleh {issue.resolved_by_name} pada{' '}
                            {issue.resolved_at
                              ? new Date(issue.resolved_at).toLocaleString('id-ID')
                              : '-'}
                          </p>
                        )
                      ) : resolvingIssueId === issue.id ? (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                          <label className="block text-xs font-medium text-gray-700">
                            Catatan Solusi Akhir (Opsional)
                          </label>
                          <textarea
                            rows={2}
                            value={solutionDraft}
                            onChange={(e) => setSolutionDraft(e.target.value)}
                            placeholder="Tuliskan solusi penanganan kendala..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setResolvingIssueId(null);
                                setSolutionDraft('');
                              }}
                              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={savingIssue}
                              onClick={() => handleResolveIssue(issue.id)}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:bg-gray-400"
                            >
                              {savingIssue ? 'Menyimpan...' : 'Simpan & Selesaikan'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => startResolveIssue(issue)}
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
          </>
        )}

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
                Review, komplain, dan laporan kendala adalah masukan penting untuk menjaga kualitas layanan Al Hakim Catering. Pastikan setiap komplain dan kendala ditindaklanjuti sampai tuntas.
              </p>
            </div>
          </div>
        </div>

        <ImageViewer
          imageUrl={viewerImage}
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setViewerImage(null);
          }}
          title="Foto Feedback"
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminReviews;
