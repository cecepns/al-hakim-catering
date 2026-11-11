import { toast } from 'react-toastify';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { orderIssuesAPI } from '../utils/api';

const OrderIssuesListSection = ({ issues = [], canResolve = false, onResolved }) => {
  if (!Array.isArray(issues) || issues.length === 0) {
    return null;
  }

  const handleResolve = async (issueId) => {
    try {
      await orderIssuesAPI.resolve(issueId);
      toast.success('Kendala berhasil ditandai selesai');
      if (onResolved) onResolved();
    } catch (error) {
      console.error('Error resolving order issue:', error);
      toast.error(error.response?.data?.message || 'Gagal menyelesaikan kendala');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-amber-500">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-600" />
        <h2 className="text-lg font-semibold text-gray-900">
          Laporan Kendala Pesanan ({issues.length})
        </h2>
      </div>

      <div className="space-y-3">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="border border-amber-200 bg-amber-50/40 rounded-lg p-4 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">
                  {issue.issue_type}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    issue.status === 'resolved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {issue.status === 'resolved' ? 'Selesai' : 'Terbuka'}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                Dilaporkan oleh: {issue.reported_by_name || '-'}{' '}
                {issue.reported_role ? `(${issue.reported_role})` : ''} •{' '}
                {new Date(issue.created_at).toLocaleString('id-ID')}
              </span>
            </div>

            {issue.cause && (
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">Penyebab:</span> {issue.cause}
              </p>
            )}
            {issue.follow_up && (
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">Tindak Lanjut:</span>{' '}
                {issue.follow_up}
              </p>
            )}
            {issue.solution && (
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">Solusi:</span> {issue.solution}
              </p>
            )}

            {canResolve && issue.status !== 'resolved' && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleResolve(issue.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tandai Selesai
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderIssuesListSection;

