-- Check advance payments for a specific order
-- Replace 18 with your actual order ID

-- Check the custom order details
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
WHERE 
  order_id = 18;

-- Check all advance payments for this order
SELECT 
  payment_id,
  payment_reference,
  customer_name,
  total_amount,
  advance_amount,
  balance_amount,
  payment_status,
  payment_date,
  is_custom_order,
  order_id
FROM 
  advance_payments
WHERE 
  order_id = 18
ORDER BY 
  payment_date;

-- Calculate the total advance payments
SELECT 
  SUM(advance_amount) as total_advance_payments
FROM 
  advance_payments
WHERE 
  order_id = 18
  AND is_custom_order = 1;

-- Compare with the advance_amount in custom_orders
SELECT 
  co.order_id,
  co.order_reference,
  co.estimated_amount,
  co.advance_amount as custom_order_advance,
  SUM(ap.advance_amount) as total_advance_payments,
  co.advance_amount - SUM(ap.advance_amount) as difference
FROM 
  custom_orders co
JOIN 
  advance_payments ap ON co.order_id = ap.order_id AND ap.is_custom_order = 1
WHERE 
  co.order_id = 18
GROUP BY 
  co.order_id, co.order_reference, co.estimated_amount, co.advance_amount;
