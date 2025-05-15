-- First, check if the foreign key exists
SELECT COUNT(*) INTO @constraint_exists
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'slanakajewel'
AND CONSTRAINT_NAME = 'advance_payments_ibfk_3'
AND TABLE_NAME = 'advance_payments';

-- Drop the existing foreign key constraint if it exists
SET @drop_fk_sql = IF(@constraint_exists > 0,
    'ALTER TABLE advance_payments DROP FOREIGN KEY advance_payments_ibfk_3',
    'SELECT "Foreign key does not exist" AS message');
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add the new foreign key constraint referencing custom_orders
ALTER TABLE advance_payments
ADD CONSTRAINT advance_payments_custom_order_fk
FOREIGN KEY (order_id) REFERENCES custom_orders(order_id);
