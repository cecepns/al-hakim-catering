import { useEffect } from 'react';
import PropTypes from 'prop-types';

const ImageViewer = ({ imageUrl, isOpen, onClose, title = 'Bukti Foto' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !imageUrl) return null;

  // Construct full image URL
  const getFullImageUrl = () => {
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // If relative path, prepend API base URL (without /api)
    const API_BASE_URL = 'https://api-inventory.isavralabel.com/al-hakim';
    return `${API_BASE_URL}${imageUrl}`;
  };

  const fullImageUrl = getFullImageUrl();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Tutup"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <div className="flex justify-center">
            <img
              src={fullImageUrl}
              alt={title}
              className="max-w-full h-auto rounded-lg shadow-lg"
              onError={(e) => {
                e.target.src = '/placeholder-image.png';
                e.target.alt = 'Gambar tidak dapat dimuat';
              }}
            />
          </div>
        </div>
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

ImageViewer.propTypes = {
  imageUrl: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
};

export default ImageViewer;

