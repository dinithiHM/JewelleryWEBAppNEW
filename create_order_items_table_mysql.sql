-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  offer_gold TINYINT(1) DEFAULT 0,
  selected_karats JSON,
  karat_values JSON,
  design_image LONGTEXT,
  status VARCHAR(50) DEFAULT 'pending',
  gold_price_per_gram DECIMAL(10,2) DEFAULT NULL,
  weight_in_grams DECIMAL(10,2) DEFAULT NULL,
  making_charges DECIMAL(10,2) DEFAULT NULL,
  additional_materials_charges DECIMAL(10,2) DEFAULT NULL,
  base_estimated_price DECIMAL(10,2) DEFAULT NULL,
  estimated_price DECIMAL(10,2) DEFAULT NULL,
  total_amount DECIMAL(10,2) DEFAULT NULL,
  selectedKarat VARCHAR(10) DEFAULT NULL,
  goldPurity DECIMAL(5,4) DEFAULT NULL,
  offered_gold_value DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(status);

-- Sample query to get orders with their items
SELECT 
  o.*,
  COUNT(oi.order_item_id) as item_count
FROM 
  orders o
LEFT JOIN 
  order_items oi ON o.order_id = oi.order_id
GROUP BY 
  o.order_id;

-- Sample query to get a specific order with its items
SELECT 
  o.*,
  oi.*
FROM 
  orders o
LEFT JOIN 
  order_items oi ON o.order_id = oi.order_id
WHERE 
  o.order_id = 1; -- Replace 1 with the actual order ID
