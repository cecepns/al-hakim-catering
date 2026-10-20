-- ==============================================================
-- Migration: Phase 2 - Inventory & Purchasing Management
-- Date: 2026-10-19
-- Description:
--   1. Master Stok Persediaan (inventory_items)
--   2. Tracking Stok Persediaan / Kartu Stok (inventory_stock_logs)
--   3. Stok Opname (inventory_opname)
--   4. Pengajuan Pembelian (purchase_requests)
--   5. Pembelian Bahan/Barang (purchases)
-- ==============================================================

-- 1. Master Stok Persediaan
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(100) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(50) NOT NULL DEFAULT 'Pcs',
  `stock` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `min_stock` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `last_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tracking Stok Persediaan (Kartu Stok)
CREATE TABLE IF NOT EXISTS `inventory_stock_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `inventory_item_id` INT(11) NOT NULL,
  `date` DATE NOT NULL,
  `stock_initial` DECIMAL(15,2) NOT NULL,
  `stock_in` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `stock_out` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `stock_final` DECIMAL(15,2) NOT NULL,
  `notes` VARCHAR(255) NULL,
  `reference_type` ENUM('purchase', 'order', 'return', 'opname', 'manual') NOT NULL DEFAULT 'manual',
  `reference_id` INT(11) NULL,
  `created_by` INT(11) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_item_date` (`inventory_item_id`, `date`),
  KEY `idx_reference` (`reference_type`, `reference_id`),
  CONSTRAINT `fk_stock_log_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_log_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Stok Opname
CREATE TABLE IF NOT EXISTS `inventory_opname` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `inventory_item_id` INT(11) NOT NULL,
  `date` DATE NOT NULL,
  `system_stock` DECIMAL(15,2) NOT NULL,
  `physical_stock` DECIMAL(15,2) NOT NULL,
  `difference` DECIMAL(15,2) NOT NULL,
  `notes` TEXT NULL,
  `checked_by` INT(11) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_opname_item` (`inventory_item_id`),
  KEY `idx_opname_date` (`date`),
  CONSTRAINT `fk_opname_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_opname_user` FOREIGN KEY (`checked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Pengajuan Pembelian
CREATE TABLE IF NOT EXISTS `purchase_requests` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `request_no` VARCHAR(100) NOT NULL UNIQUE,
  `request_date` DATE NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `inventory_item_id` INT(11) NULL,
  `specification` TEXT NULL,
  `qty` DECIMAL(15,2) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `needed_date` DATE NULL,
  `reason` TEXT NULL,
  `priority` ENUM('Normal', 'Penting', 'Mendesak') NOT NULL DEFAULT 'Normal',
  `approval_status` ENUM('Menunggu', 'Disetujui', 'Ditolak', 'Ditunda', 'Dibatalkan') NOT NULL DEFAULT 'Menunggu',
  `approval_notes` TEXT NULL,
  `approved_by` INT(11) NULL,
  `receipt_status` ENUM('Belum Diterima', 'Diterima Sebagian', 'Diterima', 'Ditolak') NOT NULL DEFAULT 'Belum Diterima',
  `receipt_notes` TEXT NULL,
  `created_by` INT(11) NOT NULL,
  `created_role` VARCHAR(50) NOT NULL DEFAULT 'dapur',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_request_no` (`request_no`),
  KEY `idx_approval_status` (`approval_status`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_preq_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_preq_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Pembelian (Purchasing Order)
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `purchase_no` VARCHAR(100) NOT NULL UNIQUE,
  `request_id` INT(11) NULL,
  `purchase_date` DATE NOT NULL,
  `supplier` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `inventory_item_id` INT(11) NULL,
  `specification` TEXT NULL,
  `qty` DECIMAL(15,2) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `total_price` DECIMAL(15,2) NOT NULL,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `invoice_proof_url` VARCHAR(500) NULL,
  `payment_method` ENUM('Tunai', 'Transfer', 'DP') NOT NULL DEFAULT 'Tunai',
  `dp_amount` DECIMAL(15,2) DEFAULT 0.00,
  `remaining_payment` DECIMAL(15,2) DEFAULT 0.00,
  `due_date` DATE NULL,
  `payment_status` ENUM('paid', 'partial', 'unpaid') NOT NULL DEFAULT 'paid',
  `status` ENUM('Dipesan', 'Belanja', 'Diterima', 'Direturn', 'Dibatalkan', 'Selesai') NOT NULL DEFAULT 'Dipesan',
  `notes` TEXT NULL,
  `return_amount` DECIMAL(15,2) DEFAULT 0.00,
  `return_notes` TEXT NULL,
  `created_by` INT(11) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_purchase_no` (`purchase_no`),
  KEY `idx_status` (`status`),
  KEY `idx_request_id` (`request_id`),
  CONSTRAINT `fk_pur_preq` FOREIGN KEY (`request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pur_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pur_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample Seed Data for Common Catering Inventory
INSERT IGNORE INTO `inventory_items` (`category`, `name`, `unit`, `stock`, `min_stock`, `last_price`, `notes`) VALUES
('Bahan Pokok', 'Beras Ramos Super', 'Kilo', 150.00, 50.00, 14000.00, 'Kebutuhan nasi kotak dan prasmanan'),
('Bahan Pokok', 'Minyak Goreng SunCo 2L', 'Liter', 30.00, 10.00, 19000.00, 'Stok dapur utama'),
('Daging & Unggas', 'Ayam Broiler Utuh', 'Kilo', 45.00, 20.00, 36000.00, 'Ayam potongan olahan catering'),
('Daging & Unggas', 'Daging Sapi Rendang', 'Kilo', 25.00, 10.00, 135000.00, 'Daging sapi segar'),
('Bumbu & Rempah', 'Bawang Merah Brebes', 'Kilo', 15.00, 5.00, 35000.00, 'Bumbu dasar'),
('Bumbu & Rempah', 'Bawang Putih Kating', 'Kilo', 12.00, 5.00, 38000.00, 'Bumbu dasar'),
('Kemasan & Perlengkapan', 'Kotak Nasi 20x20 Cetak Logo', 'Dus', 8.00, 10.00, 145000.00, 'Isi 100 pcs per dus'),
('Kemasan & Perlengkapan', 'Sendok Bebek Plastik Higienis', 'Dus', 5.00, 8.00, 45000.00, 'Isi 500 pcs');
