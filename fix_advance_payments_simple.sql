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

-- Add the new foreign key constraint referencing custom_orders
ALTER TABLE advance_payments
ADD CONSTRAINT fk_advance_payments_custom_orders
FOREIGN KEY (order_id) REFERENCES custom_orders(order_id);

-- Show the changes
SELECT 'Advance payments table updated successfully' AS message;
