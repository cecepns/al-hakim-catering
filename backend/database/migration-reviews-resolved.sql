-- Migration: Add resolved field to reviews table
-- This allows admin to mark reviews as resolved

ALTER TABLE `reviews` 
ADD COLUMN `resolved` tinyint(1) DEFAULT 0 AFTER `is_approved`;

-- Update existing reviews to set resolved = 0
UPDATE `reviews` SET `resolved` = 0 WHERE `resolved` IS NULL;

