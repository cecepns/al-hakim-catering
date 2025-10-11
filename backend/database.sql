-- Database: Al Hakim Catering
-- Dibuat untuk sistem pemesanan catering online dengan multi-role

CREATE DATABASE IF NOT EXISTS al_hakim_catering;
USE al_hakim_catering;

-- ========================================
-- TABEL USERS
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT,
  role ENUM('pembeli', 'admin', 'marketing', 'operasional', 'dapur', 'kurir') DEFAULT 'pembeli',
  cashback_balance DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL PRODUK
-- ========================================
CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('catering', 'aqiqah', 'event', 'store') NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  discount_percentage INT DEFAULT 0,
  discounted_price DECIMAL(15, 2) GENERATED ALWAYS AS (price - (price * discount_percentage / 100)) STORED,
  image_url VARCHAR(500),
  video_url VARCHAR(500),
  is_promo BOOLEAN DEFAULT FALSE,
  stock INT DEFAULT 0,
  sold_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_promo (is_promo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL VARIANT PRODUK
-- ========================================
CREATE TABLE IF NOT EXISTS product_variants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  price_adjustment DECIMAL(15, 2) DEFAULT 0,
  stock INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL HARGA GROSIR
-- ========================================
CREATE TABLE IF NOT EXISTS wholesale_prices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  min_quantity INT NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL BANNER PROMOSI
-- ========================================
CREATE TABLE IF NOT EXISTS banners (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  description TEXT,
  image_url VARCHAR(500) NOT NULL,
  video_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL VOUCHER
-- ========================================
CREATE TABLE IF NOT EXISTS vouchers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  discount_type ENUM('percentage', 'fixed') NOT NULL,
  discount_value DECIMAL(15, 2) NOT NULL,
  min_purchase DECIMAL(15, 2) DEFAULT 0,
  max_discount DECIMAL(15, 2) DEFAULT 0,
  quota INT DEFAULT 0,
  used_count INT DEFAULT 0,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL PESANAN
-- ========================================
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  marketing_id INT DEFAULT NULL,
  voucher_id INT DEFAULT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  cashback_used DECIMAL(15, 2) DEFAULT 0,
  final_amount DECIMAL(15, 2) NOT NULL,
  payment_method ENUM('transfer', 'dp', 'cod') NOT NULL,
  payment_status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
  status ENUM('dibuat', 'diproses', 'dikirim', 'selesai', 'dibatalkan') DEFAULT 'dibuat',
  delivery_address TEXT NOT NULL,
  delivery_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (marketing_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_marketing (marketing_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL ITEM PESANAN
-- ========================================
CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT DEFAULT NULL,
  product_name VARCHAR(255) NOT NULL,
  variant_name VARCHAR(100),
  quantity INT NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL LOG STATUS PESANAN
-- ========================================
CREATE TABLE IF NOT EXISTS order_status_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  status ENUM('dibuat', 'diproses', 'dikirim', 'selesai', 'dibatalkan') NOT NULL,
  handler_id INT DEFAULT NULL,
  handler_name VARCHAR(255),
  notes TEXT,
  proof_image_url VARCHAR(500),
  proof_video_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (handler_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL REVIEW & TESTIMONI
-- ========================================
CREATE TABLE IF NOT EXISTS reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  image_url VARCHAR(500),
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_order (order_id),
  INDEX idx_approved (is_approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL KOMPLAIN
-- ========================================
CREATE TABLE IF NOT EXISTS complaints (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(500),
  status ENUM('pending', 'processed', 'resolved', 'rejected') DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_order (order_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL RIWAYAT CASHBACK
-- ========================================
CREATE TABLE IF NOT EXISTS cashback_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  order_id INT DEFAULT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type ENUM('earned', 'used') NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL KOMISI MARKETING
-- ========================================
CREATE TABLE IF NOT EXISTS commissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  marketing_id INT NOT NULL,
  order_id INT NOT NULL,
  base_amount DECIMAL(15, 2) NOT NULL,
  commission_percentage DECIMAL(5, 2) NOT NULL,
  commission_amount DECIMAL(15, 2) NOT NULL,
  status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (marketing_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_marketing (marketing_id),
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL HARGA MARKETING (Custom Pricing)
-- ========================================
CREATE TABLE IF NOT EXISTS marketing_prices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  marketing_id INT NOT NULL,
  product_id INT NOT NULL,
  custom_price DECIMAL(15, 2) NOT NULL,
  margin_percentage DECIMAL(5, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (marketing_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_marketing (marketing_id),
  INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABEL KERANJANG
-- ========================================
CREATE TABLE IF NOT EXISTS cart (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT DEFAULT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- DATA CONTOH (SEEDING)
-- ========================================

-- Insert admin default
INSERT INTO users (name, email, password, phone, address, role) VALUES
('Admin Al Hakim', 'admin@alhakim.com', '$2a$10$YourHashedPasswordHere', '081234567890', 'Jakarta', 'admin'),
('Marketing 1', 'marketing@alhakim.com', '$2a$10$YourHashedPasswordHere', '081234567891', 'Jakarta', 'marketing'),
('Operasional', 'ops@alhakim.com', '$2a$10$YourHashedPasswordHere', '081234567892', 'Jakarta', 'operasional'),
('Dapur', 'dapur@alhakim.com', '$2a$10$YourHashedPasswordHere', '081234567893', 'Jakarta', 'dapur'),
('Kurir', 'kurir@alhakim.com', '$2a$10$YourHashedPasswordHere', '081234567894', 'Jakarta', 'kurir');

-- Insert produk contoh
INSERT INTO products (name, description, category, price, discount_percentage, is_promo, stock) VALUES
('Paket Nasi Box Premium', 'Nasi box dengan lauk lengkap dan berkualitas', 'catering', 35000, 10, TRUE, 100),
('Paket Aqiqah Kambing', 'Paket lengkap aqiqah kambing untuk 100 porsi', 'aqiqah', 5000000, 0, FALSE, 10),
('Paket Event Gathering 50 Orang', 'Paket lengkap untuk acara gathering perusahaan', 'event', 7500000, 5, TRUE, 5),
('Kue Kering Lebaran', 'Berbagai macam kue kering premium', 'store', 150000, 15, TRUE, 50);

-- Insert banner contoh
INSERT INTO banners (title, description, image_url, is_active, display_order) VALUES
('Selamat Datang di Al Hakim Catering', 'Solusi terbaik untuk kebutuhan catering Anda', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg', TRUE, 1),
('Promo Ramadan 2024', 'Diskon hingga 20% untuk paket berbuka puasa', 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg', TRUE, 2);

-- Insert voucher contoh
INSERT INTO vouchers (code, name, discount_type, discount_value, min_purchase, max_discount, quota, valid_from, valid_until, is_active) VALUES
('WELCOME10', 'Diskon Selamat Datang', 'percentage', 10, 100000, 50000, 100, '2024-01-01', '2024-12-31', TRUE),
('CASHBACK50K', 'Cashback 50 Ribu', 'fixed', 50000, 500000, 50000, 50, '2024-01-01', '2024-12-31', TRUE);
