-- Migration: Add 'siap-kirim' status to orders and order_status_logs tables
-- Date: 2025-01-XX
-- Description: Add new status 'siap-kirim' to track orders ready for shipping

-- Update orders table status enum
ALTER TABLE `orders` 
MODIFY COLUMN `status` enum('dibuat','diproses','siap-kirim','dikirim','selesai','dibatalkan') DEFAULT 'dibuat';

-- Update order_status_logs table status enum
ALTER TABLE `order_status_logs` 
MODIFY COLUMN `status` enum('dibuat','diproses','siap-kirim','dikirim','selesai','dibatalkan') NOT NULL;

