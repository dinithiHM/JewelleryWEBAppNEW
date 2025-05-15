-- Check the schema of the custom_orders table
-- This will show how the balance_amount column is defined

-- Show the table schema
SHOW CREATE TABLE custom_orders;

-- Show the columns in the table
DESCRIBE custom_orders;

-- Check if balance_amount is a generated column
SELECT 
    TABLE_NAME, 
    COLUMN_NAME, 
    GENERATION_EXPRESSION, 
    EXTRA
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'custom_orders'
    AND COLUMN_NAME = 'balance_amount';

-- Check a sample of data to see how balance_amount is calculated
SELECT 
    order_id,
    estimated_amount,
    advance_amount,
    balance_amount,
    (estimated_amount - advance_amount) as calculated_balance
FROM 
    custom_orders
LIMIT 5;
