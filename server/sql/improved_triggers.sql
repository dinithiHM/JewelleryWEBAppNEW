-- Drop existing triggers if they exist
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
    -- We don't need to check for changes in selected_karats or karat_values
    -- because the procedure now tracks which orders have been processed
    IF NEW.offer_gold = 1 AND OLD.offer_gold = 0 THEN
        CALL update_gold_stock_from_order(NEW.order_id);
    END IF;
END //
DELIMITER ;
