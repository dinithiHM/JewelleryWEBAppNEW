-- 1. First, update the stored procedure to handle different JSON formats
DROP PROCEDURE IF EXISTS update_gold_stock_from_order;

DELIMITER //

CREATE PROCEDURE update_gold_stock_from_order(
    IN order_id_param INT
)
BEGIN
    DECLARE selected_karats_json JSON;
    DECLARE karat_values_json JSON;
    DECLARE offer_gold_val TINYINT;
    DECLARE karat_value DECIMAL(10,2);
    DECLARE karat_name VARCHAR(10);
    
    -- Get order details
    SELECT 
        offer_gold, 
        selected_karats, 
        karat_values
    INTO 
        offer_gold_val, 
        selected_karats_json, 
        karat_values_json
    FROM orders 
    WHERE order_id = order_id_param;
    
    -- Only proceed if gold is offered
    IF offer_gold_val = 1 THEN
        -- Process 24KT
        IF JSON_CONTAINS_PATH(karat_values_json, 'one', '$."24KT"') THEN
            SET karat_value = JSON_EXTRACT(karat_values_json, '$."24KT"');
            IF karat_value IS NOT NULL AND karat_value > 0 THEN
                UPDATE gold_stock 
                SET quantity_in_grams = quantity_in_grams - karat_value
                WHERE purity = '24KT';
            END IF;
        END IF;
        
        -- Process 22KT
        IF JSON_CONTAINS_PATH(karat_values_json, 'one', '$."22KT"') THEN
            SET karat_value = JSON_EXTRACT(karat_values_json, '$."22KT"');
            IF karat_value IS NOT NULL AND karat_value > 0 THEN
                UPDATE gold_stock 
                SET quantity_in_grams = quantity_in_grams - karat_value
                WHERE purity = '22KT';
            END IF;
        END IF;
        
        -- Process 21KT
        IF JSON_CONTAINS_PATH(karat_values_json, 'one', '$."21KT"') THEN
            SET karat_value = JSON_EXTRACT(karat_values_json, '$."21KT"');
            IF karat_value IS NOT NULL AND karat_value > 0 THEN
                UPDATE gold_stock 
                SET quantity_in_grams = quantity_in_grams - karat_value
                WHERE purity = '21KT';
            END IF;
        END IF;
        
        -- Process 18KT
        IF JSON_CONTAINS_PATH(karat_values_json, 'one', '$."18KT"') THEN
            SET karat_value = JSON_EXTRACT(karat_values_json, '$."18KT"');
            IF karat_value IS NOT NULL AND karat_value > 0 THEN
                UPDATE gold_stock 
                SET quantity_in_grams = quantity_in_grams - karat_value
                WHERE purity = '18KT';
            END IF;
        END IF;
        
        -- Process 16KT
        IF JSON_CONTAINS_PATH(karat_values_json, 'one', '$."16KT"') THEN
            SET karat_value = JSON_EXTRACT(karat_values_json, '$."16KT"');
            IF karat_value IS NOT NULL AND karat_value > 0 THEN
                UPDATE gold_stock 
                SET quantity_in_grams = quantity_in_grams - karat_value
                WHERE purity = '16KT';
            END IF;
        END IF;
    END IF;
END //

DELIMITER ;

-- 2. Create triggers to automatically call the procedure
DROP TRIGGER IF EXISTS after_order_insert;
DROP TRIGGER IF EXISTS after_order_update;

-- Create trigger for INSERT operations
DELIMITER //
CREATE TRIGGER after_order_insert
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.offer_gold = 1 THEN
        CALL update_gold_stock_from_order(NEW.order_id);
    END IF;
END //
DELIMITER ;

-- Create trigger for UPDATE operations
DELIMITER //
CREATE TRIGGER after_order_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF (NEW.offer_gold = 1 AND OLD.offer_gold = 0) OR
       (NEW.offer_gold = 1 AND (
           NEW.selected_karats != OLD.selected_karats OR
           NEW.karat_values != OLD.karat_values
       ))
    THEN
        CALL update_gold_stock_from_order(NEW.order_id);
    END IF;
END //
DELIMITER ;

-- 3. Test the procedure with an existing order
-- Replace 26 with your order ID
CALL update_gold_stock_from_order(26);
