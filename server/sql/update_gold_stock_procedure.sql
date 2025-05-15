-- Drop the procedure if it exists
DROP PROCEDURE IF EXISTS update_gold_stock_from_order;

-- Create the procedure with improved JSON handling
DELIMITER //

CREATE PROCEDURE update_gold_stock_from_order(
    IN order_id_param INT
)
BEGIN
    DECLARE selected_karats_json JSON;
    DECLARE karat_values_json JSON;
    DECLARE offer_gold_val TINYINT;
    DECLARE debug_info TEXT;
    
    -- Get order details
    SELECT 
        offer_gold, 
        selected_karats, 
        karat_values,
        CONCAT('Order ID: ', order_id_param, ', Offer Gold: ', offer_gold, ', Selected Karats: ', selected_karats, ', Karat Values: ', karat_values) AS debug
    INTO 
        offer_gold_val, 
        selected_karats_json, 
        karat_values_json,
        debug_info
    FROM orders 
    WHERE order_id = order_id_param;
    
    -- Log debug info
    INSERT INTO debug_logs (message) VALUES (debug_info);
    
    -- Only proceed if gold is offered
    IF offer_gold_val = 1 THEN
        -- Try to parse the JSON if it's not already valid
        IF selected_karats_json IS NULL OR selected_karats_json = '' THEN
            SET selected_karats_json = '{}';
        END IF;
        
        IF karat_values_json IS NULL OR karat_values_json = '' THEN
            SET karat_values_json = '{}';
        END IF;
        
        -- Log the parsed JSON
        INSERT INTO debug_logs (message) VALUES (CONCAT('Parsed JSON - Selected Karats: ', selected_karats_json, ', Karat Values: ', karat_values_json));
        
        -- Process each karat
        -- 24KT
        IF JSON_CONTAINS_PATH(selected_karats_json, 'one', '$."24KT"') AND JSON_EXTRACT(selected_karats_json, '$."24KT"') = true THEN
            UPDATE gold_stock 
            SET quantity_in_grams = quantity_in_grams - JSON_EXTRACT(karat_values_json, '$."24KT"')
            WHERE purity = '24KT';
            
            INSERT INTO debug_logs (message) VALUES (CONCAT('Updated 24KT gold stock by ', JSON_EXTRACT(karat_values_json, '$."24KT"'), ' grams'));
        END IF;
        
        -- 22KT
        IF JSON_CONTAINS_PATH(selected_karats_json, 'one', '$."22KT"') AND JSON_EXTRACT(selected_karats_json, '$."22KT"') = true THEN
            UPDATE gold_stock 
            SET quantity_in_grams = quantity_in_grams - JSON_EXTRACT(karat_values_json, '$."22KT"')
            WHERE purity = '22KT';
            
            INSERT INTO debug_logs (message) VALUES (CONCAT('Updated 22KT gold stock by ', JSON_EXTRACT(karat_values_json, '$."22KT"'), ' grams'));
        END IF;
        
        -- 21KT
        IF JSON_CONTAINS_PATH(selected_karats_json, 'one', '$."21KT"') AND JSON_EXTRACT(selected_karats_json, '$."21KT"') = true THEN
            UPDATE gold_stock 
            SET quantity_in_grams = quantity_in_grams - JSON_EXTRACT(karat_values_json, '$."21KT"')
            WHERE purity = '21KT';
            
            INSERT INTO debug_logs (message) VALUES (CONCAT('Updated 21KT gold stock by ', JSON_EXTRACT(karat_values_json, '$."21KT"'), ' grams'));
        END IF;
        
        -- 18KT
        IF JSON_CONTAINS_PATH(selected_karats_json, 'one', '$."18KT"') AND JSON_EXTRACT(selected_karats_json, '$."18KT"') = true THEN
            UPDATE gold_stock 
            SET quantity_in_grams = quantity_in_grams - JSON_EXTRACT(karat_values_json, '$."18KT"')
            WHERE purity = '18KT';
            
            INSERT INTO debug_logs (message) VALUES (CONCAT('Updated 18KT gold stock by ', JSON_EXTRACT(karat_values_json, '$."18KT"'), ' grams'));
        END IF;
        
        -- 16KT
        IF JSON_CONTAINS_PATH(selected_karats_json, 'one', '$."16KT"') AND JSON_EXTRACT(selected_karats_json, '$."16KT"') = true THEN
            UPDATE gold_stock 
            SET quantity_in_grams = quantity_in_grams - JSON_EXTRACT(karat_values_json, '$."16KT"')
            WHERE purity = '16KT';
            
            INSERT INTO debug_logs (message) VALUES (CONCAT('Updated 16KT gold stock by ', JSON_EXTRACT(karat_values_json, '$."16KT"'), ' grams'));
        END IF;
    END IF;
END //

DELIMITER ;

-- Create debug_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS debug_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
