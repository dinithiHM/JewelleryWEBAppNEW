-- Add supplier_id column to custom_orders table if it doesn't exist
ALTER TABLE custom_orders
ADD COLUMN IF NOT EXISTS supplier_id VARCHAR(50) NULL AFTER category_id,
ADD FOREIGN KEY IF NOT EXISTS (supplier_id) REFERENCES suppliers(supplier_id);

-- Update the custom_order_details view to include supplier information
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
  s.supplier_name,
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
