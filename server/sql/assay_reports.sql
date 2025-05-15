-- Create assay_reports table
CREATE TABLE IF NOT EXISTS assay_reports (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  report_reference VARCHAR(20) NOT NULL UNIQUE, -- Format: ASSAY-YYYY-XXXX
  item_id INT,
  customer_name VARCHAR(100),
  weight DECIMAL(10, 3) NOT NULL, -- Weight in grams
  gold_percentage DECIMAL(5, 2) NOT NULL, -- Gold percentage (e.g., 91.95%)
  gold_concentration DECIMAL(5, 2) NOT NULL, -- Gold concentration (e.g., 91.93%)
  carat_value DECIMAL(5, 2) NOT NULL, -- Carat value (e.g., 22.06)
  sample_type VARCHAR(50), -- e.g., BRACELET, NECKLACE, etc.
  certificate_no VARCHAR(50),
  report_date DATE,
  
  -- Metal composition percentages
  silver_percentage DECIMAL(5, 2) DEFAULT 0,
  copper_percentage DECIMAL(5, 2) DEFAULT 0,
  zinc_percentage DECIMAL(5, 2) DEFAULT 0,
  nickel_percentage DECIMAL(5, 2) DEFAULT 0,
  palladium_percentage DECIMAL(5, 2) DEFAULT 0,
  cadmium_percentage DECIMAL(5, 2) DEFAULT 0,
  iridium_percentage DECIMAL(5, 2) DEFAULT 0,
  indium_percentage DECIMAL(5, 2) DEFAULT 0,
  ruthenium_percentage DECIMAL(5, 2) DEFAULT 0,
  rhodium_percentage DECIMAL(5, 2) DEFAULT 0,
  tungsten_percentage DECIMAL(5, 2) DEFAULT 0,
  tin_percentage DECIMAL(5, 2) DEFAULT 0,
  lead_percentage DECIMAL(5, 2) DEFAULT 0,
  platinum_percentage DECIMAL(5, 2) DEFAULT 0,
  
  image_path VARCHAR(255), -- Path to the image of the jewellery item
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (item_id) REFERENCES jewellery_items(item_id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX idx_item_id ON assay_reports(item_id);
CREATE INDEX idx_report_date ON assay_reports(report_date);

-- Sample data
INSERT INTO assay_reports (
  report_reference, 
  item_id, 
  customer_name, 
  weight, 
  gold_percentage, 
  gold_concentration, 
  carat_value, 
  sample_type, 
  certificate_no, 
  report_date,
  silver_percentage,
  copper_percentage
) VALUES 
('ASSAY-2024-0001', 1, 'SLANKA', 12.780, 91.95, 91.93, 22.06, 'BRACELET', 'T-1190', '2024-09-14', 0.50, 7.55);
