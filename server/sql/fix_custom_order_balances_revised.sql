-- Fix custom order balances (revised)
-- This script will update all custom orders to have the correct advance_amount
-- and let the database calculate the balance_amount automatically

-- First, show the current state of custom orders
SELECT 
  order_id,
  order_reference,
  customer_name,
  estimated_amount,
  advance_amount,
  balance_amount,
  payment_status
FROM 
  custom_orders
ORDER BY 
  order_date DESC;

-- Get the total advance payments for each order
SELECT 
  co.order_id,
  co.order_reference,
  co.customer_name,
  co.estimated_amount,
  co.advance_amount as current_advance,
  SUM(ap.advance_amount) as total_paid_from_payments
FROM 
  custom_orders co
LEFT JOIN 
  advance_payments ap ON co.order_id = ap.order_id AND ap.is_custom_order = 1
GROUP BY 
  co.order_id, co.order_reference, co.customer_name, co.estimated_amount, co.advance_amount;

-- Update the payment status based on the advance_amount vs estimated_amount
UPDATE custom_orders
SET payment_status = 
  CASE 
    WHEN advance_amount >= estimated_amount THEN 'Fully Paid'
    WHEN advance_amount > 0 THEN 'Partially Paid'
    ELSE 'Not Paid'
  END
WHERE 1=1;

-- Show the updated state of custom orders
SELECT 
  order_id,
  order_reference,
  customer_name,
  estimated_amount,
  advance_amount,
  balance_amount,
  payment_status
FROM 
  custom_orders
ORDER BY 
  order_date DESC;

-- Show a summary of payment statuses
SELECT 
  payment_status,
  COUNT(*) as count
FROM 
  custom_orders
GROUP BY 
  payment_status;
