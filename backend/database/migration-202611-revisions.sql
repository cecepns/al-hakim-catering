-- ==============================================================
-- Migration: Revisions November 2026
-- Date: 2026-11-02
-- Description:
--   1. Tambahkan kolom received_qty pada purchase_requests untuk penerimaan sebagian/penuh
--   2. Tambahkan kolom action pada inventory_opname untuk kolom esai tindakan opname
-- ==============================================================

-- 1. Tambahkan kolom received_qty pada purchase_requests jika belum ada
ALTER TABLE `purchase_requests` 
  ADD COLUMN `received_qty` DECIMAL(15,2) NULL AFTER `receipt_status`;

-- 2. Tambahkan kolom action (Tindakan) pada inventory_opname jika belum ada
ALTER TABLE `inventory_opname` 
  ADD COLUMN `action` TEXT NULL AFTER `notes`;

