-- Migration: Create Operasional Checklist Table
-- Purpose: Store operational staff checklist items for daily shift operations

CREATE TABLE IF NOT EXISTS `operasional_checklists` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `shift_date` DATE NOT NULL COMMENT 'Tanggal shift operasional',
  `checklist_data` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Stores checklist sections and items with their checked status' CHECK (json_valid(`checklist_data`)),
  `saved_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`saved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  
  UNIQUE KEY `unique_shift_checklist` (`shift_date`, `saved_by`),
  KEY `idx_shift_date` (`shift_date`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


