-- Migration: Admin Daily Checklist
-- Date: 2025-01-XX
-- Description: Create table for admin daily checklist

CREATE TABLE IF NOT EXISTS `admin_checklists` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `checklist_date` DATE NOT NULL,
  `admin_id` INT(11) NOT NULL,
  `checklist_data` JSON NOT NULL COMMENT 'Stores checklist items with their completion status',
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_date_admin` (`checklist_date`, `admin_id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_checklist_date` (`checklist_date`),
  CONSTRAINT `fk_admin_checklist_user` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

