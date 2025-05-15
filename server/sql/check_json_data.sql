-- Check the actual JSON data for order_id 26
SELECT 
    order_id,
    offer_gold,
    selected_karats,
    CAST(selected_karats AS CHAR) AS selected_karats_text,
    JSON_TYPE(selected_karats) AS selected_karats_type,
    karat_values,
    CAST(karat_values AS CHAR) AS karat_values_text,
    JSON_TYPE(karat_values) AS karat_values_type
FROM 
    orders
WHERE 
    order_id = 26;
