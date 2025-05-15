-- Comprehensive fix for payment status issues
-- This script will fix all payment status issues in the database

-- Step 1: Check the current state of the tables
SELECT 'Checking custom orders' AS message;
SELECT 
  order_id, 
  customer_name, 
  estimated_amount, 
  advance_amount, 
  balance_amount, 
  payment_status
FROM custom_orders
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

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
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- Step 2: Fix the is_custom_order flag in advance_payments
UPDATE advance_payments
SET is_custom_order = 1
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- Step 3: Make sure the order_id in advance_payments matches the correct custom_orders
-- For Udari Sanjana
SET @udari_order_id = (SELECT order_id FROM custom_orders WHERE customer_name = 'Udari Sanjana' LIMIT 1);
UPDATE advance_payments
SET order_id = @udari_order_id
WHERE customer_name = 'Udari Sanjana';

-- For NP Yapa
SET @np_order_id = (SELECT order_id FROM custom_orders WHERE customer_name = 'NP Yapa' LIMIT 1);
UPDATE advance_payments
SET order_id = @np_order_id
WHERE customer_name = 'NP Yapa';

-- For Sonali Ehansa
SET @sonali_order_id = (SELECT order_id FROM custom_orders WHERE customer_name = 'Sonali Ehansa' LIMIT 1);
UPDATE advance_payments
SET order_id = @sonali_order_id
WHERE customer_name = 'Sonali Ehansa';

-- Step 4: Calculate the total paid amount for each order
SELECT 'Calculating total paid amounts' AS message;
SELECT 
  co.order_id,
  co.customer_name,
  co.estimated_amount,
  SUM(ap.advance_amount) AS total_paid
FROM custom_orders co
LEFT JOIN advance_payments ap ON co.order_id = ap.order_id AND ap.is_custom_order = 1
WHERE co.customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa')
GROUP BY co.order_id;

-- Step 5: Update the advance_amount in custom_orders to match the total paid
UPDATE custom_orders co
SET advance_amount = (
  SELECT COALESCE(SUM(ap.advance_amount), 0)
  FROM advance_payments ap
  WHERE ap.order_id = co.order_id AND ap.is_custom_order = 1
)
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- Step 6: Update the payment status based on the advance_amount vs estimated_amount
UPDATE custom_orders
SET payment_status = 
  CASE 
    WHEN advance_amount >= estimated_amount THEN 'Fully Paid'
    WHEN advance_amount > 0 THEN 'Partially Paid'
    ELSE 'Not Paid'
  END
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- Step 7: If all else fails, directly set the values
-- Only uncomment and use these if the above steps don't work
/*
UPDATE custom_orders
SET advance_amount = 29000, payment_status = 'Fully Paid'
WHERE customer_name = 'Udari Sanjana';

UPDATE custom_orders
SET advance_amount = 10000, payment_status = 'Fully Paid'
WHERE customer_name = 'NP Yapa';

UPDATE custom_orders
SET advance_amount = 16800, payment_status = 'Fully Paid'
WHERE customer_name = 'Sonali Ehansa';
*/

-- Step 8: Verify the final state
SELECT 'Final state of custom orders' AS message;
SELECT 
  order_id, 
  customer_name, 
  estimated_amount, 
  advance_amount, 
  balance_amount, 
  payment_status
FROM custom_orders
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

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
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');
