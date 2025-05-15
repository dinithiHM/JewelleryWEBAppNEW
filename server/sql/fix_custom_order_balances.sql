-- Fix custom order balances
-- This script will update all custom orders to have the correct balance amount
-- based on the estimated_amount and advance_amount

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

-- Update the balance_amount for all custom orders
UPDATE custom_orders
SET balance_amount = (estimated_amount - advance_amount)
WHERE 1=1;

-- Update the payment status based on the balance amount
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
