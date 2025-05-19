-- Update the query for fetching custom orders for advance payment
-- This script modifies the query to properly calculate total amount with quantity and profit

-- First, let's create a view to simplify the query
DROP VIEW IF EXISTS custom_order_details_with_price;

CREATE VIEW custom_order_details_with_price AS
SELECT 
    co.*,
    -- Calculate profit amount
    (co.estimated_amount / co.quantity) * (co.profit_percentage / 100) AS profit_per_unit,
    -- Calculate price per unit (estimated amount / quantity + profit)
    (co.estimated_amount / co.quantity) + ((co.estimated_amount / co.quantity) * (co.profit_percentage / 100)) AS price_per_unit,
    -- Calculate total amount (price per unit * quantity)
    ((co.estimated_amount / co.quantity) + ((co.estimated_amount / co.quantity) * (co.profit_percentage / 100))) * co.quantity AS total_amount_with_profit,
    -- Calculate balance with profit
    ((co.estimated_amount / co.quantity) + ((co.estimated_amount / co.quantity) * (co.profit_percentage / 100))) * co.quantity - co.advance_amount AS balance_with_profit
FROM 
    custom_orders co;

-- Test the view
SELECT * FROM custom_order_details_with_price LIMIT 5;
