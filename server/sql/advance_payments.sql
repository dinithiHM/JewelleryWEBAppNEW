-- Create advance_payments table
CREATE TABLE IF NOT EXISTS advance_payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  payment_reference VARCHAR(20) NOT NULL UNIQUE, -- Format: ADV-YYYY-XXXX
  customer_name VARCHAR(100) NOT NULL,
  payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(10, 2) NOT NULL,
  advance_amount DECIMAL(10, 2) NOT NULL,
  balance_amount DECIMAL(10, 2) NOT NULL,
  payment_status ENUM('Pending', 'Partially Paid', 'Completed') DEFAULT 'Partially Paid',
  payment_method VARCHAR(50) DEFAULT 'Cash',
  notes TEXT,
  created_by INT,
  branch_id INT,
  
  -- For custom orders
  is_custom_order BOOLEAN DEFAULT FALSE,
  order_id INT,
  
  -- For inventory items
  item_id INT,
  item_quantity INT,
  
  FOREIGN KEY (created_by) REFERENCES users(user_id),
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  FOREIGN KEY (item_id) REFERENCES jewellery_items(item_id)
);

-- Create a view to get advance payment details with related information
CREATE OR REPLACE VIEW advance_payment_details AS
SELECT 
  ap.payment_id,
  ap.payment_reference,
  ap.customer_name,
  ap.payment_date,
  ap.total_amount,
  ap.advance_amount,
  ap.balance_amount,
  ap.payment_status,
  ap.payment_method,
  ap.notes,
  u.first_name AS created_by_first_name,
  u.last_name AS created_by_last_name,
  b.branch_name,
  ap.is_custom_order,
  o.order_reference AS order_reference,
  ji.product_title AS item_name,
  ji.category AS item_category,
  ap.item_quantity
FROM 
  advance_payments ap
LEFT JOIN 
  users u ON ap.created_by = u.user_id
LEFT JOIN 
  branches b ON ap.branch_id = b.branch_id
LEFT JOIN 
  orders o ON ap.order_id = o.order_id
LEFT JOIN 
  jewellery_items ji ON ap.item_id = ji.item_id;
