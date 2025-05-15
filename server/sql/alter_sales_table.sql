-- Add user_id column to track which cashier created the sale
ALTER TABLE sales ADD COLUMN user_id INT;

-- Add branch_id column to track which branch the sale was made at
ALTER TABLE sales ADD COLUMN branch_id INT;

-- Add foreign key constraints
ALTER TABLE sales 
ADD CONSTRAINT fk_sales_user 
FOREIGN KEY (user_id) REFERENCES users(user_id);

ALTER TABLE sales 
ADD CONSTRAINT fk_sales_branch 
FOREIGN KEY (branch_id) REFERENCES branches(branch_id);

-- Create branches table if it doesn't exist
CREATE TABLE IF NOT EXISTS branches (
  branch_id INT PRIMARY KEY AUTO_INCREMENT,
  branch_name VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default branches if they don't exist
INSERT IGNORE INTO branches (branch_id, branch_name, location) 
VALUES 
(1, 'Mahiyangana Branch', 'Mahiyangana'),
(2, 'Mahaoya Branch', 'Mahaoya');
