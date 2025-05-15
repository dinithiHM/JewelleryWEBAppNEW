-- Reset custom orders table
-- This script will delete all data from the custom_orders table and related tables, and reset the auto-increment counters

-- First, disable foreign key checks to avoid constraint errors
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all data from custom order-related tables
-- Start with child tables first
TRUNCATE TABLE custom_order_images;
TRUNCATE TABLE custom_order_materials;
TRUNCATE TABLE custom_order_payments;
TRUNCATE TABLE custom_orders;

-- Reset the auto-increment counters to start from 1
ALTER TABLE custom_order_images AUTO_INCREMENT = 1;
ALTER TABLE custom_order_materials AUTO_INCREMENT = 1;
ALTER TABLE custom_order_payments AUTO_INCREMENT = 1;
ALTER TABLE custom_orders AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify the reset
SELECT * FROM custom_orders;
