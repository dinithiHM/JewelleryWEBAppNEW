-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  supplier_id VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  offer_gold BOOLEAN DEFAULT FALSE,
  selected_karats JSON,
  karat_values JSON,
  design_image LONGTEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_supplier_id ON orders(supplier_id);
CREATE INDEX idx_status ON orders(status);
CREATE INDEX idx_created_at ON orders(created_at);
