import con from './db.js';

// Check if branch_id column exists
const checkColumnSql = `
  SELECT COUNT(*) as column_exists 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'jewellery_items' 
  AND column_name = 'branch_id'
`;

con.query(checkColumnSql, (checkErr, checkResults) => {
  if (checkErr) {
    console.error("Error checking for branch_id column:", checkErr);
    process.exit(1);
  }
  
  const branchColumnExists = checkResults[0].column_exists > 0;
  console.log(`Branch column exists: ${branchColumnExists}`);
  
  if (!branchColumnExists) {
    console.log('Adding branch_id column to jewellery_items table...');
    
    // Add branch_id column
    const addColumnSql = `ALTER TABLE jewellery_items ADD COLUMN branch_id INT`;
    
    con.query(addColumnSql, (addErr) => {
      if (addErr) {
        console.error("Error adding branch_id column:", addErr);
        process.exit(1);
      }
      
      console.log('branch_id column added successfully');
      
      // Check if branches table exists
      const checkBranchesTableSql = `
        SELECT COUNT(*) as table_exists 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'branches'
      `;
      
      con.query(checkBranchesTableSql, (branchTableErr, branchTableResults) => {
        if (branchTableErr) {
          console.error("Error checking for branches table:", branchTableErr);
          process.exit(1);
        }
        
        const branchTableExists = branchTableResults[0].table_exists > 0;
        console.log(`Branches table exists: ${branchTableExists}`);
        
        if (branchTableExists) {
          // Add foreign key constraint
          const addForeignKeySql = `
            ALTER TABLE jewellery_items 
            ADD CONSTRAINT fk_jewellery_items_branch 
            FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
          `;
          
          con.query(addForeignKeySql, (fkErr) => {
            if (fkErr) {
              console.error("Error adding foreign key constraint:", fkErr);
              // Continue without foreign key if it fails
              console.log('Continuing without foreign key constraint');
            } else {
              console.log('Foreign key constraint added successfully');
            }
            
            // Update existing items to assign them to branches
            const updateItemsSql = `
              UPDATE jewellery_items SET branch_id = CASE 
                WHEN item_id % 2 = 0 THEN 1 
                ELSE 2 
              END
            `;
            
            con.query(updateItemsSql, (updateErr) => {
              if (updateErr) {
                console.error("Error updating existing items:", updateErr);
              } else {
                console.log('Existing items updated with branch_id values');
              }
              
              console.log('All operations completed');
              process.exit(0);
            });
          });
        } else {
          console.log('Branches table does not exist, skipping foreign key constraint');
          
          // Update existing items to assign them to branches
          const updateItemsSql = `
            UPDATE jewellery_items SET branch_id = CASE 
              WHEN item_id % 2 = 0 THEN 1 
              ELSE 2 
            END
          `;
          
          con.query(updateItemsSql, (updateErr) => {
            if (updateErr) {
              console.error("Error updating existing items:", updateErr);
            } else {
              console.log('Existing items updated with branch_id values');
            }
            
            console.log('All operations completed');
            process.exit(0);
          });
        }
      });
    });
  } else {
    console.log('branch_id column already exists, no action needed');
    process.exit(0);
  }
});
