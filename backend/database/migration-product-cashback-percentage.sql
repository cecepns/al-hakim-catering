ALTER TABLE products
ADD COLUMN cashback_percentage DECIMAL(5,2) NOT NULL DEFAULT 1.00 AFTER discount_percentage;


