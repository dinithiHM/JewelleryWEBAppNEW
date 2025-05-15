-- Fix payment status for specific orders
-- This script directly updates the payment status for Udari Sanjana, NP Yapa, and Sonali Ehansa

-- First, let's check the current status of these orders
SELECT 
  order_id, 
  customer_name, 
  estimated_amount, 
  advance_amount, 
  balance_amount, 
  payment_status,
  (SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = custom_orders.order_id AND is_custom_order = 1) as total_paid
FROM custom_orders
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- Update the advance_amount to match the total paid from advance_payments
UPDATE custom_orders co
SET advance_amount = (
  SELECT COALESCE(SUM(ap.advance_amount), 0)
  FROM advance_payments ap
  WHERE ap.order_id = co.order_id AND ap.is_custom_order = 1
)
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- Update the payment status based on the advance_amount vs estimated_amount
UPDATE custom_orders
SET payment_status = 
  CASE 
    WHEN advance_amount >= estimated_amount THEN 'Fully Paid'
    WHEN advance_amount > 0 THEN 'Partially Paid'
    ELSE 'Not Paid'
  END
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- Check the updated status
SELECT 
  order_id, 
  customer_name, 
  estimated_amount, 
  advance_amount, 
  balance_amount, 
  payment_status
FROM custom_orders
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- If the above doesn't work, try direct updates for each customer
UPDATE custom_orders
SET advance_amount = 29000, payment_status = 'Fully Paid'
WHERE customer_name = 'Udari Sanjana';

UPDATE custom_orders
SET advance_amount = 10000, payment_status = 'Fully Paid'
WHERE customer_name = 'NP Yapa';

UPDATE custom_orders
SET advance_amount = 16800, payment_status = 'Fully Paid'
WHERE customer_name = 'Sonali Ehansa';

-- Final check
SELECT 
  order_id, 
  customer_name, 
  estimated_amount, 
  advance_amount, 
  balance_amount, 
  payment_status
FROM custom_orders
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');
