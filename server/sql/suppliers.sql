-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(50),
  country VARCHAR(50),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sample data for suppliers
INSERT INTO suppliers (supplier_name, contact_person, phone, email, address, city, country) VALUES
('GoldCraft Suppliers', 'John Smith', '+94771234567', 'john@goldcraft.com', '123 Main St', 'Colombo', 'Sri Lanka'),
('Diamond Wholesalers', 'Sarah Johnson', '+94772345678', 'sarah@diamondwholesalers.com', '456 Gem Road', 'Kandy', 'Sri Lanka'),
('Silver Artisans', 'David Lee', '+94773456789', 'david@silverartisans.com', '789 Craft Blvd', 'Galle', 'Sri Lanka'),
('Gem Paradise', 'Amara Fernando', '+94774567890', 'amara@gemparadise.com', '101 Jewel Lane', 'Ratnapura', 'Sri Lanka'),
('Luxury Metals', 'Raj Patel', '+94775678901', 'raj@luxurymetals.com', '202 Gold Street', 'Colombo', 'Sri Lanka');
