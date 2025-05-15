-- Drop the existing foreign key constraint
ALTER TABLE advance_payments
DROP FOREIGN KEY advance_payments_ibfk_3;

-- Add the new foreign key constraint referencing custom_orders
ALTER TABLE advance_payments
ADD CONSTRAINT advance_payments_custom_order_fk
FOREIGN KEY (custom_order_id) REFERENCES custom_orders(order_id);

-- Rename the column for clarity (optional)
-- ALTER TABLE advance_payments
-- CHANGE COLUMN order_id custom_order_id INT;
