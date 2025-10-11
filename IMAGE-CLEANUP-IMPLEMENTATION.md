# Implementasi Pembersihan Gambar Otomatis

## Ringkasan
Sistem sekarang secara otomatis menghapus file gambar yang tidak digunakan lagi ketika:
1. **Produk dihapus** - Gambar produk akan dihapus dari server
2. **Produk diedit dengan gambar baru** - Gambar lama akan dihapus, gambar baru disimpan
3. **Banner dihapus** - Gambar banner akan dihapus dari server
4. **Banner diedit dengan gambar baru** - Gambar lama akan dihapus, gambar baru disimpan

## Perubahan Backend

### 1. Update Endpoint Produk (PUT /api/products/:id)
**File:** `backend/server.js` (Line 282-315)

**Perubahan:**
- Sebelum menyimpan gambar baru, sistem mengambil data produk lama
- Jika ada gambar baru di-upload, gambar lama akan dihapus dari folder `uploads/`
- Menggunakan `fs.unlinkSync()` untuk menghapus file fisik

```javascript
// If new image is uploaded, delete the old one
if (req.file) {
  const [products] = await pool.query('SELECT image_url FROM products WHERE id = ?', [req.params.id]);
  
  if (products.length > 0 && products[0].image_url) {
    const oldImagePath = products[0].image_url;
    const oldFilePath = path.join(__dirname, oldImagePath.replace(/^\//, ''));
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
      console.log('Old image deleted:', oldFilePath);
    }
  }
  image_url = `/uploads/${req.file.filename}`;
}
```

### 2. Delete Endpoint Produk (DELETE /api/products/:id)
**File:** `backend/server.js` (Line 317-339)

**Perubahan:**
- Sebelum menghapus produk dari database, sistem mengambil data gambar
- Gambar produk dihapus dari folder `uploads/`
- Baru kemudian produk dihapus dari database

```javascript
// Fetch the product to get its image before deleting
const [products] = await pool.query('SELECT image_url FROM products WHERE id = ?', [req.params.id]);

if (products.length > 0 && products[0].image_url) {
  const imagePath = products[0].image_url;
  const filePath = path.join(__dirname, imagePath.replace(/^\//, ''));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log('Product image deleted:', filePath);
  }
}
```

### 3. Endpoint Banner Baru - Update (PUT /api/banners/:id)
**File:** `backend/server.js` (Line 636-669)

**Fitur Baru:**
- Endpoint untuk update banner (sebelumnya tidak ada)
- Otomatis menghapus gambar lama jika ada gambar baru
- Mendukung update tanpa mengganti gambar (menggunakan `existing_image`)

### 4. Endpoint Banner Baru - Delete (DELETE /api/banners/:id)
**File:** `backend/server.js` (Line 671-693)

**Fitur Baru:**
- Endpoint untuk menghapus banner (sebelumnya tidak ada)
- Otomatis menghapus file gambar banner dari server
- Kemudian menghapus data banner dari database

## Perubahan Frontend

### 1. Halaman Admin Banner
**File:** `src/pages/admin/Banners.jsx`

**Perubahan:**
- Menambahkan fungsi `handleEdit()` untuk edit banner
- Tombol "Edit" ditambahkan di setiap card banner
- Menyimpan `existing_image` di form data untuk update tanpa ganti gambar
- Import `getImagePath` dari imageHelper untuk ekstrak path relatif

**Fitur Baru:**
```javascript
const handleEdit = (banner) => {
  setEditId(banner.id);
  setFormData({
    title: banner.title,
    description: banner.description,
    display_order: banner.display_order.toString(),
    existing_image: getImagePath(banner.image_url),
  });
  setImagePreview(getImageUrl(banner.image_url));
  setModal(true);
};
```

### 2. Dokumentasi API
**File:** `backend/README.md`

**Perubahan:**
- Menambahkan dokumentasi untuk endpoint banner baru:
  - PUT `/api/banners/:id` - Update banner (admin only)
  - DELETE `/api/banners/:id` - Hapus banner (admin only)

## Cara Kerja

### Skenario 1: Edit Produk dengan Gambar Baru
1. User upload gambar baru di form edit produk
2. Frontend mengirim FormData dengan gambar baru ke backend
3. Backend mengambil data produk lama dari database
4. Backend menghapus file gambar lama dari `uploads/`
5. Backend menyimpan gambar baru dan update database
6. Gambar lama berhasil dihapus, tidak ada file yang menumpuk

### Skenario 2: Edit Produk Tanpa Ganti Gambar
1. User tidak upload gambar baru, hanya edit data lain
2. Frontend mengirim `existing_image` dengan path gambar lama
3. Backend tidak menghapus gambar, tetap menggunakan path lama
4. Database diupdate dengan gambar yang sama

### Skenario 3: Hapus Produk
1. User klik tombol hapus produk
2. Backend mengambil data produk termasuk path gambar
3. Backend menghapus file gambar dari `uploads/`
4. Backend menghapus data produk dari database
5. Gambar dan data produk berhasil dihapus total

### Skenario 4: Edit/Hapus Banner
Sama seperti produk, dengan endpoint yang sama

## Keuntungan

1. **Hemat Storage:** File gambar yang tidak digunakan otomatis dihapus
2. **Manajemen Lebih Baik:** Folder uploads tidak menumpuk file sampah
3. **Konsistensi Data:** Gambar di server sesuai dengan yang ada di database
4. **User Experience:** Admin tidak perlu manual cleanup

## Testing

### Manual Testing
1. **Test Edit Produk:**
   - Login sebagai admin
   - Edit produk dan ganti gambar
   - Cek folder `backend/uploads/` - gambar lama terhapus
   
2. **Test Hapus Produk:**
   - Login sebagai admin
   - Hapus produk
   - Cek folder `backend/uploads/` - gambar produk terhapus

3. **Test Edit Banner:**
   - Login sebagai admin
   - Buka menu Banners
   - Klik Edit pada banner, ganti gambar
   - Cek folder `backend/uploads/` - gambar lama terhapus

4. **Test Hapus Banner:**
   - Login sebagai admin
   - Hapus banner
   - Cek folder `backend/uploads/` - gambar banner terhapus

## File yang Dimodifikasi

1. **Backend:**
   - `backend/server.js` - Implementasi pembersihan gambar
   - `backend/README.md` - Update dokumentasi API

2. **Frontend:**
   - `src/pages/admin/Banners.jsx` - Support edit banner dengan cleanup gambar

3. **Dokumentasi:**
   - `IMAGE-CLEANUP-IMPLEMENTATION.md` (file ini)

## Catatan Penting

1. **Backup:** Pastikan ada backup database dan folder uploads sebelum testing
2. **Permissions:** Pastikan aplikasi memiliki izin write/delete di folder uploads
3. **Error Handling:** Sistem menggunakan `fs.existsSync()` untuk cek file sebelum hapus, menghindari error jika file tidak ditemukan
4. **Logging:** Setiap penghapusan gambar dicatat di console log untuk tracking

## Future Improvements

1. **Soft Delete:** Implementasi soft delete untuk recovery gambar jika diperlukan
2. **Cloud Storage:** Integrasi dengan cloud storage (AWS S3, Google Cloud Storage)
3. **Image Optimization:** Kompresi otomatis sebelum upload
4. **Bulk Cleanup:** Tool untuk cleanup gambar orphan yang sudah ada


