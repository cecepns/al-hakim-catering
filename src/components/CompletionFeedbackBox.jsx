import { Star, MessageSquarePlus, AlertCircle, Upload } from 'lucide-react';

const CompletionFeedbackBox = ({ values = {}, onChange }) => {
  const feedbackType = values.feedback_type || '';
  const rating = Number(values.feedback_rating) || 5;
  const notes = values.feedback_notes || '';
  const image = values.feedback_image || null;

  const update = (patch) => {
    onChange({
      ...values,
      ...patch,
    });
  };

  return (
    <div className="border border-purple-200 bg-purple-50/40 rounded-lg p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-semibold text-gray-900">
          Review atau Komplin Pelanggan (Opsional)
        </span>
        {feedbackType && (
          <button
            type="button"
            onClick={() =>
              update({
                feedback_type: '',
                feedback_notes: '',
                feedback_image: null,
              })
            }
            className="text-xs text-gray-500 hover:text-gray-800 underline"
          >
            Kosongkan pilihan
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() =>
            update({ feedback_type: feedbackType === 'review' ? '' : 'review' })
          }
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition ${
            feedbackType === 'review'
              ? 'bg-green-600 text-white border-green-600 shadow-sm'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50'
          }`}
        >
          <MessageSquarePlus className="w-4 h-4" />
          Review
        </button>

        <button
          type="button"
          onClick={() =>
            update({ feedback_type: feedbackType === 'complain' ? '' : 'complain' })
          }
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition ${
            feedbackType === 'complain'
              ? 'bg-red-600 text-white border-red-600 shadow-sm'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Komplin
        </button>
      </div>

      {feedbackType && (
        <div className="space-y-3 pt-2 border-t border-purple-200">
          {feedbackType === 'review' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Rating Pelanggan
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => update({ feedback_rating: num })}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        num <= rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs text-gray-600">({rating}/5)</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {feedbackType === 'complain'
                ? 'Catatan Komplin Pelanggan'
                : 'Catatan Review Pelanggan'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => update({ feedback_notes: e.target.value })}
              placeholder={
                feedbackType === 'complain'
                  ? 'Tulis detail komplin dari pelanggan...'
                  : 'Tulis review / masukan positif dari pelanggan...'
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              Upload Foto {feedbackType === 'complain' ? 'Komplin' : 'Review'} (Opsional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                update({ feedback_image: e.target.files?.[0] || null })
              }
              className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-2 bg-white"
            />
            {image && (
              <p className="text-xs text-green-700 mt-1">
                File terpilih: {image.name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletionFeedbackBox;

