-- Migration: Fix Product Update Triggers (ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG)
-- Purpose: Convert AFTER triggers to BEFORE triggers to prevent circular reference
-- Date: 2025-11-11

-- Drop existing problematic triggers
DROP TRIGGER IF EXISTS `trg_product_insert_update_min_price`;
DROP TRIGGER IF EXISTS `trg_product_update_set_min_price`;

-- Create corrected BEFORE triggers
DELIMITER $$

CREATE TRIGGER `trg_product_insert_update_min_price` BEFORE INSERT ON `products` FOR EACH ROW
BEGIN
  SET NEW.min_price = NEW.price;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER `trg_product_update_set_min_price` BEFORE UPDATE ON `products` FOR EACH ROW
BEGIN
  SET NEW.min_price = LEAST(NEW.price, COALESCE((SELECT MIN(price + price_adjustment) FROM product_variants WHERE product_id = NEW.id), NEW.price));
END$$

DELIMITER ;

