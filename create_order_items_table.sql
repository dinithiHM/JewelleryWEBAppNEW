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

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(status);
