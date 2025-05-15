-- Add additional_materials_charges column to orders table
ALTER TABLE orders
ADD COLUMN additional_materials_charges DECIMAL(10,2) NULL,
ADD COLUMN base_estimated_price DECIMAL(10,2) NULL;
