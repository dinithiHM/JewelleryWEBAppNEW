-- Reset custom orders and advance payments
-- This script will delete all data from the custom_orders, custom_order_payments, 
-- custom_order_materials, custom_order_images, and advance_payments tables
-- and reset their auto-increment counters

-- First, disable foreign key checks to avoid constraint errors
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all data from the advance_payments table
TRUNCATE TABLE advance_payments;

-- Delete all data from the custom_order_images table
TRUNCATE TABLE custom_order_images;

-- Delete all data from the custom_order_materials table
TRUNCATE TABLE custom_order_materials;

-- Delete all data from the custom_order_payments table
TRUNCATE TABLE custom_order_payments;

-- Delete all data from the custom_orders table
TRUNCATE TABLE custom_orders;

-- Reset the auto-increment counters to start from 1
ALTER TABLE advance_payments AUTO_INCREMENT = 1;
ALTER TABLE custom_order_images AUTO_INCREMENT = 1;
ALTER TABLE custom_order_materials AUTO_INCREMENT = 1;
ALTER TABLE custom_order_payments AUTO_INCREMENT = 1;
ALTER TABLE custom_orders AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify the reset
SELECT 'advance_payments count' as table_name, COUNT(*) as row_count FROM advance_payments
UNION ALL
SELECT 'custom_order_images count', COUNT(*) FROM custom_order_images
UNION ALL
SELECT 'custom_order_materials count', COUNT(*) FROM custom_order_materials
UNION ALL
SELECT 'custom_order_payments count', COUNT(*) FROM custom_order_payments
UNION ALL
SELECT 'custom_orders count', COUNT(*) FROM custom_orders;
