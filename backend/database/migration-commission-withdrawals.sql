-- Migration: Commission Withdrawals
-- Date: 2025-01-XX
-- Description: Create table for commission withdrawal requests

CREATE TABLE IF NOT EXISTS `commission_withdrawals` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `marketing_id` INT(11) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `bank_name` VARCHAR(100) NOT NULL,
  `account_number` VARCHAR(50) NOT NULL,
  `account_name` VARCHAR(100) NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
  `admin_notes` TEXT DEFAULT NULL,
  `processed_by` INT(11) DEFAULT NULL COMMENT 'Admin who processed the withdrawal',
  `processed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_marketing_id` (`marketing_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_withdrawal_marketing` FOREIGN KEY (`marketing_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_withdrawal_admin` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

