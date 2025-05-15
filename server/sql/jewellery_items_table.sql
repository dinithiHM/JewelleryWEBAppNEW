-- Create jewellery_items table
CREATE TABLE IF NOT EXISTS jewellery_items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  product_title VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  in_stock INT NOT NULL DEFAULT 0,
  buying_price DECIMAL(10, 2) NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  product_added DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- Add some sample data
INSERT INTO jewellery_items (product_title, category, in_stock, buying_price, selling_price, product_added) VALUES
('Cluster Earrings', 'Earrings', 48, 9000.00, 11000.00, '2024-11-01 17:41:09'),
('Indian Type Necklace', 'Necklace', 35, 11000.00, 12800.00, '2024-10-29 07:04:08'),
('Starakodi Chains', 'Chains', 45, 7400.00, 9000.00, NOW()),
('Gents Ring', 'Rings', 80, 3000.00, 4700.00, NOW());

-- Add indexes for better performance
CREATE INDEX idx_category ON jewellery_items(category);
CREATE INDEX idx_product_added ON jewellery_items(product_added);
