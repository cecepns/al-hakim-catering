-- Migration: Add company settings table for invoice
-- Created: 2025-01-XX
-- Description: 
--   - Create company_settings table to store company information for invoices
--   - Store company name, address, phone, email, logo, etc.

CREATE TABLE IF NOT EXISTS `company_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) NOT NULL DEFAULT 'Al Hakim Catering',
  `company_address` text DEFAULT NULL,
  `company_phone` varchar(50) DEFAULT NULL,
  `company_email` varchar(255) DEFAULT NULL,
  `company_logo_url` varchar(500) DEFAULT NULL,
  `tax_id` varchar(100) DEFAULT NULL COMMENT 'NPWP',
  `bank_name` varchar(255) DEFAULT NULL,
  `bank_account_number` varchar(100) DEFAULT NULL,
  `bank_account_name` varchar(255) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  CONSTRAINT `company_settings_ibfk_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default company settings
INSERT INTO `company_settings` (`id`, `company_name`, `company_address`, `company_phone`, `company_email`) 
VALUES (1, 'Al Hakim Catering', NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE `company_name` = 'Al Hakim Catering';

