-- Add discount columns to sale_items table
ALTER TABLE sale_items ADD COLUMN original_price DECIMAL(10, 2) AFTER unit_price;
ALTER TABLE sale_items ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0 AFTER original_price;
ALTER TABLE sale_items ADD COLUMN discount_type ENUM('percentage', 'fixed') DEFAULT 'fixed' AFTER discount_amount;

-- Update existing records to set original_price equal to unit_price
UPDATE sale_items SET original_price = unit_price WHERE original_price IS NULL;
