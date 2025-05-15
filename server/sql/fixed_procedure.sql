-- Drop the procedure if it exists
DROP PROCEDURE IF EXISTS update_gold_stock_from_order;

-- Create the procedure with improved JSON handling
DELIMITER //

CREATE PROCEDURE update_gold_stock_from_order(
    IN order_id_param INT
)
BEGIN
    DECLARE selected_karats_val JSON;
    DECLARE karat_values_val JSON;
    DECLARE offer_gold_val TINYINT;
    DECLARE i INT DEFAULT 0;
    DECLARE karat_name VARCHAR(10);
    DECLARE karat_value DECIMAL(10,2);
    
    -- Get order details
    SELECT 
        offer_gold, 
        selected_karats, 
        karat_values
    INTO 
        offer_gold_val, 
        selected_karats_val, 
        karat_values_val
    FROM orders 
    WHERE order_id = order_id_param;
    
    -- Only proceed if gold is offered
    IF offer_gold_val = 1 THEN
        -- Check if selected_karats is an array
        IF JSON_TYPE(selected_karats_val) = 'ARRAY' THEN
            -- Loop through the array
            WHILE i < JSON_LENGTH(selected_karats_val) DO
                -- Extract the karat name (e.g., "22KT")
                SET karat_name = JSON_UNQUOTE(JSON_EXTRACT(selected_karats_val, CONCAT('$[', i, ']')));
                
                -- Extract the corresponding value from karat_values
                -- We need to handle the quotes in the JSON path
                SET karat_value = JSON_EXTRACT(karat_values_val, CONCAT('$.', JSON_UNQUOTE(JSON_EXTRACT(selected_karats_val, CONCAT('$[', i, ']')))));
                
                -- Update gold_stock if we have a valid value
                IF karat_value IS NOT NULL AND karat_value > 0 THEN
                    UPDATE gold_stock 
                    SET quantity_in_grams = quantity_in_grams - karat_value
                    WHERE purity = karat_name;
                END IF;
                
                SET i = i + 1;
            END WHILE;
        END IF;
    END IF;
END //

DELIMITER ;

-- Test the procedure with an existing order
-- Replace 26 with your order ID
CALL update_gold_stock_from_order(26);
