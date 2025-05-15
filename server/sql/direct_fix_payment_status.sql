-- Direct fix for payment status in custom_orders table
-- This script directly updates the payment status for all orders with payments

-- First, update the advance_amount in custom_orders to match the total paid amount from advance_payments
UPDATE custom_orders co
SET advance_amount = (
  SELECT COALESCE(SUM(ap.advance_amount), 0)
  FROM advance_payments ap
  WHERE ap.order_id = co.order_id AND ap.is_custom_order = 1
)
WHERE EXISTS (
  SELECT 1 FROM advance_payments ap WHERE ap.order_id = co.order_id AND ap.is_custom_order = 1
);

-- Then update the payment status based on the updated advance_amount
UPDATE custom_orders
SET payment_status = 
  CASE 
    WHEN advance_amount >= estimated_amount THEN 'Fully Paid'
    WHEN advance_amount > 0 THEN 'Partially Paid'
    ELSE 'Not Paid'
  END;

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
ORDER BY order_id;
