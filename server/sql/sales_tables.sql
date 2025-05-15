-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  sale_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- Create sale_items table for individual items in a sale
CREATE TABLE IF NOT EXISTS sale_items (
  sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  item_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES jewellery_items(item_id) ON DELETE RESTRICT
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  invoice_number VARCHAR(20) NOT NULL,
  invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_item_id ON sale_items(item_id);
CREATE INDEX idx_invoices_sale_id ON invoices(sale_id);

-- Add sample data
INSERT INTO sales (customer_name, total_amount, payment_method, sale_date) VALUES
('John Smith', 22000.00, 'Cash', '2024-11-01 14:30:00'),
('Mary Johnson', 9000.00, 'Credit Card', '2024-11-02 10:15:00'),
('Robert Brown', 4700.00, 'Debit Card', '2024-11-03 16:45:00');

-- Add sample sale items (assuming jewellery_items table has the items with these IDs)
-- You may need to adjust the item_id values to match your actual data
INSERT INTO sale_items (sale_id, item_id, quantity, unit_price, subtotal) VALUES
(1, 1, 2, 11000.00, 22000.00), -- 2 Cluster Earrings
(2, 3, 1, 9000.00, 9000.00),   -- 1 Starakodi Chain
(3, 4, 1, 4700.00, 4700.00);   -- 1 Gents Ring

-- Add sample invoices
INSERT INTO invoices (sale_id, invoice_number, invoice_date) VALUES
(1, 'INV-2024-001', '2024-11-01 14:35:00'),
(2, 'INV-2024-002', '2024-11-02 10:20:00'),
(3, 'INV-2024-003', '2024-11-03 16:50:00');
