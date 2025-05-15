-- Add username and password fields to suppliers table
ALTER TABLE suppliers 
ADD COLUMN username VARCHAR(50) UNIQUE,
ADD COLUMN password VARCHAR(255),
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Update existing suppliers with default usernames and passwords
-- This is just for testing - in production, you would set these individually
UPDATE suppliers 
SET username = CONCAT('supplier', supplier_id),
    password = '$2b$10$1234567890123456789012uQJaLBLFJLkHUFEoLHJsISlDmMqpK9S6' -- This is a bcrypt hash for 'password123'
WHERE username IS NULL;
