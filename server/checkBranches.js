import con from './utils/db.js';

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
    // Get all branches
    const getBranchesSql = `SELECT * FROM branches`;
    
    con.query(getBranchesSql, (err, results) => {
      if (err) {
        console.error("Error fetching branches:", err);
        process.exit(1);
      }
      
      console.log('Branches:');
      console.table(results);
      
      // Check if jewellery_items table has branch_id column
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
        console.log(`branch_id column exists in jewellery_items table: ${branchColumnExists}`);
        
        if (branchColumnExists) {
          // Get sample jewellery items with branch info
          const getItemsSql = `
            SELECT j.item_id, j.product_title, j.branch_id, b.branch_name
            FROM jewellery_items j
            LEFT JOIN branches b ON j.branch_id = b.branch_id
            LIMIT 5
          `;
          
          con.query(getItemsSql, (itemsErr, itemsResults) => {
            if (itemsErr) {
              console.error("Error fetching jewellery items with branch info:", itemsErr);
              process.exit(1);
            }
            
            console.log('Sample jewellery items with branch info:');
            console.table(itemsResults);
            
            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      });
    });
  } else {
    // Create branches table
    console.log('Creating branches table...');
    
    const createBranchesTableSql = `
      CREATE TABLE branches (
        branch_id INT PRIMARY KEY,
        branch_name VARCHAR(100) NOT NULL
      )
    `;
    
    con.query(createBranchesTableSql, (createErr) => {
      if (createErr) {
        console.error("Error creating branches table:", createErr);
        process.exit(1);
      }
      
      console.log('Branches table created successfully');
      
      // Insert sample branches
      const insertBranchesSql = `
        INSERT INTO branches (branch_id, branch_name) VALUES
        (1, 'Mahiyangana Branch'),
        (2, 'Mahaoya Branch')
      `;
      
      con.query(insertBranchesSql, (insertErr) => {
        if (insertErr) {
          console.error("Error inserting sample branches:", insertErr);
          process.exit(1);
        }
        
        console.log('Sample branches inserted successfully');
        process.exit(0);
      });
    });
  }
});
