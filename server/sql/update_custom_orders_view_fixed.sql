-- Update the custom_order_details view to include profit_percentage and total_amount
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
  co.profit_percentage,
  co.advance_amount,
  co.balance_amount,
  -- Calculate total amount with profit - use actual profit_percentage without default
  CASE
    WHEN co.profit_percentage IS NULL THEN co.estimated_amount
    ELSE co.estimated_amount * (1 + (co.profit_percentage / 100))
  END AS total_amount_with_profit,
  -- Calculate balance with profit - use actual profit_percentage without default
  CASE
    WHEN co.profit_percentage IS NULL THEN co.estimated_amount - co.advance_amount
    ELSE (co.estimated_amount * (1 + (co.profit_percentage / 100))) - co.advance_amount
  END AS balance_with_profit,
  co.order_status,
  co.payment_status,
  co.category_id,
  c.category_name,
  co.supplier_id,
  s.name AS supplier_name,
  co.description,
  co.special_requirements,
  co.created_by AS created_by_id,
  u.first_name AS created_by_first_name,
  u.last_name AS created_by_last_name,
  co.branch_id,
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
  categories c ON co.category_id = c.category_id
LEFT JOIN
  suppliers s ON co.supplier_id = s.supplier_id;
