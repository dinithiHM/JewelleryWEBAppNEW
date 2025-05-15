-- Add gold price related columns to sale_items table
ALTER TABLE sale_items 
ADD COLUMN gold_price_per_gram DECIMAL(10, 2) DEFAULT NULL COMMENT 'Gold price per gram at time of sale',
ADD COLUMN gold_carat DECIMAL(5, 2) DEFAULT NULL COMMENT 'Gold carat/purity of the item',
ADD COLUMN gold_weight DECIMAL(10, 3) DEFAULT NULL COMMENT 'Weight of the gold item in grams',
ADD COLUMN is_gold_price_based BOOLEAN DEFAULT FALSE COMMENT 'Whether price was calculated based on gold price';

-- Create index for better performance when querying gold items
CREATE INDEX idx_sale_items_gold ON sale_items(is_gold_price_based);
