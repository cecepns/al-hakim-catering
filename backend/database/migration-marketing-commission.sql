-- Migration: Update marketing commission structure
-- Date: 2025-01-XX
-- Description: Add commission_percentage to users table and margin_amount to orders table

-- Add commission_percentage to users table for marketing users
ALTER TABLE `users` 
ADD COLUMN `commission_percentage` DECIMAL(5,2) DEFAULT NULL COMMENT 'Commission percentage for marketing users (e.g., 10.00 for 10%)' 
AFTER `cashback_balance`;

-- Add margin_amount to orders table to store marketing margin
ALTER TABLE `orders` 
ADD COLUMN `margin_amount` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Marketing margin added to base amount' 
AFTER `final_amount`;

-- Add base_amount to orders table to store original total before margin
ALTER TABLE `orders` 
ADD COLUMN `base_amount` DECIMAL(15,2) DEFAULT NULL COMMENT 'Original total amount before marketing margin' 
AFTER `total_amount`;

-- Update existing orders: set base_amount = total_amount if NULL
UPDATE `orders` SET `base_amount` = `total_amount` WHERE `base_amount` IS NULL;

