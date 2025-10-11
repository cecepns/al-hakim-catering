# Backend Al Hakim Catering

Backend API untuk aplikasi Al Hakim Catering menggunakan Express.js dan MySQL.

## Instalasi

1. Install dependencies:
```bash
cd backend
npm install
```

2. Setup database:
   - Buat database MySQL
   - Import file `database.sql` ke MySQL Anda
   - Copy `.env.example` ke `.env` dan sesuaikan konfigurasi

3. Konfigurasi .env:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=al_hakim_catering
JWT_SECRET=your_secret_key_here
```

4. Jalankan server:
```bash
npm start
```

Atau untuk development:
```bash
npm run dev
```

Server akan berjalan di http://localhost:5000

## Endpoint API

### Authentication
- POST `/api/auth/register` - Registrasi user baru
- POST `/api/auth/login` - Login user
- GET `/api/auth/profile` - Get profile user (auth required)
- PUT `/api/auth/profile` - Update profile (auth required)

### Products
- GET `/api/products` - Get semua produk
- GET `/api/products/promo` - Get produk promo
- GET `/api/products/category/:category` - Get produk by category
- GET `/api/products/:id` - Get detail produk
- POST `/api/products` - Tambah produk (admin only)
- PUT `/api/products/:id` - Update produk (admin only)
- DELETE `/api/products/:id` - Hapus produk (admin only)

### Orders
- GET `/api/orders` - Get semua pesanan (sesuai role)
- GET `/api/orders/:id` - Get detail pesanan
- POST `/api/orders` - Buat pesanan baru
- PUT `/api/orders/:id/status` - Update status pesanan
- POST `/api/orders/:id/review` - Tambah review
- POST `/api/orders/:id/complaint` - Tambah komplain

### Banners
- GET `/api/banners` - Get semua banner aktif
- POST `/api/banners` - Tambah banner (admin only)
- PUT `/api/banners/:id` - Update banner (admin only)
- DELETE `/api/banners/:id` - Hapus banner (admin only)

### Vouchers
- GET `/api/vouchers` - Get semua voucher aktif
- POST `/api/vouchers/validate` - Validasi kode voucher
- POST `/api/vouchers` - Buat voucher baru (admin only)

### Cashback
- GET `/api/cashback/balance` - Get saldo cashback
- GET `/api/cashback/history` - Get riwayat cashback

### Commission (Marketing)
- GET `/api/commission/balance` - Get saldo komisi
- GET `/api/commission/orders` - Get pesanan marketing

### Cart
- GET `/api/cart` - Get keranjang
- POST `/api/cart` - Tambah ke keranjang
- PUT `/api/cart/:id` - Update item keranjang
- DELETE `/api/cart/:id` - Hapus item keranjang
- DELETE `/api/cart/clear` - Kosongkan keranjang

### Stats (Admin)
- GET `/api/stats/dashboard` - Get statistik dashboard

### Users (Admin)
- GET `/api/users` - Get semua user
- PUT `/api/users/:id/role` - Update role user

## Default Accounts

Setelah import database, gunakan akun berikut untuk testing:
- Admin: admin@alhakim.com / password
- Marketing: marketing@alhakim.com / password
- Operasional: ops@alhakim.com / password
- Dapur: dapur@alhakim.com / password
- Kurir: kurir@alhakim.com / password

**Catatan**: Password harus di-hash terlebih dahulu dengan bcrypt sebelum digunakan.
