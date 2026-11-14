-- ==============================================================
-- Migration: Revisions Phase 4 (November 2026)
-- Date: 2026-11-11
-- Description:
--   1. Kolom diskon produk & catatan variasi pada order_items
--   2. Tabel standar pengemasan per kategori (packaging_standards)
--   3. Tabel master perlengkapan & rekap pengantaran (delivery_equipment_items, order_delivery_equipment)
--   4. Tabel laporan kendala pesanan (order_issues)
--   5. Relaksasi & pelengkap tabel reviews dan complaints untuk feedback penyelesaian
--   6. Tabel template checklist per role & checklist harian role (checklist_templates, daily_role_checklists)
-- ==============================================================

-- 1. Kolom diskon produk & catatan variasi di order_items
ALTER TABLE `order_items`
  ADD COLUMN IF NOT EXISTS `original_price` DECIMAL(15,2) NULL AFTER `price`,
  ADD COLUMN IF NOT EXISTS `discount_percentage` INT NOT NULL DEFAULT 0 AFTER `original_price`,
  ADD COLUMN IF NOT EXISTS `product_discount_amount` DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER `discount_percentage`,
  ADD COLUMN IF NOT EXISTS `variant_notes` TEXT NULL AFTER `variant_name`;

-- 2. Standar Pengemasan per Kategori
CREATE TABLE IF NOT EXISTS `packaging_standards` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category` VARCHAR(50) NOT NULL UNIQUE,
  `title` VARCHAR(150) NOT NULL,
  `content` TEXT NOT NULL,
  `updated_by` INT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `packaging_standards` (`category`, `title`, `content`) VALUES
('catering', 'Standar Pengemasan Catering', 'Pastikan kemasan box/wadah catering dalam kondisi bersih, rapat, dan higienis. Tempelkan label menu/nama pemesan dengan jelas serta lengkapi sendok, tisu, dan saus sesuai porsi.'),
('aqiqah', 'Standar Pengemasan Aqiqah', 'Pastikan paket box aqiqah dilengkapi kartu ucapan/buku doa aqiqah, pisahkan bumbu/gulai/sate dalam wadah anti bocor, dan periksa kesesuaian porsi serta bonus paket.'),
('event', 'Standar Pengemasan Event & Prasmanan', 'Siapkan peralatan prasmanan (chafing dish, pemanas, capit, sendok saji) dalam kondisi bersih, bungkus makanan dengan pelindung higienis, dan catat perlengkapan pengantaran yang dibawa.'),
('store', 'Standar Pengemasan Store', 'Kemas produk menggunakan dus/kemasan yang kokoh dan tersegel rapi, sertakan tanggal produksi serta informasi penyimpanan produk.');

-- 3. Master Daftar Peralatan & Perlengkapan Pengantaran Pesanan
CREATE TABLE IF NOT EXISTS `delivery_equipment_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `unit` VARCHAR(50) NOT NULL DEFAULT 'Pcs',
  `stock` INT NOT NULL DEFAULT 0,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `order_delivery_equipment` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `equipment_id` INT NOT NULL,
  `qty_brought` INT NOT NULL DEFAULT 0,
  `qty_returned` INT NOT NULL DEFAULT 0,
  `qty_borrowed` INT NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `recorded_by_dapur` INT NULL,
  `checked_by_kurir` INT NULL,
  `returned_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_order_equipment` (`order_id`, `equipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Laporan Kendala Pesanan
CREATE TABLE IF NOT EXISTS `order_issues` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `reported_by` INT NULL,
  `reported_role` VARCHAR(50) NULL,
  `issue_type` VARCHAR(255) NOT NULL,
  `cause` TEXT NULL,
  `follow_up` TEXT NULL,
  `solution` TEXT NULL,
  `photo_url` VARCHAR(255) NULL,
  `status` ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  `resolved_by` INT NULL,
  `resolved_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- If table already exists, ensure photo_url column exists
ALTER TABLE `order_issues` ADD COLUMN IF NOT EXISTS `photo_url` VARCHAR(255) NULL AFTER `solution`;

-- 5. Update reviews & complaints untuk mendukung laporan dari staff/kurir saat pesanan selesai
ALTER TABLE `reviews`
  MODIFY COLUMN `rating` INT NULL,
  ADD COLUMN IF NOT EXISTS `submitted_by` INT NULL,
  ADD COLUMN IF NOT EXISTS `submitted_by_role` VARCHAR(50) NULL;

ALTER TABLE `complaints`
  MODIFY COLUMN `subject` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `submitted_by` INT NULL,
  ADD COLUMN IF NOT EXISTS `submitted_by_role` VARCHAR(50) NULL;

-- 6. Template Checklist Semua Role & Checklist Harian Role (Dapur / Kurir)
CREATE TABLE IF NOT EXISTS `checklist_templates` (
  `role` VARCHAR(50) PRIMARY KEY,
  `template_data` LONGTEXT NOT NULL,
  `updated_by` INT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daily_role_checklists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role` VARCHAR(50) NOT NULL,
  `checklist_date` DATE NOT NULL,
  `user_id` INT NOT NULL,
  `checklist_data` LONGTEXT NOT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_role_date_user` (`role`, `checklist_date`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Riwayat Tambah DP Pesanan (order_dp_payments)
CREATE TABLE IF NOT EXISTS `order_dp_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `payment_date` DATE NOT NULL,
  `proof_url` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_order_dp_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


