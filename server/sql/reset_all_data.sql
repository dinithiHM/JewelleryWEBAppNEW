-- Reset all data
-- This script will delete all data from suppliers, orders, custom orders, and advance payments tables
-- and reset all auto-increment counters to start from 1

-- First, disable foreign key checks to avoid constraint errors
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all data from tables (child tables first)
-- Custom orders related tables
TRUNCATE TABLE custom_order_images;
TRUNCATE TABLE custom_order_materials;
TRUNCATE TABLE custom_order_payments;
TRUNCATE TABLE custom_orders;

-- Orders related tables
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;

-- Advance payments
TRUNCATE TABLE advance_payments;

-- Suppliers
TRUNCATE TABLE suppliers;

-- Reset all auto-increment counters to start from 1
ALTER TABLE custom_order_images AUTO_INCREMENT = 1;
ALTER TABLE custom_order_materials AUTO_INCREMENT = 1;
ALTER TABLE custom_order_payments AUTO_INCREMENT = 1;
ALTER TABLE custom_orders AUTO_INCREMENT = 1;
ALTER TABLE order_items AUTO_INCREMENT = 1;
ALTER TABLE orders AUTO_INCREMENT = 1;
ALTER TABLE advance_payments AUTO_INCREMENT = 1;
ALTER TABLE suppliers AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Insert sample suppliers data
INSERT INTO suppliers (supplier_name, contact_person, phone, email, address, city, country) VALUES
('GoldCraft Suppliers', 'John Smith', '+94771234567', 'john@goldcraft.com', '123 Main St', 'Colombo', 'Sri Lanka'),
('Diamond Wholesalers', 'Sarah Johnson', '+94772345678', 'sarah@diamondwholesalers.com', '456 Gem Road', 'Kandy', 'Sri Lanka'),
('Silver Artisans', 'David Lee', '+94773456789', 'david@silverartisans.com', '789 Craft Blvd', 'Galle', 'Sri Lanka'),
('Gem Paradise', 'Amara Fernando', '+94774567890', 'amara@gemparadise.com', '101 Jewel Lane', 'Ratnapura', 'Sri Lanka'),
('Luxury Metals', 'Raj Patel', '+94775678901', 'raj@luxurymetals.com', '202 Gold Street', 'Colombo', 'Sri Lanka');

-- Verify the reset
SELECT 'Suppliers' AS Table_Name, COUNT(*) AS Row_Count FROM suppliers
UNION ALL
SELECT 'Orders' AS Table_Name, COUNT(*) AS Row_Count FROM orders
UNION ALL
SELECT 'Order Items' AS Table_Name, COUNT(*) AS Row_Count FROM order_items
UNION ALL
SELECT 'Custom Orders' AS Table_Name, COUNT(*) AS Row_Count FROM custom_orders
UNION ALL
SELECT 'Advance Payments' AS Table_Name, COUNT(*) AS Row_Count FROM advance_payments;
