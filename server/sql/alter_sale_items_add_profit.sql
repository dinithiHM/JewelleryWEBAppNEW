-- Add profit_percentage column to sale_items table
ALTER TABLE sale_items 
ADD COLUMN profit_percentage DECIMAL(5, 2) DEFAULT NULL COMMENT 'Profit percentage for the item';

-- Create index for better performance when querying items with profit
CREATE INDEX idx_sale_items_profit ON sale_items(profit_percentage);
