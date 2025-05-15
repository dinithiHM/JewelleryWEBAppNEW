-- Add branch_id column to jewellery_items table
ALTER TABLE jewellery_items ADD COLUMN branch_id INT;

-- Add foreign key constraint
ALTER TABLE jewellery_items 
ADD CONSTRAINT fk_jewellery_items_branch 
FOREIGN KEY (branch_id) REFERENCES branches(branch_id);

-- Update existing items to assign them to branches (randomly for demonstration)
-- In a real scenario, you would assign them based on actual data
UPDATE jewellery_items SET branch_id = 1 WHERE item_id % 2 = 0;
UPDATE jewellery_items SET branch_id = 2 WHERE item_id % 2 = 1;
