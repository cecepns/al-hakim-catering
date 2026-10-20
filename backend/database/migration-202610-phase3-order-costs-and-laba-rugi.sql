-- ==============================================================
-- Migration: Order Costs, Materials & Comprehensive Accounting Integration
-- Date: 2026-10-20
-- Description:
--   1. Tabel order_costs (Modal pesanan: Harga, Keterangan, Foto Nota)
--   2. Tabel order_materials (Bahan Baku pesanan: Inventory item, Qty, Nilai HPP)
--   3. Tambah kolom refund_amount & refund_notes pada orders
-- ==============================================================

-- 1. Tabel order_costs
CREATE TABLE IF NOT EXISTS `order_costs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `proof_image_url` VARCHAR(500) NULL,
  `cash_flow_id` INT(11) NULL,
  `journal_id` INT(11) NULL,
  `created_by` INT(11) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_cost_order` (`order_id`),
  CONSTRAINT `fk_oc_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_oc_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel order_materials
CREATE TABLE IF NOT EXISTS `order_materials` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL,
  `inventory_item_id` INT(11) NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NULL,
  `quantity` DECIMAL(15,2) NOT NULL,
  `unit` VARCHAR(50) NOT NULL DEFAULT 'Pcs',
  `unit_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `journal_id` INT(11) NULL,
  `created_by` INT(11) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_mat_order` (`order_id`),
  KEY `idx_order_mat_item` (`inventory_item_id`),
  CONSTRAINT `fk_om_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_om_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_om_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Alter orders table to support refund info
ALTER TABLE `orders`
ADD COLUMN `refund_amount` DECIMAL(15,2) DEFAULT 0.00 AFTER `payment_status`,
ADD COLUMN `refund_notes` TEXT NULL AFTER `refund_amount`;
