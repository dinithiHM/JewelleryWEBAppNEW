-- SQL Script to clear all custom order and advance payment data
-- and reset auto-increment counters to start from 1

-- Disable foreign key checks to avoid constraint errors
SET FOREIGN_KEY_CHECKS = 0;

-- Clear advance_payments table
TRUNCATE TABLE advance_payments;

-- Clear custom_order_payments table
TRUNCATE TABLE custom_order_payments;

-- Clear custom_order_materials table
TRUNCATE TABLE custom_order_materials;

-- Clear custom_order_images table
TRUNCATE TABLE custom_order_images;

-- Clear custom_orders table
TRUNCATE TABLE custom_orders;

-- Reset auto-increment counters
ALTER TABLE advance_payments AUTO_INCREMENT = 1;
ALTER TABLE custom_order_payments AUTO_INCREMENT = 1;
ALTER TABLE custom_order_materials AUTO_INCREMENT = 1;
ALTER TABLE custom_order_images AUTO_INCREMENT = 1;
ALTER TABLE custom_orders AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify the reset
SELECT 'custom_orders' AS table_name, COUNT(*) AS row_count FROM custom_orders
UNION ALL
SELECT 'custom_order_payments', COUNT(*) FROM custom_order_payments
UNION ALL
SELECT 'custom_order_materials', COUNT(*) FROM custom_order_materials
UNION ALL
SELECT 'custom_order_images', COUNT(*) FROM custom_order_images
UNION ALL
SELECT 'advance_payments', COUNT(*) FROM advance_payments;

-- Check auto-increment values
SELECT 
    table_name, 
    auto_increment
FROM 
    information_schema.tables
WHERE 
    table_schema = DATABASE()
    AND table_name IN ('custom_orders', 'custom_order_payments', 'custom_order_materials', 'custom_order_images', 'advance_payments');
