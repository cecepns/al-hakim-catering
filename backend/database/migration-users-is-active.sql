-- Migration: Add is_active field to users table
-- Purpose: Enable user activation/deactivation functionality

ALTER TABLE `users` 
ADD COLUMN `is_active` TINYINT(1) DEFAULT 1 AFTER `role`,
ADD INDEX `idx_is_active` (`is_active`);

-- Update existing users to be active by default
UPDATE `users` SET `is_active` = 1 WHERE `is_active` IS NULL;
