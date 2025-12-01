import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const ImageViewer = ({ imageUrl, isOpen, onClose, title = 'Bukti Foto' }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, mouseX: 0, mouseY: 0 });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setZoom(1);
      setPan({ x: 0, y: 0 });
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

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 1));
    if (zoom <= 1.25) {
      setPan({ x: 0, y: 0 });
    }
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const startPan = (clientX, clientY) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    setPanStart({ x: pan.x, y: pan.y, mouseX: clientX, mouseY: clientY });
  };

  const movePan = (clientX, clientY) => {
    if (!isPanning) return;
    const deltaX = clientX - panStart.mouseX;
    const deltaY = clientY - panStart.mouseY;
    setPan({
      x: panStart.x + deltaX,
      y: panStart.y + deltaY,
    });
  };

  const endPan = () => {
    setIsPanning(false);
  };

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
          <div
            className="flex justify-center items-center overflow-auto max-h-[60vh]"
            onMouseDown={(e) => {
              e.preventDefault();
              startPan(e.clientX, e.clientY);
            }}
            onMouseMove={(e) => {
              e.preventDefault();
              movePan(e.clientX, e.clientY);
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              endPan();
            }}
            onMouseLeave={endPan}
            onTouchStart={(e) => {
              if (e.touches.length === 1) {
                const touch = e.touches[0];
                startPan(touch.clientX, touch.clientY);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 1) {
                const touch = e.touches[0];
                movePan(touch.clientX, touch.clientY);
              }
            }}
            onTouchEnd={endPan}
          >
            <img
              src={fullImageUrl}
              alt={title}
              className="rounded-lg shadow-lg object-contain"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
                maxWidth: '100%',
                maxHeight: '60vh',
                cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
              }}
              onError={(e) => {
                e.target.src = '/placeholder-image.png';
                e.target.alt = 'Gambar tidak dapat dimuat';
              }}
            />
          </div>
        </div>
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              disabled={zoom <= 1}
            >
              -
            </button>
            <span className="text-sm text-gray-600 w-16 text-center">
              {(zoom * 100).toFixed(0)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              disabled={zoom >= 3}
            >
              +
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="ml-2 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              Reset
            </button>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Tutup
            </button>
          </div>
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

