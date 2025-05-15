-- Add making charges and additional materials charges columns to sale_items table
ALTER TABLE sale_items 
ADD COLUMN making_charges DECIMAL(10, 2) DEFAULT NULL COMMENT 'Making charges for the item',
ADD COLUMN additional_materials_charges DECIMAL(10, 2) DEFAULT NULL COMMENT 'Additional materials charges for the item';

-- Create index for better performance when querying items with charges
CREATE INDEX idx_sale_items_charges ON sale_items(making_charges, additional_materials_charges);
