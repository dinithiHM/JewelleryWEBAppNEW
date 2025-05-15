-- Add gold-related columns if they don't exist
ALTER TABLE jewellery_items 
ADD COLUMN IF NOT EXISTS is_solid_gold BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gold_carat DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS weight DECIMAL(10,3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS assay_certificate VARCHAR(50) DEFAULT NULL;

-- Insert a test gold item
INSERT INTO jewellery_items (
  product_title, 
  category, 
  in_stock, 
  buying_price, 
  selling_price, 
  is_solid_gold, 
  gold_carat, 
  weight,
  assay_certificate
) VALUES (
  'Gold Necklace 22KT', 
  'Necklace', 
  5, 
  120000.00, 
  150000.00, 
  1, 
  22, 
  15.5,
  'CERT-001'
);

-- Insert another gold item with different karat
INSERT INTO jewellery_items (
  product_title, 
  category, 
  in_stock, 
  buying_price, 
  selling_price, 
  is_solid_gold, 
  gold_carat, 
  weight
) VALUES (
  'Gold Ring 18KT', 
  'Rings', 
  10, 
  45000.00, 
  55000.00, 
  1, 
  18, 
  5.2
);

-- Insert a 24KT gold item
INSERT INTO jewellery_items (
  product_title, 
  category, 
  in_stock, 
  buying_price, 
  selling_price, 
  is_solid_gold, 
  gold_carat, 
  weight,
  assay_certificate
) VALUES (
  'Pure Gold Bangle 24KT', 
  'Bangles', 
  3, 
  180000.00, 
  200000.00, 
  1, 
  24, 
  12.8,
  'CERT-002'
);
