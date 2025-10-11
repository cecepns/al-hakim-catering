/**
 * Format angka ke format Rupiah Indonesia
 * @param {number} amount - Jumlah yang akan diformat
 * @returns {string} - Angka terformat dalam Rupiah (contoh: "1.234.567")
 */
export const formatRupiah = (amount) => {
  if (!amount && amount !== 0) {
    return '0';
  }
  
  // Konversi ke number jika masih string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format dengan pemisah ribuan (titik) tanpa desimal
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
};

/**
 * Format tanggal ke format Indonesia
 * @param {string|Date} date - Tanggal yang akan diformat
 * @returns {string} - Tanggal terformat (contoh: "10/10/2025, 14.30.45")
 */
export const formatDate = (date) => {
  if (!date) {
    return '-';
  }
  
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Format persentase
 * @param {number} percentage - Nilai persentase
 * @returns {string} - Persentase terformat (contoh: "10%")
 */
export const formatPercentage = (percentage) => {
  if (!percentage && percentage !== 0) {
    return '0%';
  }
  
  return `${percentage}%`;
};

