-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert some sample categories
INSERT INTO categories (category_name, description) VALUES
('Rings', 'All types of rings including engagement, wedding, and fashion rings'),
('Necklaces', 'Pendants, chains, and statement necklaces'),
('Earrings', 'Studs, hoops, and drop earrings'),
('Bracelets', 'Bangles, charm bracelets, and tennis bracelets'),
('Wedding Sets', 'Complete wedding jewelry sets'),
('Anklets', 'Ankle bracelets and chains'),
('Nose Pins', 'Traditional and modern nose pins'),
('Mangalsutra', 'Traditional Indian wedding necklaces'),
('Bangles', 'Traditional and modern bangles'),
('Pendants', 'Standalone pendants without chains');

-- Create suppliers table if it doesn't exist
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(50),
  state VARCHAR(50),
  country VARCHAR(50),
  postal_code VARCHAR(20),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert some sample suppliers
INSERT INTO suppliers (supplier_name, contact_person, phone, email, city, country) VALUES
('GemSource International', 'Rajiv Mehta', '+94 77 123 4567', 'rajiv@gemsource.com', 'Colombo', 'Sri Lanka'),
('Diamond Traders Ltd', 'Amal Fernando', '+94 71 234 5678', 'amal@diamondtraders.lk', 'Kandy', 'Sri Lanka'),
('Golden Creations', 'Nimal Perera', '+94 76 345 6789', 'nimal@goldencreations.lk', 'Galle', 'Sri Lanka'),
('Silver Crafts', 'Kumari Silva', '+94 75 456 7890', 'kumari@silvercrafts.lk', 'Negombo', 'Sri Lanka'),
('Gem Palace', 'Sunil Gunawardena', '+94 78 567 8901', 'sunil@gempalace.lk', 'Ratnapura', 'Sri Lanka');

-- Create category_supplier relationship table
CREATE TABLE IF NOT EXISTS category_supplier (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  supplier_id INT NOT NULL,
  is_preferred BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(category_id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
  UNIQUE KEY (category_id, supplier_id)
);

-- Create some sample relationships
INSERT INTO category_supplier (category_id, supplier_id, is_preferred) VALUES
(1, 1, TRUE),  -- GemSource is preferred for Rings
(1, 2, FALSE), -- Diamond Traders also supplies Rings
(2, 3, TRUE),  -- Golden Creations is preferred for Necklaces
(3, 4, TRUE),  -- Silver Crafts is preferred for Earrings
(4, 5, TRUE),  -- Gem Palace is preferred for Bracelets
(5, 1, TRUE),  -- GemSource is preferred for Wedding Sets
(6, 2, TRUE),  -- Diamond Traders is preferred for Anklets
(7, 3, TRUE),  -- Golden Creations is preferred for Nose Pins
(8, 4, TRUE),  -- Silver Crafts is preferred for Mangalsutra
(9, 5, TRUE),  -- Gem Palace is preferred for Bangles
(10, 1, TRUE); -- GemSource is preferred for Pendants
