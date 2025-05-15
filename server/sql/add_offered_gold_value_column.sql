-- Add offered_gold_value column to orders table
ALTER TABLE orders
ADD COLUMN offered_gold_value DECIMAL(10,2) DEFAULT 0 COMMENT 'Value of offered gold material deducted from total price';

-- Create index for better performance
CREATE INDEX idx_orders_offered_gold_value ON orders(offered_gold_value);
