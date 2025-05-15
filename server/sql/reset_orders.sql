-- Reset orders table
-- This script will delete all data from the orders table and related tables, and reset the auto-increment counters

-- First, disable foreign key checks to avoid constraint errors
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all data from order-related tables
-- Start with child tables first
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;

-- Reset the auto-increment counters to start from 1
ALTER TABLE order_items AUTO_INCREMENT = 1;
ALTER TABLE orders AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify the reset
SELECT * FROM orders;
SELECT * FROM order_items;
