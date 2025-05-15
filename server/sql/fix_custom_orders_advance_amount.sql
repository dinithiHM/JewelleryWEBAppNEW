-- Fix advance_amount in custom_orders table
-- This script will update the advance_amount in custom_orders to match the sum of payments in advance_payments

-- First, show the current state
SELECT 
    co.order_id,
    co.order_reference,
    co.customer_name,
    co.estimated_amount,
    co.advance_amount as current_advance,
    COALESCE(SUM(ap.advance_amount), 0) as total_payments,
    co.estimated_amount - COALESCE(SUM(ap.advance_amount), 0) as correct_balance,
    co.payment_status
FROM 
    custom_orders co
LEFT JOIN 
    advance_payments ap ON co.order_id = ap.order_id AND ap.is_custom_order = 1
GROUP BY 
    co.order_id, co.order_reference, co.customer_name, co.estimated_amount, co.advance_amount, co.payment_status
ORDER BY 
    co.order_date DESC;

-- Update the advance_amount in custom_orders to match the sum of payments
UPDATE custom_orders co
JOIN (
    SELECT 
        order_id,
        COALESCE(SUM(advance_amount), 0) as total_payments
    FROM 
        advance_payments
    WHERE 
        is_custom_order = 1
    GROUP BY 
        order_id
) ap ON co.order_id = ap.order_id
SET 
    co.advance_amount = ap.total_payments;

-- Update the payment status based on the advance_amount vs estimated_amount
UPDATE custom_orders
SET payment_status = 
  CASE 
    WHEN advance_amount >= estimated_amount THEN 'Fully Paid'
    WHEN advance_amount > 0 THEN 'Partially Paid'
    ELSE 'Not Paid'
  END;

-- Show the updated state
SELECT 
    co.order_id,
    co.order_reference,
    co.customer_name,
    co.estimated_amount,
    co.advance_amount,
    co.balance_amount,
    co.payment_status
FROM 
    custom_orders co
ORDER BY 
    co.order_date DESC;
