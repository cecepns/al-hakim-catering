-- Migration: Create Kurir Checklist Table
-- Purpose: Store courier/delivery staff checklist items for order delivery process

CREATE TABLE IF NOT EXISTS `kurir_checklists` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `checklist_data` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Stores checklist sections and items with their checked status' CHECK (json_valid(`checklist_data`)),
  `saved_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`saved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  
  UNIQUE KEY `unique_order_checklist` (`order_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

