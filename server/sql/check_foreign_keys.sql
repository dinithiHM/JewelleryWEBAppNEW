-- Check foreign key constraints between advance_payments and custom_orders

-- Check the structure of advance_payments table
DESCRIBE advance_payments;

-- Check the structure of custom_orders table
DESCRIBE custom_orders;

-- Check foreign key constraints for advance_payments
SELECT 
  TABLE_NAME, 
  COLUMN_NAME, 
  CONSTRAINT_NAME, 
  REFERENCED_TABLE_NAME, 
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE 
  TABLE_NAME = 'advance_payments' AND 
  REFERENCED_TABLE_NAME IS NOT NULL;

-- Check if there are any payments for these specific orders
SELECT 
  ap.payment_id,
  ap.order_id,
  ap.customer_name,
  ap.total_amount,
  ap.advance_amount,
  ap.balance_amount,
  ap.payment_status,
  ap.is_custom_order
FROM advance_payments ap
JOIN custom_orders co ON ap.order_id = co.order_id
WHERE co.customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- Check if there are any orphaned payments (payments without matching orders)
SELECT 
  ap.payment_id,
  ap.order_id,
  ap.customer_name,
  ap.total_amount,
  ap.advance_amount,
  ap.payment_status,
  ap.is_custom_order
FROM advance_payments ap
LEFT JOIN custom_orders co ON ap.order_id = co.order_id
WHERE 
  co.order_id IS NULL AND
  ap.customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');

-- Check if the is_custom_order flag is set correctly
SELECT 
  payment_id,
  customer_name,
  order_id,
  is_custom_order
FROM advance_payments
WHERE customer_name IN ('Udari Sanjana', 'NP Yapa', 'Sonali Ehansa');
