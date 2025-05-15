-- Reset advance payments table
-- This script will delete all data from the advance_payments table and reset the auto-increment counter

-- First, disable foreign key checks to avoid constraint errors
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all data from the advance_payments table
TRUNCATE TABLE advance_payments;

-- Reset the auto-increment counter to start from 1
ALTER TABLE advance_payments AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify the reset
SELECT * FROM advance_payments;
