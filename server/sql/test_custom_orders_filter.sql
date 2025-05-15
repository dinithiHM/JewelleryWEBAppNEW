-- Test the custom orders filter for advance payments
-- This script will show which orders would be displayed in the dropdown

-- First, show all custom orders with their payment status
SELECT 
  order_id,
  order_reference,
  customer_name,
  estimated_amount,
  advance_amount,
  payment_status,
  order_status
FROM 
  custom_orders
ORDER BY 
  order_date DESC;

-- Now, show only the orders that would appear in the dropdown
-- (matching the filter in advancePaymentRoutes.js)
SELECT
  co.order_id,
  co.order_reference,
  co.customer_name,
  co.estimated_amount,
  co.advance_amount,
  co.payment_status,
  co.order_status
FROM
  custom_orders co
WHERE
  co.order_status IN ('Pending', 'In Progress')
  AND (co.payment_status IS NULL OR co.payment_status != 'Fully Paid')
ORDER BY
  co.order_date DESC;

-- Count how many orders would be displayed vs. total orders
SELECT 
  COUNT(*) as total_orders,
  SUM(CASE WHEN order_status IN ('Pending', 'In Progress') 
           AND (payment_status IS NULL OR payment_status != 'Fully Paid')
           THEN 1 ELSE 0 END) as displayed_orders,
  SUM(CASE WHEN payment_status = 'Fully Paid' THEN 1 ELSE 0 END) as fully_paid_orders
FROM 
  custom_orders;
