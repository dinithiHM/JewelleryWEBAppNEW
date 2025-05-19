-- Check the structure of the custom_orders table
DESCRIBE custom_orders;

-- Check if the custom_order_details view exists
SELECT * FROM information_schema.VIEWS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'custom_order_details';

-- Get the current definition of the custom_order_details view if it exists
SHOW CREATE VIEW custom_order_details;
