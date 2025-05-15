-- Create custom_orders table
CREATE TABLE IF NOT EXISTS custom_orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  order_reference VARCHAR(20) NOT NULL UNIQUE, -- Format: CUST-YYYY-XXXX
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20),
  customer_email VARCHAR(100),
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  estimated_completion_date DATE,
  estimated_amount DECIMAL(10, 2) NOT NULL,
  advance_amount DECIMAL(10, 2) DEFAULT 0,
  balance_amount DECIMAL(10, 2) GENERATED ALWAYS AS (estimated_amount - advance_amount) STORED,
  order_status ENUM('Pending', 'In Progress', 'Completed', 'Delivered', 'Cancelled') DEFAULT 'Pending',
  payment_status ENUM('Not Paid', 'Partially Paid', 'Fully Paid') DEFAULT 'Not Paid',
  category_id INT,
  description TEXT,
  special_requirements TEXT,
  created_by INT,
  branch_id INT,
  
  FOREIGN KEY (created_by) REFERENCES users(user_id),
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Create custom_order_images table for storing multiple images per order
CREATE TABLE IF NOT EXISTS custom_order_images (
  image_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  image_type ENUM('Reference', 'Design', 'Progress', 'Final') DEFAULT 'Reference',
  upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES custom_orders(order_id) ON DELETE CASCADE
);

-- Create custom_order_materials table for tracking materials used
CREATE TABLE IF NOT EXISTS custom_order_materials (
  material_entry_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  material_name VARCHAR(100) NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL,
  unit VARCHAR(20) DEFAULT 'g', -- grams, carats, pieces, etc.
  cost_per_unit DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  supplier_id INT,
  
  FOREIGN KEY (order_id) REFERENCES custom_orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

-- Create custom_order_payments table for tracking multiple payments
CREATE TABLE IF NOT EXISTS custom_order_payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  payment_amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'Cash',
  payment_reference VARCHAR(100),
  notes TEXT,
  
  FOREIGN KEY (order_id) REFERENCES custom_orders(order_id) ON DELETE CASCADE
);

-- Create a view to get custom order details with related information
CREATE OR REPLACE VIEW custom_order_details AS
SELECT 
  co.order_id,
  co.order_reference,
  co.customer_name,
  co.customer_phone,
  co.customer_email,
  co.order_date,
  co.estimated_completion_date,
  co.estimated_amount,
  co.advance_amount,
  co.balance_amount,
  co.order_status,
  co.payment_status,
  c.category_name,
  co.description,
  co.special_requirements,
  u.first_name AS created_by_first_name,
  u.last_name AS created_by_last_name,
  b.branch_name,
  (SELECT GROUP_CONCAT(image_path SEPARATOR ',') FROM custom_order_images WHERE order_id = co.order_id) AS images,
  (SELECT COUNT(*) FROM custom_order_payments WHERE order_id = co.order_id) AS payment_count,
  (SELECT SUM(payment_amount) FROM custom_order_payments WHERE order_id = co.order_id) AS total_paid
FROM 
  custom_orders co
LEFT JOIN 
  users u ON co.created_by = u.user_id
LEFT JOIN 
  branches b ON co.branch_id = b.branch_id
LEFT JOIN
  categories c ON co.category_id = c.category_id;
