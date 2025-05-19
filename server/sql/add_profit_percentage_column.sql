-- Add profit_percentage column to custom_orders table if it doesn't exist
ALTER TABLE custom_orders
ADD COLUMN IF NOT EXISTS profit_percentage DECIMAL(5, 2) NULL DEFAULT NULL COMMENT 'Profit percentage for the custom order';

-- If the column already exists, modify it to remove the default value of 10.00
ALTER TABLE custom_orders 
MODIFY COLUMN profit_percentage DECIMAL(5, 2) NULL DEFAULT NULL;

-- Create index for better performance when querying orders with profit
CREATE INDEX IF NOT EXISTS idx_custom_orders_profit ON custom_orders(profit_percentage);

-- Show the updated column definition
DESCRIBE custom_orders profit_percentage;
