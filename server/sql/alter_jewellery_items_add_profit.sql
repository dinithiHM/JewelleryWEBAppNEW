-- Add profit column to jewellery_items table
ALTER TABLE jewellery_items 
ADD COLUMN profit_percentage DECIMAL(5, 2) DEFAULT NULL COMMENT 'Profit percentage for the item';

-- Create index for better performance when querying items with profit
CREATE INDEX idx_jewellery_items_profit ON jewellery_items(profit_percentage);
