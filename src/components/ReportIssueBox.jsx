import { AlertTriangle, Upload, X } from 'lucide-react';

const ReportIssueBox = ({ checked, onCheckedChange, values = {}, onChange }) => {
  const handleField = (field, val) => {
    onChange({
      ...values,
      [field]: val,
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      onChange({
        ...values,
        photo: file,
        photo_preview: previewUrl,
      });
    }
  };

  const handleRemovePhoto = () => {
    onChange({
      ...values,
      photo: null,
      photo_preview: null,
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

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Upload Foto Kendala (Opsional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200"
            />
            {values.photo_preview && (
              <div className="relative mt-2 inline-block">
                <img
                  src={values.photo_preview}
                  alt="Preview Foto Kendala"
                  className="w-32 h-32 object-cover rounded-lg border border-amber-300"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700"
                  title="Hapus Foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportIssueBox;

