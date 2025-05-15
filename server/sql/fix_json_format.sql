-- Check the format of JSON data in orders table
SELECT 
    order_id, 
    offer_gold,
    selected_karats,
    JSON_TYPE(selected_karats) AS selected_karats_type,
    karat_values,
    JSON_TYPE(karat_values) AS karat_values_type
FROM 
    orders
WHERE 
    offer_gold = 1;

-- Fix any string representations of JSON
UPDATE orders
SET 
    selected_karats = JSON_ARRAY('22KT'),
    karat_values = JSON_OBJECT('22KT', 100)
WHERE 
    order_id = 27  -- Replace with your order ID
    AND offer_gold = 1
    AND (
        JSON_VALID(selected_karats) = 0 OR 
        JSON_VALID(karat_values) = 0 OR
        selected_karats = '["22KT"]' OR  -- String representation of JSON
        karat_values = '{"22KT": 100}'   -- String representation of JSON
    );
