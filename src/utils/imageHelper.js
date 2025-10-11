// const API_BASE_URL = 'http://localhost:5000';
const API_BASE_URL = 'https://api-inventory.isavralabel.com/al-hakim';

/**
 * Mengkonversi path relatif gambar menjadi URL absolut
 * @param {string} imagePath - Path gambar dari database (e.g., /uploads/123-image.jpg)
 * @returns {string} - URL lengkap atau placeholder jika tidak ada gambar
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return 'https://via.placeholder.com/400x300';
  }
  
  // Jika sudah merupakan URL lengkap, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Jika path relatif, tambahkan base URL
  if (imagePath.startsWith('/')) {
    return `${API_BASE_URL}${imagePath}`;
  }
  
  // Jika path tanpa slash di awal, tambahkan
  return `${API_BASE_URL}/${imagePath}`;
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

