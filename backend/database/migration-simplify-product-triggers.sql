-- Migration: Simplify Product Triggers (Alternative Fix)
-- Purpose: Remove complex min_price calculation from triggers to avoid issues
-- Date: 2025-11-11
-- NOTE: Use this if the previous migration has issues

-- Drop existing triggers
DROP TRIGGER IF EXISTS `trg_product_insert_update_min_price`;
DROP TRIGGER IF EXISTS `trg_product_update_set_min_price`;

-- Simple BEFORE INSERT trigger
DELIMITER $$

CREATE TRIGGER `trg_product_insert_update_min_price` BEFORE INSERT ON `products` FOR EACH ROW
BEGIN
  IF NEW.min_price IS NULL THEN
    SET NEW.min_price = NEW.price;
  END IF;
END$$

DELIMITER ;

-- Simple BEFORE UPDATE trigger (just set to current price, don't calculate)
DELIMITER $$

CREATE TRIGGER `trg_product_update_set_min_price` BEFORE UPDATE ON `products` FOR EACH ROW
BEGIN
  IF NEW.min_price IS NULL THEN
    SET NEW.min_price = NEW.price;
  END IF;
END$$

DELIMITER ;

