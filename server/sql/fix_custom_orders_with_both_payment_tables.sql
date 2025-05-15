-- Fix advance_amount in custom_orders table
-- This script will update the advance_amount in custom_orders to include both payment tables

-- First, show the current state
SELECT 
    co.order_id,
    co.order_reference,
    co.customer_name,
    co.estimated_amount,
    co.advance_amount as current_advance,
    COALESCE(SUM(ap.advance_amount), 0) as advance_payments_total,
    COALESCE((SELECT SUM(payment_amount) FROM custom_order_payments WHERE order_id = co.order_id), 0) as custom_payments_total,
    (
        COALESCE(SUM(ap.advance_amount), 0) + 
        COALESCE((SELECT SUM(payment_amount) FROM custom_order_payments WHERE order_id = co.order_id), 0)
    ) as total_payments,
    co.estimated_amount - (
        COALESCE(SUM(ap.advance_amount), 0) + 
        COALESCE((SELECT SUM(payment_amount) FROM custom_order_payments WHERE order_id = co.order_id), 0)
    ) as correct_balance,
    co.payment_status
FROM 
    custom_orders co
LEFT JOIN 
    advance_payments ap ON co.order_id = ap.order_id AND ap.is_custom_order = 1
GROUP BY 
    co.order_id, co.order_reference, co.customer_name, co.estimated_amount, co.advance_amount, co.payment_status
ORDER BY 
    co.order_date DESC;

-- Update the advance_amount in custom_orders to include both payment tables
UPDATE custom_orders co
SET co.advance_amount = (
    SELECT 
        COALESCE(SUM(ap.advance_amount), 0) + 
        COALESCE((SELECT SUM(payment_amount) FROM custom_order_payments WHERE order_id = co.order_id), 0)
    FROM 
        advance_payments ap
    WHERE 
        ap.order_id = co.order_id AND ap.is_custom_order = 1
    GROUP BY 
        ap.order_id
);

-- For orders with no advance_payments entries, update from custom_order_payments
UPDATE custom_orders co
SET co.advance_amount = (
    SELECT COALESCE(SUM(payment_amount), 0)
    FROM custom_order_payments
    WHERE order_id = co.order_id
)
WHERE co.advance_amount = 0 OR co.advance_amount IS NULL;

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
