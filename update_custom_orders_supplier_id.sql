-- SQL script to update the custom_orders table to ensure supplier_id is properly stored

-- First, check if there are any foreign key constraints on supplier_id
SELECT 
    CONSTRAINT_NAME, 
    TABLE_NAME, 
    COLUMN_NAME, 
    REFERENCED_TABLE_NAME, 
    REFERENCED_COLUMN_NAME
FROM 
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE 
    REFERENCED_TABLE_NAME = 'suppliers' 
    AND TABLE_NAME = 'custom_orders'
    AND COLUMN_NAME = 'supplier_id';

-- If there are constraints, we need to drop them first
-- ALTER TABLE custom_orders DROP FOREIGN KEY fk_custom_orders_supplier;

-- Update the supplier_id column to ensure it's properly defined
ALTER TABLE custom_orders MODIFY COLUMN supplier_id INT;

-- Add a foreign key constraint if it doesn't exist
-- ALTER TABLE custom_orders ADD CONSTRAINT fk_custom_orders_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id);

-- Create a view for custom orders that includes supplier information
CREATE OR REPLACE VIEW custom_order_supplier_view AS
SELECT 
    co.*,
    s.name AS supplier_name,
    s.contact_no AS supplier_contact,
    s.address AS supplier_address
FROM 
    custom_orders co
LEFT JOIN 
    suppliers s ON co.supplier_id = s.supplier_id;

-- Sample query to update existing custom orders with supplier_id
-- UPDATE custom_orders SET supplier_id = 1 WHERE order_id = 29;
-- UPDATE custom_orders SET supplier_id = 3 WHERE order_id = 30;
-- UPDATE custom_orders SET supplier_id = 5 WHERE order_id = 31;
