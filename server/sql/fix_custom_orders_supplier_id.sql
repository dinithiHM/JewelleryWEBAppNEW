-- Fix the supplier_id column in the custom_orders table
-- First, drop the foreign key constraint if it exists
SET @constraint_name = (
    SELECT CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_NAME = 'custom_orders' 
    AND COLUMN_NAME = 'supplier_id' 
    AND REFERENCED_TABLE_NAME = 'suppliers'
    AND CONSTRAINT_SCHEMA = DATABASE()
);

SET @drop_fk_sql = IF(@constraint_name IS NOT NULL, 
                      CONCAT('ALTER TABLE custom_orders DROP FOREIGN KEY ', @constraint_name), 
                      'SELECT 1');
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Now modify the column to be INT instead of VARCHAR
ALTER TABLE custom_orders 
MODIFY COLUMN supplier_id INT NULL;

-- Re-add the foreign key constraint
ALTER TABLE custom_orders
ADD CONSTRAINT fk_custom_orders_supplier_id
FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id);

-- Update the custom_order_details view to ensure it's using the correct column types
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
  co.category_id,
  co.supplier_id,
  s.name AS supplier_name,
  co.description,
  co.special_requirements,
  u.first_name AS created_by_first_name,
  u.last_name AS created_by_last_name,
  co.created_by,
  b.branch_name,
  co.branch_id,
  (SELECT GROUP_CONCAT(image_path SEPARATOR ',') FROM custom_order_images WHERE order_id = co.order_id) AS images,
  (SELECT COUNT(*) FROM custom_order_payments WHERE order_id = co.order_id) AS payment_count
FROM 
  custom_orders co
LEFT JOIN 
  categories c ON co.category_id = c.category_id
LEFT JOIN 
  suppliers s ON co.supplier_id = s.supplier_id
LEFT JOIN 
  users u ON co.created_by = u.user_id
LEFT JOIN 
  branches b ON co.branch_id = b.branch_id;
