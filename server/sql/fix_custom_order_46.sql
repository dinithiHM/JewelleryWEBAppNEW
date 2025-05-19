-- Fix the calculation for custom order 46
-- First, let's get the current values
SELECT 
    order_id,
    customer_name,
    estimated_amount,
    profit_percentage,
    quantity,
    advance_amount,
    (estimated_amount + (estimated_amount * (profit_percentage / 100))) * quantity AS correct_total_with_profit,
    advance_amount AS current_advance_amount,
    ((estimated_amount + (estimated_amount * (profit_percentage / 100))) * quantity) - advance_amount AS correct_balance
FROM 
    custom_orders
WHERE 
    order_id = 46;

-- Now update the advance_payments table with the correct total_amount and balance_amount
UPDATE advance_payments
SET 
    total_amount = (
        SELECT (estimated_amount + (estimated_amount * (profit_percentage / 100))) * quantity
        FROM custom_orders
        WHERE order_id = 46
    ),
    balance_amount = (
        SELECT ((estimated_amount + (estimated_amount * (profit_percentage / 100))) * quantity) - advance_amount
        FROM custom_orders
        WHERE order_id = 46
    )
WHERE 
    order_id = 46 
    AND is_custom_order = 1;

-- Verify the changes
SELECT 
    payment_id,
    payment_reference,
    customer_name,
    total_amount,
    advance_amount,
    balance_amount,
    payment_status
FROM 
    advance_payments
WHERE 
    order_id = 46 
    AND is_custom_order = 1;
