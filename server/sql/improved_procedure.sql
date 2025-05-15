-- Create a table to track gold stock deductions
CREATE TABLE IF NOT EXISTS gold_stock_deductions (
    order_id INT PRIMARY KEY,
    deduction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- Drop the procedure if it exists
DROP PROCEDURE IF EXISTS update_gold_stock_from_order;

-- Create the procedure with deduction tracking
DELIMITER //

CREATE PROCEDURE update_gold_stock_from_order(
    IN order_id_param INT
)
BEGIN
    DECLARE selected_karats_val TEXT;
    DECLARE karat_values_val TEXT;
    DECLARE offer_gold_val TINYINT;
    DECLARE already_deducted INT;
    
    -- Check if this order has already had gold deducted
    SELECT COUNT(*) INTO already_deducted
    FROM gold_stock_deductions
    WHERE order_id = order_id_param;
    
    -- Only proceed if gold hasn't been deducted yet
    IF already_deducted = 0 THEN
        -- Get order details as text to avoid JSON parsing issues
        SELECT 
            offer_gold, 
            CAST(selected_karats AS CHAR),
            CAST(karat_values AS CHAR)
        INTO 
            offer_gold_val, 
            selected_karats_val, 
            karat_values_val
        FROM orders 
        WHERE order_id = order_id_param;
        
        -- Only proceed if gold is offered
        IF offer_gold_val = 1 THEN
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
            
            -- Record that we've deducted gold for this order
            INSERT INTO gold_stock_deductions (order_id) VALUES (order_id_param);
        END IF;
    END IF;
END //

DELIMITER ;

-- Test the procedure with an existing order
CALL update_gold_stock_from_order(26);
