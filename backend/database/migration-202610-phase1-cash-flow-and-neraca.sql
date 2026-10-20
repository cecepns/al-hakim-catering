-- ==============================================================
-- Migration: Phase 1 - Revisi Arus Kas & Neraca (Jurnal Akuntansi)
-- Date: 2026-10-19
-- Description:
--   1. Tambah kolom sub_category, debit_account, credit_account, is_edited pada cash_flow_transactions
--   2. Tambah kolom pelacak perubahan pada cash_flow_edit_history
--   3. Buat tabel accounting_journal_entries untuk menampung transaksi jurnal neraca
-- ==============================================================

-- 1. Alter cash_flow_transactions
ALTER TABLE `cash_flow_transactions`
ADD COLUMN `sub_category` VARCHAR(100) NULL AFTER `activity_category`,
ADD COLUMN `debit_account` VARCHAR(100) NULL AFTER `sub_category`,
ADD COLUMN `credit_account` VARCHAR(100) NULL AFTER `debit_account`,
ADD COLUMN `is_edited` TINYINT(1) NOT NULL DEFAULT 0 AFTER `created_by`;

-- 2. Alter cash_flow_edit_history
ALTER TABLE `cash_flow_edit_history`
ADD COLUMN `old_sub_category` VARCHAR(100) NULL AFTER `new_activity_category`,
ADD COLUMN `new_sub_category` VARCHAR(100) NULL AFTER `old_sub_category`,
ADD COLUMN `old_debit_account` VARCHAR(100) NULL AFTER `new_sub_category`,
ADD COLUMN `new_debit_account` VARCHAR(100) NULL AFTER `old_debit_account`,
ADD COLUMN `old_credit_account` VARCHAR(100) NULL AFTER `new_debit_account`,
ADD COLUMN `new_credit_account` VARCHAR(100) NULL AFTER `old_credit_account`;

-- 3. Create accounting_journal_entries
CREATE TABLE IF NOT EXISTS `accounting_journal_entries` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `entry_date` DATE NOT NULL,
  `reference_type` ENUM('cash_flow', 'order', 'purchase', 'manual', 'order_cost') NOT NULL DEFAULT 'cash_flow',
  `reference_id` INT(11) NULL,
  `description` VARCHAR(255) NOT NULL,
  `debit_account` VARCHAR(100) NOT NULL,
  `credit_account` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `created_by` INT(11) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entry_date` (`entry_date`),
  KEY `idx_debit_account` (`debit_account`),
  KEY `idx_credit_account` (`credit_account`),
  KEY `idx_ref` (`reference_type`, `reference_id`),
  CONSTRAINT `fk_journal_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
