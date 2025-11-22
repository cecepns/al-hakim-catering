-- Migration: Add payment_amount and marketing partner fields to orders table
-- Created: 2025-01-XX
-- Description: 
--   - Add payment_amount column to track actual payment amount (for DP, transfer, tunai)
--   - Add partner_business_name and partner_wa_number for marketing partner tracking

-- Add payment_amount column
-- Nominal pembayaran yang dibayar customer (untuk DP, transfer, tunai)
ALTER TABLE `orders` 
ADD COLUMN `payment_amount` DECIMAL(15,2) DEFAULT NULL 
AFTER `payment_method`;

-- Add marketing partner fields
-- Nama usaha mitra marketing
ALTER TABLE `orders` 
ADD COLUMN `partner_business_name` VARCHAR(255) DEFAULT NULL 
AFTER `guest_reference_detail`;

-- Nomor WA mitra marketing
ALTER TABLE `orders` 
ADD COLUMN `partner_wa_number` VARCHAR(20) DEFAULT NULL 
AFTER `partner_business_name`;

-- Optional: Add index for payment_amount if needed for reporting
-- ALTER TABLE `orders` ADD KEY `idx_payment_amount` (`payment_amount`);

-- Optional: Add index for partner fields if needed for marketing tracking
-- ALTER TABLE `orders` ADD KEY `idx_partner_business` (`partner_business_name`);

