-- This script will fix the foreign key constraint issue with advance_payments table

-- First, check if the foreign key exists
SELECT COUNT(*) INTO @constraint_exists
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'slanakajewel'
AND CONSTRAINT_NAME = 'advance_payments_ibfk_3'
AND TABLE_NAME = 'advance_payments';

-- Drop the existing foreign key constraint if it exists
SET @drop_fk_sql = IF(@constraint_exists > 0,
    'ALTER TABLE advance_payments DROP FOREIGN KEY advance_payments_ibfk_3',
    'SELECT "Foreign key constraint advance_payments_ibfk_3 does not exist" AS message');
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if the custom_order_fk constraint exists
SELECT COUNT(*) INTO @custom_fk_exists
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'slanakajewel'
AND CONSTRAINT_NAME = 'advance_payments_custom_order_fk'
AND TABLE_NAME = 'advance_payments';

-- Drop the custom order foreign key constraint if it exists
SET @drop_custom_fk_sql = IF(@custom_fk_exists > 0,
    'ALTER TABLE advance_payments DROP FOREIGN KEY advance_payments_custom_order_fk',
    'SELECT "Foreign key constraint advance_payments_custom_order_fk does not exist" AS message');
PREPARE stmt FROM @drop_custom_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if the order_id column exists in custom_orders table
SELECT COUNT(*) INTO @custom_order_id_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'slanakajewel'
AND TABLE_NAME = 'custom_orders'
AND COLUMN_NAME = 'order_id';

-- If the order_id column doesn't exist in custom_orders, we have a bigger problem
IF @custom_order_id_exists = 0 THEN
    SELECT 'ERROR: order_id column does not exist in custom_orders table' AS message;
    -- Exit the script
    LEAVE;
END IF;

-- Add foreign key constraint for custom orders
ALTER TABLE advance_payments
ADD CONSTRAINT fk_advance_payments_custom_orders
FOREIGN KEY (order_id) REFERENCES custom_orders(order_id);

-- Note: This assumes that order_id in advance_payments can reference either orders.order_id or custom_orders.order_id
-- depending on the value of is_custom_order

-- Show the changes
SELECT 'Advance payments table updated successfully' AS message;
