-- Create assay_reports table
CREATE TABLE IF NOT EXISTS assay_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    certificate_no VARCHAR(50) UNIQUE,
    report_date DATE,
    customer_name VARCHAR(100),
    weight DECIMAL(10,3), -- in grams
    gold_percentage DECIMAL(5,2),
    gold_concentration DECIMAL(5,2),
    gold_carat DECIMAL(5,2),
    sample_type VARCHAR(50), -- e.g., BRACELET, NECKLACE, etc.
    remarks TEXT,
    branch_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE SET NULL
);

-- Create metal_compositions table (to store element percentages)
CREATE TABLE IF NOT EXISTS metal_compositions (
    composition_id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT,
    element_name VARCHAR(30),
    element_symbol VARCHAR(5),
    concentration DECIMAL(5,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES assay_reports(report_id) ON DELETE CASCADE
);

-- Create jewellery_items_metadata table (to link items with assay reports)
CREATE TABLE IF NOT EXISTS jewellery_items_metadata (
    metadata_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT,
    report_id INT,
    is_homogeneous BOOLEAN DEFAULT TRUE,
    has_solder BOOLEAN DEFAULT FALSE,
    solder_quality VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES jewellery_items(item_id) ON DELETE CASCADE,
    FOREIGN KEY (report_id) REFERENCES assay_reports(report_id) ON DELETE CASCADE
);

-- Modify jewellery_items table to add assay-related columns
ALTER TABLE jewellery_items
ADD COLUMN gold_carat DECIMAL(5,2),
ADD COLUMN weight DECIMAL(10,3),
ADD COLUMN assay_certificate VARCHAR(50),
ADD COLUMN is_solid_gold BOOLEAN DEFAULT TRUE;

-- Create a view for easy retrieval of jewellery items with their assay details
CREATE OR REPLACE VIEW jewellery_assay_details AS
SELECT
    ji.item_id,
    ji.product_title,
    ji.category,
    ji.in_stock,
    ji.buying_price,
    ji.selling_price,
    ji.gold_carat,
    ji.weight,
    ji.assay_certificate,
    ji.is_solid_gold,
    ji.branch_id,
    b.branch_name,
    ar.report_id,
    ar.certificate_no,
    ar.report_date,
    ar.gold_percentage,
    ar.gold_concentration,
    ar.sample_type,
    ar.customer_name,
    jim.is_homogeneous,
    jim.has_solder,
    jim.solder_quality
FROM
    jewellery_items ji
LEFT JOIN
    branches b ON ji.branch_id = b.branch_id
LEFT JOIN
    jewellery_items_metadata jim ON ji.item_id = jim.item_id
LEFT JOIN
    assay_reports ar ON jim.report_id = ar.report_id;

-- Insert sample data
INSERT INTO assay_reports (
    certificate_no,
    report_date,
    customer_name,
    weight,
    gold_percentage,
    gold_concentration,
    gold_carat,
    sample_type,
    remarks
) VALUES (
    'T-1190',
    '2024-09-14',
    'SLANKA',
    12.780,
    91.95,
    91.93,
    22.06,
    'BRACELET',
    'Sample assay report'
);

-- Get the last inserted report_id
SET @last_report_id = LAST_INSERT_ID();

-- Insert metal composition data
INSERT INTO metal_compositions (report_id, element_name, element_symbol, concentration) VALUES
(@last_report_id, 'SILVER', 'Ag', 0.50),
(@last_report_id, 'COPPER', 'Cu', 7.55),
(@last_report_id, 'ZINC', 'Zn', 0.00),
(@last_report_id, 'NICKEL', 'Ni', 0.00),
(@last_report_id, 'PALLADIUM', 'Pd', 0.00),
(@last_report_id, 'CADMIUM', 'Cd', 0.00),
(@last_report_id, 'IRIDIUM', 'Ir', 0.00),
(@last_report_id, 'INDIUM', 'In', 0.00),
(@last_report_id, 'RUTHENIUM', 'Ru', 0.00),
(@last_report_id, 'RHODIUM', 'Rh', 0.00),
(@last_report_id, 'TUNGSTEN', 'W', 0.00),
(@last_report_id, 'TIN', 'Sn', 0.00),
(@last_report_id, 'LEAD', 'Pb', 0.00),
(@last_report_id, 'PLATINUM', 'Pt', 0.00);
