-- Migration: Add activity category to cash flow and edit history
-- Created: 2025-01-XX
-- Description: 
--   - Add activity_category field to cash_flow_transactions (operasi, investasi, pendanaan)
--   - Create cash_flow_edit_history table for tracking transaction edits
--   - Set default activity_category to 'operasi' for existing transactions

-- Add activity_category column to cash_flow_transactions
ALTER TABLE `cash_flow_transactions` 
ADD COLUMN `activity_category` enum('operasi','investasi','pendanaan') NOT NULL DEFAULT 'operasi' AFTER `type`,
ADD KEY `idx_activity_category` (`activity_category`);

-- Update existing transactions to have 'operasi' as default
UPDATE `cash_flow_transactions` SET `activity_category` = 'operasi' WHERE `activity_category` IS NULL;

-- Create cash_flow_edit_history table
CREATE TABLE IF NOT EXISTS `cash_flow_edit_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` int(11) NOT NULL,
  `changed_by` int(11) DEFAULT NULL COMMENT 'User who made the change',
  `old_type` enum('income','expense') DEFAULT NULL,
  `new_type` enum('income','expense') DEFAULT NULL,
  `old_amount` decimal(15,2) DEFAULT NULL,
  `new_amount` decimal(15,2) DEFAULT NULL,
  `old_description` text DEFAULT NULL,
  `new_description` text DEFAULT NULL,
  `old_activity_category` enum('operasi','investasi','pendanaan') DEFAULT NULL,
  `new_activity_category` enum('operasi','investasi','pendanaan') DEFAULT NULL,
  `change_type` enum('created','updated','deleted') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_changed_by` (`changed_by`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `cash_flow_edit_history_ibfk_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `cash_flow_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cash_flow_edit_history_ibfk_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




