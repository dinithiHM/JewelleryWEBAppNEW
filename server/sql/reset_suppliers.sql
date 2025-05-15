-- Reset suppliers table
-- This script will delete all data from the suppliers table and reset the auto-increment counter

-- First, disable foreign key checks to avoid constraint errors
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all data from the suppliers table
TRUNCATE TABLE suppliers;

-- Reset the auto-increment counter to start from 1
ALTER TABLE suppliers AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Insert sample data (optional)
INSERT INTO suppliers (supplier_name, contact_person, phone, email, address, city, country) VALUES
('GoldCraft Suppliers', 'John Smith', '+94771234567', 'john@goldcraft.com', '123 Main St', 'Colombo', 'Sri Lanka'),
('Diamond Wholesalers', 'Sarah Johnson', '+94772345678', 'sarah@diamondwholesalers.com', '456 Gem Road', 'Kandy', 'Sri Lanka'),
('Silver Artisans', 'David Lee', '+94773456789', 'david@silverartisans.com', '789 Craft Blvd', 'Galle', 'Sri Lanka'),
('Gem Paradise', 'Amara Fernando', '+94774567890', 'amara@gemparadise.com', '101 Jewel Lane', 'Ratnapura', 'Sri Lanka'),
('Luxury Metals', 'Raj Patel', '+94775678901', 'raj@luxurymetals.com', '202 Gold Street', 'Colombo', 'Sri Lanka');

-- Verify the reset
SELECT * FROM suppliers;
