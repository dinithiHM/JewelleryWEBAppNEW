-- SQL statement to add profit_percentage column to jewellery_items table if it doesn't already exist
-- Note: This column already exists in your database as shown in the screenshot

-- If you need to recreate it:
ALTER TABLE jewellery_items 
ADD COLUMN IF NOT EXISTS profit_percentage DECIMAL(5,2) DEFAULT NULL;

-- Example of how to update existing items with a profit percentage
-- UPDATE jewellery_items SET profit_percentage = 15.00 WHERE profit_percentage IS NULL;

-- Example of how to set a maximum profit percentage constraint (15%)
-- You can add this as a CHECK constraint if needed
-- ALTER TABLE jewellery_items ADD CONSTRAINT check_profit_percentage CHECK (profit_percentage <= 15.00);
