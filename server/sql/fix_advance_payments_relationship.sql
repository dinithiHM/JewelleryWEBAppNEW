-- Fix the relationship between advance_payments and custom_orders

-- First, make sure the is_custom_order flag is set correctly
UPDATE advance_payments
SET is_custom_order = 1
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- Check if there are any payments for these customers
SELECT 
  payment_id,
  customer_name,
  order_id,
  is_custom_order,
  advance_amount,
  payment_status
FROM advance_payments
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- Get the order_id for each customer
SELECT 
  order_id,
  customer_name
FROM custom_orders
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- Update the order_id in advance_payments to match the correct custom_orders
-- Replace the order_id values below with the actual order_ids from your database
UPDATE advance_payments
SET order_id = (SELECT order_id FROM custom_orders WHERE customer_name = 'Udari Sanjana' LIMIT 1)
WHERE customer_name = 'Udari Sanjana' AND (order_id IS NULL OR order_id = 0);

UPDATE advance_payments
SET order_id = (SELECT order_id FROM custom_orders WHERE customer_name = 'NP Yapa' LIMIT 1)
WHERE customer_name = 'NP Yapa' AND (order_id IS NULL OR order_id = 0);

UPDATE advance_payments
SET order_id = (SELECT order_id FROM custom_orders WHERE customer_name = 'Sonali Ehansa' LIMIT 1)
WHERE customer_name = 'Sonali Ehansa' AND (order_id IS NULL OR order_id = 0);

-- Verify the updates
SELECT 
  ap.payment_id,
  ap.customer_name,
  ap.order_id,
  co.order_id AS custom_order_id,
  ap.advance_amount,
  ap.payment_status,
  co.payment_status AS custom_order_status
FROM advance_payments ap
LEFT JOIN custom_orders co ON ap.order_id = co.order_id
WHERE ap.customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');
