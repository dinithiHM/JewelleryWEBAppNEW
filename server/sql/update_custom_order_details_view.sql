-- Update the custom_order_details view to include proper quantity-based calculations
DROP VIEW IF EXISTS custom_order_details;

CREATE VIEW custom_order_details AS
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
  co.quantity,
  co.advance_amount,
  co.balance_amount,
  co.payment_status,
  co.order_status,
  co.category_id,
  co.supplier_id,
  co.description,
  co.special_requirements,
  co.supplier_notes,
  co.created_by,
  co.branch_id,
  co.pickup_date,
  co.pickup_notes,
  -- Calculate profit amount per unit
  CASE
    WHEN co.profit_percentage IS NULL OR co.profit_percentage = 0 THEN 0
    ELSE (co.estimated_amount / co.quantity) * (co.profit_percentage / 100)
  END AS profit_per_unit,
  -- Calculate price per unit (estimated amount / quantity + profit)
  CASE
    WHEN co.profit_percentage IS NULL OR co.profit_percentage = 0 THEN co.estimated_amount / NULLIF(co.quantity, 0)
    ELSE (co.estimated_amount / NULLIF(co.quantity, 0)) + ((co.estimated_amount / NULLIF(co.quantity, 0)) * (co.profit_percentage / 100))
  END AS price_per_unit,
  -- Calculate total amount with profit and quantity
  CASE
    WHEN co.profit_percentage IS NULL OR co.profit_percentage = 0 THEN co.estimated_amount
    ELSE ((co.estimated_amount / NULLIF(co.quantity, 0)) + ((co.estimated_amount / NULLIF(co.quantity, 0)) * (co.profit_percentage / 100))) * co.quantity
  END AS total_amount_with_profit,
  -- Calculate balance with profit and quantity
  CASE
    WHEN co.profit_percentage IS NULL OR co.profit_percentage = 0 THEN co.estimated_amount - co.advance_amount
    ELSE ((co.estimated_amount / NULLIF(co.quantity, 0)) + ((co.estimated_amount / NULLIF(co.quantity, 0)) * (co.profit_percentage / 100))) * co.quantity - co.advance_amount
  END AS balance_with_profit
FROM
  custom_orders co;

-- Test the view
SELECT
  order_id,
  order_reference,
  customer_name,
  estimated_amount,
  profit_percentage,
  quantity,
  profit_per_unit,
  price_per_unit,
  total_amount_with_profit,
  advance_amount,
  balance_with_profit
FROM
  custom_order_details
LIMIT 5;
