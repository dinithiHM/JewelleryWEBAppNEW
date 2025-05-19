-- Add quantity column to custom_orders table if it doesn't exist
ALTER TABLE custom_orders
ADD COLUMN IF NOT EXISTS quantity INT NULL DEFAULT 1 COMMENT 'Quantity of items in the custom order';

-- Show the updated column definition
DESCRIBE custom_orders quantity;
