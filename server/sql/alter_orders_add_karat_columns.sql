-- Add selectedKarat and goldPurity columns to orders table
ALTER TABLE orders
ADD COLUMN selectedKarat VARCHAR(10) NULL,
ADD COLUMN goldPurity DECIMAL(5,4) NULL;
