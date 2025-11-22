-- Migration: Add commission_percentage to products table
-- Date: 2025-01-XX
-- Description: Add commission_percentage field to products table for marketing commission calculation

ALTER TABLE `products` 
ADD COLUMN `commission_percentage` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Commission percentage for marketing users (e.g., 10.00 for 10%)' 
AFTER `discount_percentage`;

