-- Migration: Add pin feature to orders table
-- Created: 2025-01-XX
-- Description: 
--   - Add is_pinned column to mark orders as pinned
--   - Add pinned_by column to track who pinned the order
--   - Add pinned_at column to track when order was pinned

-- Add is_pinned column
ALTER TABLE `orders` 
ADD COLUMN `is_pinned` tinyint(1) DEFAULT 0 
AFTER `status`;

-- Add pinned_by column (user_id who pinned the order)
ALTER TABLE `orders` 
ADD COLUMN `pinned_by` int(11) DEFAULT NULL 
AFTER `is_pinned`;

-- Add pinned_at column
ALTER TABLE `orders` 
ADD COLUMN `pinned_at` timestamp NULL DEFAULT NULL 
AFTER `pinned_by`;

-- Add index for faster querying
ALTER TABLE `orders` 
ADD KEY `idx_pinned` (`is_pinned`);

-- Add foreign key constraint for pinned_by
ALTER TABLE `orders` 
ADD CONSTRAINT `orders_ibfk_pinned_by` FOREIGN KEY (`pinned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

