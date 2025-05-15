-- Add a column to the orders table to track gold deduction
ALTER TABLE orders
ADD COLUMN gold_deducted TINYINT DEFAULT 0;

-- Drop the procedure if it exists
DROP PROCEDURE IF EXISTS update_gold_stock_from_order;

-- Create the procedure with deduction tracking using the orders table
DELIMITER //

CREATE PROCEDURE update_gold_stock_from_order(
    IN order_id_param INT
)
BEGIN
    DECLARE selected_karats_val TEXT;
    DECLARE karat_values_val TEXT;
    DECLARE offer_gold_val TINYINT;
    DECLARE gold_deducted_val TINYINT;
    
    -- Get order details including the gold_deducted flag
    SELECT 
        offer_gold, 
        CAST(selected_karats AS CHAR),
        CAST(karat_values AS CHAR),
        gold_deducted
    INTO 
        offer_gold_val, 
        selected_karats_val, 
        karat_values_val,
        gold_deducted_val
    FROM orders 
    WHERE order_id = order_id_param;
    
    -- Only proceed if gold is offered and hasn't been deducted yet
    IF offer_gold_val = 1 AND gold_deducted_val = 0 THEN
        -- Check if the text contains "22KT" and update gold stock accordingly
        IF selected_karats_val LIKE '%"22KT"%' THEN
            -- Extract the value using string operations
            SET @value_pos = LOCATE('"22KT"', karat_values_val);
            IF @value_pos > 0 THEN
                SET @colon_pos = LOCATE(':', karat_values_val, @value_pos);
                SET @comma_pos = LOCATE(',', karat_values_val, @colon_pos);
                IF @comma_pos = 0 THEN
                    SET @comma_pos = LOCATE('}', karat_values_val, @colon_pos);
                END IF;
                
                IF @colon_pos > 0 AND @comma_pos > 0 THEN
                    SET @value_str = TRIM(SUBSTRING(karat_values_val, @colon_pos + 1, @comma_pos - @colon_pos - 1));
                    SET @value = CAST(@value_str AS DECIMAL(10,2));
                    
                    IF @value > 0 THEN
                        UPDATE gold_stock 
                        SET quantity_in_grams = quantity_in_grams - @value
                        WHERE purity = '22KT';
                    END IF;
                END IF;
            END IF;
        END IF;
        
        -- Check if the text contains "24KT" and update gold stock accordingly
        IF selected_karats_val LIKE '%"24KT"%' THEN
            -- Extract the value using string operations
            SET @value_pos = LOCATE('"24KT"', karat_values_val);
            IF @value_pos > 0 THEN
                SET @colon_pos = LOCATE(':', karat_values_val, @value_pos);
                SET @comma_pos = LOCATE(',', karat_values_val, @colon_pos);
                IF @comma_pos = 0 THEN
                    SET @comma_pos = LOCATE('}', karat_values_val, @colon_pos);
                END IF;
                
                IF @colon_pos > 0 AND @comma_pos > 0 THEN
                    SET @value_str = TRIM(SUBSTRING(karat_values_val, @colon_pos + 1, @comma_pos - @colon_pos - 1));
                    SET @value = CAST(@value_str AS DECIMAL(10,2));
                    
                    IF @value > 0 THEN
                        UPDATE gold_stock 
                        SET quantity_in_grams = quantity_in_grams - @value
                        WHERE purity = '24KT';
                    END IF;
                END IF;
            END IF;
        END IF;
        
        -- Add similar blocks for 21KT, 18KT, and 16KT if needed
        
        -- Mark this order as having had its gold deducted
        UPDATE orders
        SET gold_deducted = 1
        WHERE order_id = order_id_param;
    END IF;
END //

DELIMITER ;

-- Update the triggers to use the improved procedure
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
    -- Only call the procedure if offer_gold changed from 0 to 1
    IF NEW.offer_gold = 1 AND OLD.offer_gold = 0 THEN
        CALL update_gold_stock_from_order(NEW.order_id);
    END IF;
END //
DELIMITER ;
