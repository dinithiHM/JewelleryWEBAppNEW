-- Create debug_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS debug_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Log the start of the fix
INSERT INTO debug_logs (message) VALUES ('Starting to fix existing orders JSON data');

-- Fix orders with invalid JSON data
UPDATE orders 
SET 
    selected_karats = '{"24KT": true}',
    karat_values = '{"24KT": 50}'
WHERE 
    offer_gold = 1 
    AND (selected_karats IS NULL OR selected_karats = '' OR selected_karats = '[object Object]');

-- Log the completion
INSERT INTO debug_logs (message) VALUES ('Fixed existing orders JSON data');

-- Show the updated orders
SELECT order_id, offer_gold, selected_karats, karat_values 
FROM orders 
WHERE offer_gold = 1 
LIMIT 10;
