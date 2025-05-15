-- Create gold_stock table
CREATE TABLE IF NOT EXISTS `gold_stock` (
  `stock_id` INT AUTO_INCREMENT PRIMARY KEY,
  `purity` VARCHAR(10) NOT NULL COMMENT 'Gold purity (e.g., 24KT, 22KT)',
  `quantity_in_grams` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Available quantity in grams',
  `price_per_gram` DECIMAL(10,2) NOT NULL COMMENT 'Current price per gram',
  `last_updated` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` INT,
  `description` VARCHAR(255),
  `status` VARCHAR(20) DEFAULT 'active' COMMENT 'active, inactive',
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert initial data for gold stock
INSERT INTO `gold_stock` (`purity`, `quantity_in_grams`, `price_per_gram`, `branch_id`, `description`) VALUES
('24KT', 100.00, 0.00, 1, '24 Karat Gold (99.9% pure)'),
('22KT', 150.00, 0.00, 1, '22 Karat Gold (91.6% pure)'),
('21KT', 200.00, 0.00, 1, '21 Karat Gold (87.5% pure)'),
('18KT', 250.00, 0.00, 1, '18 Karat Gold (75.0% pure)'),
('16KT', 300.00, 0.00, 1, '16 Karat Gold (66.6% pure)');

-- Create a trigger to update gold prices from gold_prices table
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_gold_stock_prices
AFTER INSERT ON gold_prices
FOR EACH ROW
BEGIN
    -- Update 24KT price directly
    UPDATE gold_stock SET price_per_gram = NEW.price_per_gram WHERE purity = '24KT';
    
    -- Update other purities based on their percentage of 24KT
    UPDATE gold_stock SET price_per_gram = NEW.price_per_gram * 0.916 WHERE purity = '22KT';
    UPDATE gold_stock SET price_per_gram = NEW.price_per_gram * 0.875 WHERE purity = '21KT';
    UPDATE gold_stock SET price_per_gram = NEW.price_per_gram * 0.750 WHERE purity = '18KT';
    UPDATE gold_stock SET price_per_gram = NEW.price_per_gram * 0.666 WHERE purity = '16KT';
END //
DELIMITER ;

-- Create a procedure to update gold stock when an order is placed
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS update_gold_stock_from_order(
    IN order_id_param INT
)
BEGIN
    DECLARE selected_karats_json JSON;
    DECLARE karat_values_json JSON;
    DECLARE offer_gold_val TINYINT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE current_karat VARCHAR(10);
    DECLARE current_quantity DECIMAL(10,2);
    
    -- Get order details
    SELECT offer_gold, selected_karats, karat_values 
    INTO offer_gold_val, selected_karats_json, karat_values_json
    FROM orders 
    WHERE order_id = order_id_param;
    
    -- Only proceed if gold is offered
    IF offer_gold_val = 1 THEN
        -- Process each karat in the selected_karats JSON array
        IF JSON_CONTAINS_PATH(selected_karats_json, 'one', '$."24KT"') AND JSON_EXTRACT(selected_karats_json, '$."24KT"') = true THEN
            UPDATE gold_stock 
            SET quantity_in_grams = quantity_in_grams - JSON_EXTRACT(karat_values_json, '$."24KT"')
            WHERE purity = '24KT';
        END IF;
        
        IF JSON_CONTAINS_PATH(selected_karats_json, 'one', '$."22KT"') AND JSON_EXTRACT(selected_karats_json, '$."22KT"') = true THEN
            UPDATE gold_stock 
            SET quantity_in_grams = quantity_in_grams - JSON_EXTRACT(karat_values_json, '$."22KT"')
            WHERE purity = '22KT';
        END IF;
        
        IF JSON_CONTAINS_PATH(selected_karats_json, 'one', '$."21KT"') AND JSON_EXTRACT(selected_karats_json, '$."21KT"') = true THEN
            UPDATE gold_stock 
            SET quantity_in_grams = quantity_in_grams - JSON_EXTRACT(karat_values_json, '$."21KT"')
            WHERE purity = '21KT';
        END IF;
        
        IF JSON_CONTAINS_PATH(selected_karats_json, 'one', '$."18KT"') AND JSON_EXTRACT(selected_karats_json, '$."18KT"') = true THEN
            UPDATE gold_stock 
            SET quantity_in_grams = quantity_in_grams - JSON_EXTRACT(karat_values_json, '$."18KT"')
            WHERE purity = '18KT';
        END IF;
        
        IF JSON_CONTAINS_PATH(selected_karats_json, 'one', '$."16KT"') AND JSON_EXTRACT(selected_karats_json, '$."16KT"') = true THEN
            UPDATE gold_stock 
            SET quantity_in_grams = quantity_in_grams - JSON_EXTRACT(karat_values_json, '$."16KT"')
            WHERE purity = '16KT';
        END IF;
    END IF;
END //
DELIMITER ;
