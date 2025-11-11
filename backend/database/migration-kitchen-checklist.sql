-- Migration: Create Kitchen Checklist Table
-- Purpose: Store kitchen staff checklist items for order preparation and production

CREATE TABLE IF NOT EXISTS `kitchen_checklists` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `checklist_data` JSON NOT NULL COMMENT 'Stores checklist sections and items with their checked status',
  `saved_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`saved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  
  KEY `idx_order_id` (`order_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample initial checklist data structure (for reference):
/*
{
  "sections": [
    {
      "id": "prep_bahan",
      "title": "PERSIAPAN BAHAN & BARANG",
      "items": [
        {"id": "prep_1", "text": "Lakukan persiapan produksi sebelum tanggal acara", "checked": false},
        ...
      ]
    },
    ...
  ]
}
*/

