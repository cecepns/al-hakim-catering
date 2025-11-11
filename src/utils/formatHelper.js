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

/**
 * Format delivery notes (JSON atau plain text) menjadi format yang mudah dibaca
 * @param {string} deliveryNotes - Catatan pengiriman (JSON string atau plain text)
 * @param {boolean} includeDetails - Apakah menampilkan detail lengkap (default: false untuk tampilan sederhana)
 * @returns {string|null} - String formatted atau null jika kosong
 */
export const formatDeliveryNotes = (deliveryNotes, includeDetails = false) => {
  if (!deliveryNotes) {
    return null;
  }

  // Jika sudah object, langsung gunakan
  if (typeof deliveryNotes === 'object' && deliveryNotes !== null) {
    return formatDeliveryNotesObject(deliveryNotes, includeDetails);
  }

  // Coba parse sebagai JSON
  try {
    // Cek jika string yang dimulai dengan { atau [
    const trimmed = deliveryNotes.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const parsed = JSON.parse(deliveryNotes);
      return formatDeliveryNotesObject(parsed, includeDetails);
    }
  } catch {
    // Jika bukan JSON, return sebagai plain text
    return deliveryNotes;
  }

  // Fallback: return sebagai plain text
  return deliveryNotes;
};

/**
 * Format delivery notes object menjadi readable text
 * @param {Object} notes - Object delivery notes
 * @param {boolean} includeDetails - Apakah menampilkan detail lengkap
 * @returns {string|null} - String formatted atau null
 */
const formatDeliveryNotesObject = (notes, includeDetails = false) => {
  if (!notes || typeof notes !== 'object') {
    return null;
  }

  // Mapping referensi
  const referenceMap = {
    brosur: 'Brosur',
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    marketing: 'Marketing',
    rekomendasi: 'Rekomendasi',
    google: 'Google',
    lainnya: 'Lainnya',
  };

  const parts = [];

  // Event Information
  if (notes.event_name) {
    parts.push(`Acara: ${notes.event_name}`);
  }
  
  if (notes.event_date) {
    const eventDate = new Date(notes.event_date);
    const formattedDate = eventDate.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    parts.push(`Tanggal Acara: ${formattedDate}`);
  }
  
  if (notes.event_time) {
    parts.push(`Waktu Acara: ${notes.event_time}`);
  }

  // Reference Information
  if (notes.reference) {
    const refLabel = referenceMap[notes.reference] || notes.reference;
    if (includeDetails) {
      parts.push(`Referensi: ${refLabel}`);
      if (notes.reference_detail) {
        parts.push(`Detail Referensi: ${notes.reference_detail}`);
      }
    }
  }

  // Delivery Type
  if (notes.delivery_type) {
    const deliveryLabel = notes.delivery_type === 'diantar' ? 'Diantar' : 'Diambil';
    if (includeDetails) {
      parts.push(`Tipe Pengiriman: ${deliveryLabel}`);
    }
  }

  // Customer Information (jika includeDetails)
  if (includeDetails) {
    if (notes.customer_name) {
      parts.push(`Nama Pemesan: ${notes.customer_name}`);
    }
    if (notes.wa_number_1) {
      parts.push(`WA: ${notes.wa_number_1}`);
    }
    if (notes.wa_number_2) {
      parts.push(`WA Alternatif: ${notes.wa_number_2}`);
    }
  }

  // Landmark & Sharelok (penting untuk pengiriman, selalu tampilkan jika ada)
  if (notes.landmark) {
    parts.push(`Patokan: ${notes.landmark}`);
  }
  
  if (notes.sharelok_link) {
    parts.push(`Link Lokasi: ${notes.sharelok_link}`);
  }

  // Notes (catatan khusus)
  if (notes.notes) {
    parts.push(`Catatan: ${notes.notes}`);
  }

  // Jika tidak ada parts, return null
  if (parts.length === 0) {
    return null;
  }

  return parts.join('\n');
};

/**
 * Parse delivery notes menjadi array of lines untuk rendering
 * @param {string} deliveryNotes - Catatan pengiriman
 * @param {boolean} includeDetails - Apakah menampilkan detail lengkap
 * @returns {Array<string>|string|null} - Array of lines, string, atau null
 */
export const parseDeliveryNotes = (deliveryNotes, includeDetails = false) => {
  const formatted = formatDeliveryNotes(deliveryNotes, includeDetails);
  
  if (!formatted) {
    return null;
  }
  
  // Jika string dengan multiple lines, return array
  if (typeof formatted === 'string' && formatted.includes('\n')) {
    return formatted.split('\n').filter(line => line.trim());
  }
  
  // Jika single line, return string
  return formatted;
};

