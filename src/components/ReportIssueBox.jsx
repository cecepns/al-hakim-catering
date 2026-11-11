import { AlertTriangle } from 'lucide-react';

const ReportIssueBox = ({ checked, onCheckedChange, values = {}, onChange }) => {
  const handleField = (field, val) => {
    onChange({
      ...values,
      [field]: val,
    });
  };

  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-3 sm:p-4 space-y-3">
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
        />
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Laporkan kendala
        </span>
      </label>

      {checked && (
        <div className="space-y-3 pt-2 border-t border-amber-200">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Jenis Masalah *
            </label>
            <input
              type="text"
              value={values.issue_type || ''}
              onChange={(e) => handleField('issue_type', e.target.value)}
              placeholder="Contoh: Keterlambatan pengiriman / Bahan kurang / Kemasan rusak"
              required={checked}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Penyebab
            </label>
            <textarea
              rows={2}
              value={values.issue_cause || ''}
              onChange={(e) => handleField('issue_cause', e.target.value)}
              placeholder="Jelaskan penyebab kendala..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tindak Lanjut
            </label>
            <textarea
              rows={2}
              value={values.issue_follow_up || ''}
              onChange={(e) => handleField('issue_follow_up', e.target.value)}
              placeholder="Tindakan yang dilakukan saat itu..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Solusi
            </label>
            <textarea
              rows={2}
              value={values.issue_solution || ''}
              onChange={(e) => handleField('issue_solution', e.target.value)}
              placeholder="Solusi atau pencegahan ke depan..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportIssueBox;

