-- First, let's check the current gold stock
SELECT * FROM gold_stock;

-- Now, let's check the order details
SELECT order_id, offer_gold, selected_karats, karat_values 
FROM orders 
WHERE order_id = 26;  -- Replace with your order ID

-- Call the procedure manually
CALL update_gold_stock_from_order(26);  -- Replace with your order ID

-- Check if the gold stock was updated
SELECT * FROM gold_stock;
