-- Comprehensive fix for all custom orders payment status
-- This script will fix payment status issues for ALL custom orders

-- Step 1: Check the current state of the tables
SELECT 'Checking custom orders' AS message;
SELECT 
  order_id, 
  customer_name, 
  estimated_amount, 
  advance_amount, 
  balance_amount, 
  payment_status
FROM custom_orders;

SELECT 'Checking advance payments' AS message;
SELECT 
  payment_id,
  customer_name,
  order_id,
  is_custom_order,
  total_amount,
  advance_amount,
  balance_amount,
  payment_status
FROM advance_payments
WHERE is_custom_order = 1;

-- Step 2: Fix the foreign key constraint issue
-- First, check if the foreign key exists
SELECT COUNT(*) INTO @constraint_exists
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE()
AND CONSTRAINT_NAME = 'advance_payments_ibfk_3'
AND TABLE_NAME = 'advance_payments';

-- Drop the existing foreign key constraint if it exists
SET @drop_fk_sql = IF(@constraint_exists > 0,
    'ALTER TABLE advance_payments DROP FOREIGN KEY advance_payments_ibfk_3',
    'SELECT "Foreign key constraint advance_payments_ibfk_3 does not exist" AS message');
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Fix the is_custom_order flag in advance_payments
-- This ensures all payments for custom orders have the flag set correctly
UPDATE advance_payments ap
JOIN custom_orders co ON ap.customer_name = co.customer_name
SET ap.is_custom_order = 1, ap.order_id = co.order_id
WHERE ap.is_custom_order = 0 AND co.customer_name IS NOT NULL;

-- Step 4: Calculate the total paid amount for each order
SELECT 'Calculating total paid amounts' AS message;
SELECT 
  co.order_id,
  co.customer_name,
  co.estimated_amount,
  SUM(ap.advance_amount) AS total_paid
FROM custom_orders co
LEFT JOIN advance_payments ap ON co.order_id = ap.order_id AND ap.is_custom_order = 1
GROUP BY co.order_id;

-- Step 5: Update the advance_amount in custom_orders to match the total paid
-- This is the key step that fixes the payment amount tracking
UPDATE custom_orders co
SET advance_amount = (
  SELECT COALESCE(SUM(ap.advance_amount), 0)
  FROM advance_payments ap
  WHERE ap.order_id = co.order_id AND ap.is_custom_order = 1
);

-- Step 6: Update the payment status based on the advance_amount vs estimated_amount
-- This ensures the payment status is correct based on the actual payments
UPDATE custom_orders
SET payment_status = 
  CASE 
    WHEN advance_amount >= estimated_amount THEN 'Fully Paid'
    WHEN advance_amount > 0 THEN 'Partially Paid'
    ELSE 'Not Paid'
  END;

-- Step 7: Verify the final state
SELECT 'Final state of custom orders' AS message;
SELECT 
  order_id, 
  customer_name, 
  estimated_amount, 
  advance_amount, 
  balance_amount, 
  payment_status
FROM custom_orders;

SELECT 'Final state of advance payments' AS message;
SELECT 
  payment_id,
  customer_name,
  order_id,
  is_custom_order,
  total_amount,
  advance_amount,
  balance_amount,
  payment_status
FROM advance_payments
WHERE is_custom_order = 1;
