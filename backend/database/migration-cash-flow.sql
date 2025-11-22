-- Migration: Add cash flow transactions table
-- Created: 2025-01-XX
-- Description: 
--   - Create cash_flow_transactions table for tracking income and expenses
--   - Automatically track sales as income
--   - Allow manual entry of income/expense transactions with proof

CREATE TABLE IF NOT EXISTS `cash_flow_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('income','expense') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` text DEFAULT NULL,
  `proof_image_url` varchar(500) DEFAULT NULL,
  `order_id` int(11) DEFAULT NULL COMMENT 'Reference to order if this is automatic income from sale',
  `created_by` int(11) DEFAULT NULL COMMENT 'User who created this transaction',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `cash_flow_transactions_ibfk_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cash_flow_transactions_ibfk_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

