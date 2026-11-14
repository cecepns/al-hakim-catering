// const API_BASE_URL = 'http://localhost:5000';
const API_BASE_URL = 'https://api.kingcreativestudio.my.id/al-hakim';
const ROOT_API_URL = 'https://api.kingcreativestudio.my.id';
const PLACEHOLDER_IMAGE = 'https://placehold.co/400x300?text=Tidak+Ada+Gambar';

/**
 * Mengkonversi path relatif gambar menjadi URL absolut
 * @param {string} imagePath - Path gambar dari database (e.g., /uploads/123-image.jpg)
 * @returns {string} - URL lengkap atau placeholder jika tidak ada gambar
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') {
    return PLACEHOLDER_IMAGE;
  }
  
  const trimmed = imagePath.trim();
  if (!trimmed) {
    return PLACEHOLDER_IMAGE;
  }

  // Jika sudah merupakan URL lengkap, return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Jika path diawali /al-hakim/, sambungkan ke ROOT_API_URL agar tidak duplikat
  if (trimmed.startsWith('/al-hakim/')) {
    return `${ROOT_API_URL}${trimmed}`;
  }
  
  // Jika path relatif dengan slash di awal
  if (trimmed.startsWith('/')) {
    return `${API_BASE_URL}${trimmed}`;
  }
  
  // Jika path tanpa slash di awal
  return `${API_BASE_URL}/${trimmed}`;
};

/**
 * Fallback handler saat <img> gagal dimuat (404 / cross-domain)
 */
export const handleImageError = (e) => {
  if (!e || !e.currentTarget) return;
  const currentSrc = e.currentTarget.src || '';

  // 1. Coba hapus prefix /al-hakim jika ada di URL
  if (currentSrc.includes('/al-hakim/uploads/')) {
    e.currentTarget.src = currentSrc.replace('/al-hakim/uploads/', '/uploads/');
    return;
  }

  // 2. Coba tambahkan prefix /al-hakim jika belum ada
  if (currentSrc.includes('api.kingcreativestudio.my.id/uploads/')) {
    e.currentTarget.src = currentSrc.replace('api.kingcreativestudio.my.id/uploads/', 'api.kingcreativestudio.my.id/al-hakim/uploads/');
    return;
  }

  // 3. Fallback terakhir ke placeholder
  if (!currentSrc.includes('placehold.co') && !currentSrc.includes('via.placeholder')) {
    e.currentTarget.src = PLACEHOLDER_IMAGE;
  }
};

/**
 * Mengekstrak path relatif dari URL lengkap
 * @param {string} imageUrl - URL gambar lengkap atau path relatif
 * @returns {string} - Path relatif (e.g., /uploads/123-image.jpg)
 */
export const getImagePath = (imageUrl) => {
  if (!imageUrl) {
    return null;
  }
  
  // Jika sudah path relatif, return as-is
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Ekstrak path dari URL lengkap
  if (imageUrl.includes('/uploads')) {
    return imageUrl.substring(imageUrl.indexOf('/uploads'));
  }
  
  return imageUrl;
};

