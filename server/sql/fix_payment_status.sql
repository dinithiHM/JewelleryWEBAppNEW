-- Fix payment status in custom_orders table
-- This script updates the payment status in the custom_orders table based on the actual payments

-- Update orders that are fully paid
UPDATE custom_orders co
SET payment_status = 'Fully Paid'
WHERE (
  -- Orders where the total paid amount is greater than or equal to the estimated amount
  (SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id) >= co.estimated_amount
  OR
  -- Orders where the minimum balance is less than or equal to zero
  (SELECT MIN(balance_amount) FROM advance_payments WHERE order_id = co.order_id) <= 0
)
AND payment_status != 'Fully Paid';

-- Update orders that are partially paid
UPDATE custom_orders co
SET payment_status = 'Partially Paid'
WHERE (
  -- Orders where there is some payment but not fully paid
  (SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id) > 0
  AND (SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id) < co.estimated_amount
  AND (SELECT MIN(balance_amount) FROM advance_payments WHERE order_id = co.order_id) > 0
)
AND payment_status != 'Partially Paid';

-- Update orders that are not paid
UPDATE custom_orders co
SET payment_status = 'Not Paid'
WHERE (
  -- Orders with no payments
  (SELECT COUNT(*) FROM advance_payments WHERE order_id = co.order_id) = 0
  OR
  (SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id) = 0
)
AND payment_status != 'Not Paid';

-- Update the advance_amount in custom_orders to match the total paid amount
UPDATE custom_orders co
SET advance_amount = (SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id)
WHERE (SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id) IS NOT NULL
AND (SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id) != co.advance_amount;

-- Show the updated orders
SELECT 
  order_id, 
  order_reference, 
  customer_name, 
  estimated_amount, 
  advance_amount, 
  balance_amount, 
  payment_status 
FROM custom_orders 
WHERE (SELECT COUNT(*) FROM advance_payments WHERE order_id = custom_orders.order_id) > 0
ORDER BY order_id;
