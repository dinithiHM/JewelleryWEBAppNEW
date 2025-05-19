-- Drop the existing view
DROP VIEW IF EXISTS custom_order_details;

-- Create the view with the correct calculation
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
    -- Calculate profit per unit (without dividing estimated_amount by quantity first)
    CASE
        WHEN co.profit_percentage IS NULL OR co.profit_percentage = 0 THEN 0
        ELSE co.estimated_amount * (co.profit_percentage / 100)
    END AS profit_per_unit,
    -- Calculate price per unit (estimated_amount + profit)
    CASE
        WHEN co.profit_percentage IS NULL OR co.profit_percentage = 0 THEN co.estimated_amount
        ELSE co.estimated_amount + (co.estimated_amount * (co.profit_percentage / 100))
    END AS price_per_unit,
    -- Calculate total amount with profit and quantity
    CASE
        WHEN co.profit_percentage IS NULL OR co.profit_percentage = 0 THEN co.estimated_amount * COALESCE(co.quantity, 1)
        ELSE (co.estimated_amount + (co.estimated_amount * (co.profit_percentage / 100))) * COALESCE(co.quantity, 1)
    END AS total_amount_with_profit,
    -- Calculate total payments (from both tables)
    (COALESCE((SELECT SUM(payment_amount) FROM custom_order_payments WHERE order_id = co.order_id), 0) +
     COALESCE((SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1), 0)) AS total_payments,

    -- Calculate balance with profit (allowing negative values)
    (CASE
        WHEN co.profit_percentage IS NULL OR co.profit_percentage = 0 THEN
            co.estimated_amount * COALESCE(co.quantity, 1)
        ELSE
            (co.estimated_amount + (co.estimated_amount * (co.profit_percentage / 100))) * COALESCE(co.quantity, 1)
    END) -
    (COALESCE((SELECT SUM(payment_amount) FROM custom_order_payments WHERE order_id = co.order_id), 0) +
     COALESCE((SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1), 0)) AS balance_with_profit
FROM
    custom_orders co;
