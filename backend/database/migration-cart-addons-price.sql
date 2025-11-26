-- Migration: Add addon_ids and total_price to cart table
-- Date: 2025-11-26

ALTER TABLE `cart` 
ADD COLUMN `addon_ids` JSON DEFAULT NULL AFTER `variant_id`,
ADD COLUMN `total_price` DECIMAL(10,2) DEFAULT NULL AFTER `quantity`;

-- Update existing cart items to have total_price = price * quantity
UPDATE `cart` c
JOIN `products` p ON c.product_id = p.id
SET c.total_price = (COALESCE(p.discounted_price, p.price) * c.quantity);

